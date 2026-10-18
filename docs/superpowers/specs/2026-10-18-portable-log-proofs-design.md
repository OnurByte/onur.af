# Portable Log proofs

Implement the approved in-chat design of 18 October 2026. The owner remains the only authority; readers provide their own trusted fingerprint. Preserve every existing signed Markdown, publication edition, signature and receipt byte. No private key is accessed during development, no production proofs fabricated, and no external publication is performed.

New versioned canonical proof statements bind a stable log ID, revision, exact Markdown SHA-256, detached Markdown signature SHA-256, primary signer fingerprint, and every referenced original local media path, length and SHA-256. Freeze original assets by digest. Explicitly list remote images outside the byte-integrity scope. Sign the statement and timestamp its exact detached signature bytes, excluding the receipt. Parse only canonical schema-validated representations; reject unknown fields, invalid paths, oversized/duplicate objects and mismatched subjects.

Reader verification reports integrity, signature validity, trusted key continuity, timestamp binding/confirmation and checkpoint continuity independently. Bundle data does not self-authorize keys. Historical certificates and monotonic dual-signed primary-key transitions preserve planned continuity. Loss/compromise does not silently transfer trust. Exact expiry and revocation policy must remain visible, not bypassed by attacker-supplied dates.

Move proof pages to /log/{id}/verified with ?v=N, preserve old links with redirects, and update route parsing/SEO/metadata/tests. Offer downloadable portable packages and independent local verification; Bitcoin verification is an explicit optional operation. Include readable revisions and media, certificates, transitions, publication chain and receipts. Bind saved checkpoints to the publisher trust root; update local checkpoints only after successful verification.

Prepare publication in isolated staging with exclusive locking, verify before activation, and recover or reject interrupted transactions. Do not mutate live proof stores on preparatory failure. Preserve user changes and existing pending OTS receipts.

History differences and machine-readable identity/proof discovery are useful final integrations. Match brand.md: restrained monochrome existing styles and English UI. Tests must cover tampering, swapped subject/key/media/signature, malformed transitions and paths, rollback, pending OTS, and interrupted publication. Run type checks, full unit suite, build and relevant browser tests; report any pre-existing blockers accurately.
