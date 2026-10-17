# Reader-pinned key history

`public/pgp.asc` is the site identity's pinned root certificate. The configured `src/content/key-history.json` is intentionally empty today, so the root remains the only authorized signing key. A key shown in a bundle or certificate list has no authority by itself.

A transition is domain-separated as a Log key transition and names the previous and next primary fingerprints, a contiguous history sequence and the publication sequence where the next certificate becomes authorized. Both the previous key and the next key sign the same canonical JSON payload. Each transition links to the prior transition digest. The reader starts validation from a separately trusted copy of the root certificate; dates supplied by a transition are not used to make revocation or expiry decisions.

To prepare a transition, export the next public certificate and run:

```sh
bun scripts/key-history.ts prepare next-key.asc 5
```

The command creates `key-transition-payload.json`. Have both key owners sign those exact bytes as binary detached signatures using their local GPG keyrings, then add the payload and both signatures to `src/content/key-history.json`. The preparation and verification commands do not access private keys:

```sh
bun scripts/key-history.ts verify candidate-history.json
bun run key-history:verify
```

The first transition is authorized by the pinned root as the old key. Later transitions must be signed by the certificate authorized by the preceding transition and by the new certificate. Publication manifests are checked against the certificate authorized at their own sequence. Versioned RSS authorizations and identity statements include the sequence and signer inside signed bytes. Legacy RSS and identity statements use the pinned root explicitly; their unsigned dates never select a newer key. Other artifacts need an independently established publication sequence in `KeyTrust`. Legacy string-key APIs remain available for fixtures and callers that already trust the supplied certificate.
