// Independent-process monitor adapter. Cryptographic log checks and resumption
// use sigsum-go, not application code. Quorum proofs remain a separate check.
package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"sigsum.org/sigsum-go/pkg/crypto"
	"sigsum.org/sigsum-go/pkg/key"
	"sigsum.org/sigsum-go/pkg/monitor"
	"sigsum.org/sigsum-go/pkg/policy"
	"sigsum.org/sigsum-go/pkg/types"
)

type savedLog struct {
	Progress   monitor.MonitorState `json:"progress"`
	SignedHead types.SignedTreeHead `json:"signedHead"`
	CheckedAt  string               `json:"checkedAt"`
}
type savedState struct {
	Format        int                 `json:"format"`
	PolicyHash    string              `json:"policyHash"`
	SubmitterHash string              `json:"submitterHash"`
	Logs          map[string]savedLog `json:"logs"`
}

func hashHex(h crypto.Hash) string { return hex.EncodeToString(h[:]) }
func readState(path, policyHash, submitterHash string) (savedState, error) {
	empty := savedState{Format: 1, PolicyHash: policyHash, SubmitterHash: submitterHash, Logs: map[string]savedLog{}}
	bytes, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return empty, nil
	}
	if err != nil {
		return empty, err
	}
	var state savedState
	if err = json.Unmarshal(bytes, &state); err != nil {
		return empty, err
	}
	if state.Format != 1 || state.PolicyHash != policyHash || state.SubmitterHash != submitterHash || state.Logs == nil {
		return empty, fmt.Errorf("checkpoint policy or submitter changed; use separate state and rescan")
	}
	for _, log := range state.Logs {
		if log.Progress.NextLeafIndex > log.Progress.TreeHead.Size {
			return empty, fmt.Errorf("checkpoint cursor exceeds tree size")
		}
	}
	return state, nil
}
func saveState(path string, state savedState) error {
	bytes, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".sigsum-state-")
	if err != nil {
		return err
	}
	name := f.Name()
	defer os.Remove(name)
	if err = f.Chmod(0600); err == nil {
		_, err = f.Write(append(bytes, '\n'))
	}
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	if err = os.Rename(name, path); err != nil {
		return err
	}
	dir, err := os.Open(filepath.Dir(path))
	if err != nil {
		return err
	}
	defer dir.Close()
	return dir.Sync()
}

type callbacks struct {
	mu           sync.Mutex
	path, events string
	expected     map[string]bool
	state        savedState
}

