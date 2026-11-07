package main

import (
	"os"
	"path/filepath"
	"sigsum.org/sigsum-go/pkg/crypto"
	"sigsum.org/sigsum-go/pkg/monitor"
	"sigsum.org/sigsum-go/pkg/types"
	"testing"
)

func TestPersistProgressAndUnexpectedLeaf(t *testing.T) {
	dir := t.TempDir()
	c := &callbacks{path: filepath.Join(dir, "state.json"), events: filepath.Join(dir, "events.jsonl"), expected: map[string]bool{}, state: savedState{Format: 1, PolicyHash: "p", SubmitterHash: "s", Logs: map[string]savedLog{}}}
	h := crypto.HashBytes([]byte("log"))
	th := types.SignedTreeHead{TreeHead: types.TreeHead{Size: 2, RootHash: crypto.HashBytes([]byte("tree"))}}
	c.NewTreeHead(h, th)
	leaf := types.Leaf{Checksum: crypto.HashBytes([]byte("unexpected"))}
	c.NewLeaves(h, 2, []uint64{1}, []types.Leaf{leaf})
	data, err := os.ReadFile(c.events)
	if err != nil || len(data) == 0 {
		t.Fatal("missing durable alert", err)
	}
	state, err := readState(c.path, "p", "s")
	if err != nil {
		t.Fatal(err)
	}
	if state.Logs[hashHex(h)].Progress.NextLeafIndex != 2 {
		t.Fatal("lost cursor")
	}
	if _, err = readState(c.path, "different", "s"); err == nil {
		t.Fatal("policy substitution accepted")
	}
	if _, err = readState(c.path, "p", "different"); err == nil {
		t.Fatal("key substitution accepted")
	}
}
func TestImpossibleCursorRejected(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "state.json")
	state := savedState{Format: 1, PolicyHash: "p", SubmitterHash: "s", Logs: map[string]savedLog{"log": {Progress: monitor.MonitorState{TreeHead: types.TreeHead{Size: 1}, NextLeafIndex: 2}}}}
	if err := saveState(path, state); err != nil {
		t.Fatal(err)
	}
	if _, err := readState(path, "p", "s"); err == nil {
		t.Fatal("impossible cursor accepted")
	}
}
