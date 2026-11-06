package main

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"os"
	"os/exec"
	"path/filepath"
	"sigsum.org/sigsum-go/pkg/crypto"
	"sigsum.org/sigsum-go/pkg/policy"
	"sigsum.org/sigsum-go/pkg/proof"
	"sigsum.org/sigsum-go/pkg/types"
	"strings"
	"testing"
)

// Entirely local keys, tree and witness. These prove protocol verification,
// never operation of a production log or independence of a witness.
func TestOfflineProofRejectsTamperWrongPolicyAndMissingWitness(t *testing.T) {
	submitPub, submit, err := crypto.NewKeyPair()
	if err != nil {
		t.Fatal(err)
	}
	logPub, logSigner, err := crypto.NewKeyPair()
	if err != nil {
		t.Fatal(err)
	}
	witnessPub, witness, err := crypto.NewKeyPair()
	if err != nil {
		t.Fatal(err)
	}
	message := crypto.HashBytes([]byte("local manifest-derived statement"))
	checksum := crypto.HashBytes(message[:])
	signature, err := types.SignLeafChecksum(submit, &checksum)
	if err != nil {
		t.Fatal(err)
	}
	leaf := types.Leaf{Checksum: checksum, Signature: signature, KeyHash: crypto.HashBytes(submitPub[:])}
	th := types.TreeHead{Size: 1, RootHash: leaf.ToHash()}
	signed, err := th.Sign(logSigner)
	if err != nil {
		t.Fatal(err)
	}
	cosignature, err := th.Cosign(witness, types.SigsumCheckpointOrigin(&logPub), 1)
	if err != nil {
		t.Fatal(err)
	}
	witnessHash := crypto.HashBytes(witnessPub[:])
	p, err := policy.ParseConfig(strings.NewReader("log " + hashHex(crypto.Hash(logPub)) + "\nwitness test " + hashHex(crypto.Hash(witnessPub)) + "\nquorum test\n"))
	if err != nil {
		t.Fatal(err)
	}
	sp := proof.SigsumProof{LogKeyHash: crypto.HashBytes(logPub[:]), Leaf: proof.NewShortLeaf(&leaf), TreeHead: types.CosignedTreeHead{SignedTreeHead: signed, Cosignatures: map[crypto.Hash]types.Cosignature{witnessHash: cosignature}}}
	keys := map[crypto.Hash]crypto.PublicKey{leaf.KeyHash: submitPub}
	if err = sp.Verify(&message, keys, p); err != nil {
		t.Fatal(err)
	}
	// When requested, exercise the actual external offline verifier too.
	if executable := os.Getenv("SIGSUM_VERIFY"); executable != "" {
		dir := t.TempDir()
		var proofBytes bytes.Buffer
		if err := sp.ToASCII(&proofBytes); err != nil {
			t.Fatal(err)
		}
		policyBytes := "log " + hashHex(crypto.Hash(logPub)) + "\nwitness test " + hashHex(crypto.Hash(witnessPub)) + "\nquorum test\n"
		var blob bytes.Buffer
		for _, part := range [][]byte{[]byte("ssh-ed25519"), submitPub[:]} {
			if err := binary.Write(&blob, binary.BigEndian, uint32(len(part))); err != nil {
				t.Fatal(err)
			}
			blob.Write(part)
		}
		pubBytes := "ssh-ed25519 " + base64.StdEncoding.EncodeToString(blob.Bytes()) + "\n"
		for name, data := range map[string][]byte{"proof": proofBytes.Bytes(), "policy": []byte(policyBytes), "pub": []byte(pubBytes)} {
			if err := os.WriteFile(filepath.Join(dir, name), data, 0600); err != nil {
				t.Fatal(err)
			}
		}
		cmd := exec.Command(executable, "--raw-hash", "-k", filepath.Join(dir, "pub"), "-p", filepath.Join(dir, "policy"), filepath.Join(dir, "proof"))
		cmd.Stdin = bytes.NewReader(message[:])
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("official verifier: %v %s", err, out)
		}
	}
	wrong := crypto.HashBytes([]byte("another publication"))
	if sp.Verify(&wrong, keys, p) == nil {
		t.Fatal("wrong message accepted")
	}
	delete(sp.TreeHead.Cosignatures, witnessHash)
	if sp.Verify(&message, keys, p) == nil {
		t.Fatal("missing witness accepted")
	}
	sp.TreeHead.Cosignatures[witnessHash] = cosignature
	badPub, _, err := crypto.NewKeyPair()
	if err != nil {
		t.Fatal(err)
	}
	wrongPolicy, err := policy.ParseConfig(strings.NewReader("log " + hashHex(crypto.Hash(badPub)) + "\nquorum none\n"))
	if err != nil {
		t.Fatal(err)
	}
	if sp.Verify(&message, keys, wrongPolicy) == nil {
		t.Fatal("wrong policy accepted")
	}
	sp.TreeHead.RootHash[0] ^= 1
	if sp.Verify(&message, keys, p) == nil {
		t.Fatal("changed tree accepted")
	}
}