func (c *callbacks) event(value any) {
	bytes, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	f, err := os.OpenFile(c.events, os.O_WRONLY|os.O_APPEND|os.O_CREATE, 0600)
	if err != nil {
		panic(err)
	}
	_, err = f.Write(append(bytes, '\n'))
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err != nil {
		panic(err)
	}
	if closeErr != nil {
		panic(closeErr)
	}
	fmt.Println(string(bytes))
}
func (c *callbacks) persist() {
	if err := saveState(c.path, c.state); err != nil {
		panic(err)
	}
}
func (c *callbacks) NewTreeHead(logKeyHash crypto.Hash, head types.SignedTreeHead) {
	c.mu.Lock()
	defer c.mu.Unlock()
	id := hashHex(logKeyHash)
	entry := c.state.Logs[id]
	entry.Progress.TreeHead = head.TreeHead
	entry.SignedHead = head
	c.state.Logs[id] = entry
	c.persist()
}
func (c *callbacks) NewLeaves(logKeyHash crypto.Hash, next uint64, indices []uint64, leaves []types.Leaf) {
	c.mu.Lock()
	defer c.mu.Unlock()
	id := hashHex(logKeyHash)
	// Events reach durable storage before the cursor. Crash replay may duplicate
	// an event, but cannot silently skip an unexpected key use.
	for i, leaf := range leaves {
		checksum := hashHex(leaf.Checksum)
		status := "expected-leaf"
		if !c.expected[checksum] {
			status = "unexpected-leaf"
		}
		c.event(map[string]any{"type": status, "log": id, "index": indices[i], "checksum": checksum, "submitter": hashHex(leaf.KeyHash), "checkedAt": time.Now().UTC().Format(time.RFC3339), "witnessQuorumVerified": false})
	}
	entry := c.state.Logs[id]
	entry.Progress.NextLeafIndex = next
	entry.CheckedAt = time.Now().UTC().Format(time.RFC3339)
	c.state.Logs[id] = entry
	c.persist()
}
func (c *callbacks) Alert(logKeyHash crypto.Hash, err error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.event(map[string]any{"type": "monitor-alert", "log": hashHex(logKeyHash), "error": fmt.Sprint(err), "checkedAt": time.Now().UTC().Format(time.RFC3339)})
}
func run() error {
	policyPath := flag.String("policy", "", "exact pinned policy file")
	policyHash := flag.String("policy-sha256", "", "independently pinned policy SHA-256")
	keyPath := flag.String("submitter", "", "authorized OpenSSH submitter public key")
	expectedPath := flag.String("expected", "", "JSON {format:1, expectedChecksums:[...]}")
	statePath := flag.String("state", "", "persistent checkpoint path")
	eventsPath := flag.String("events", "", "durable JSONL alerts; forward with independent supervisor")
	interval := flag.Duration("interval", time.Minute, "query interval")
	flag.Parse()
	if flag.NArg() != 0 || *policyPath == "" || *policyHash == "" || *keyPath == "" || *expectedPath == "" || *statePath == "" || *eventsPath == "" || *interval < time.Second {
		return fmt.Errorf("required: -policy -policy-sha256 -submitter -expected -state -events; interval >=1s")
	}
	policyBytes, err := os.ReadFile(*policyPath)
	if err != nil {
		return err
	}
	if hashHex(crypto.HashBytes(policyBytes)) != *policyHash {
		return fmt.Errorf("policy pin mismatch")
	}
	p, err := policy.ReadPolicyFile(*policyPath)
	if err != nil {
		return err
	}
	if len(p.GetLogsWithUrl()) == 0 {
		return fmt.Errorf("policy has no log URLs")
	}
	pub, err := key.ReadPublicKeyFile(*keyPath)
	if err != nil {
		return err
	}
	submitHash := crypto.HashBytes(pub[:])
	bytes, err := os.ReadFile(*expectedPath)
	if err != nil {
		return err
	}
	var expected struct {
		Format    int      `json:"format"`
		Checksums []string `json:"expectedChecksums"`
	}
	if err = json.Unmarshal(bytes, &expected); err != nil {
		return err
	}
	if expected.Format != 1 {
		return fmt.Errorf("unsupported expected checksum format")
	}
	checksums := map[string]bool{}
	for _, checksum := range expected.Checksums {
		if _, err := crypto.HashFromHex(checksum); err != nil {
			return err
		}
		checksums[checksum] = true
	}
	lock, err := os.OpenFile(*statePath+".lock", os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if err = syscall.Flock(int(lock.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		return fmt.Errorf("monitor state already locked: %w", err)
	}
	defer syscall.Flock(int(lock.Fd()), syscall.LOCK_UN)
	state, err := readState(*statePath, *policyHash, hashHex(submitHash))
	if err != nil {
		return err
	}
	logs := map[crypto.Hash]crypto.PublicKey{}
	for _, entity := range p.GetLogsWithUrl() {
		logs[crypto.HashBytes(entity.PublicKey[:])] = entity.PublicKey
	}
	initial := map[crypto.Hash]monitor.MonitorState{}
	for name, entry := range state.Logs {
		id, err := crypto.HashFromHex(name)
		if err != nil {
			return err
		}
		logKey, ok := logs[id]
		if !ok {
			return fmt.Errorf("checkpoint includes unknown log")
		}
		if entry.Progress.TreeHead.Size > 0 && (!entry.SignedHead.Verify(&logKey) || entry.SignedHead.TreeHead != entry.Progress.TreeHead) {
			return fmt.Errorf("checkpoint log signature invalid")
		}
		initial[id] = entry.Progress
	}
	cb := &callbacks{path: *statePath, events: *eventsPath, expected: checksums, state: state}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	fmt.Fprintln(os.Stderr, "Persistent Sigsum monitor: inclusion/consistency/submitter signatures checked; witness quorum and operator independence are NOT asserted. Forward JSONL alerts independently and supervise process liveness.")
	<-monitor.StartMonitoring(ctx, p, &monitor.Config{QueryInterval: *interval, SubmitKeys: map[crypto.Hash]crypto.PublicKey{submitHash: pub}, Callbacks: cb}, initial)
	return nil
}
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
