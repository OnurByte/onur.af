---
name: portfolio-improvement-loop
description: Use when the owner requests a source-aware critic/engineer loop, adversarial review, or open-ended improvement of this portfolio across UX, accessibility, security, performance, SEO, architecture, or content integrity.
---

# Portfolio improvement loop

Challenge the project's assumptions with evidence. Improve confirmed problems;
retain deliberate decisions when criticism is unsupported. This skill defines
an agent workflow, not an executable scheduler or a new application feature.

## Start and scope

1. Read root `AGENTS.md`, `brand.md`, `package.json`, and the relevant design,
   implementation, and acceptance documents. Inspect Git status and the actual
   source before choosing a topic. Historical acceptance notes are context, not
   proof of the current checkout.
2. State the requested scope and budget. Default: at most **two rounds**,
   **three prioritized hypotheses per round**, and **one implemented hypothesis
   at a time**. A request for one round means one round. Review-only requests
   produce evidence and recommendations without application edits.
3. Record the starting revision and existing changes. Isolate application edits
   on a `codex/` branch/worktree when appropriate. Never reset, stash, or overwrite
   the owner's changes to obtain a clean baseline. A worktree from HEAD excludes
   uncommitted changes: explicitly identify which snapshot is under review.
4. Create a run record at `docs/audits/improvement-<date>-<unique-suffix>.md`.
   Use the record format below and update it at each handoff. Read earlier run
   records for duplicates; reopen a rejected finding only with new evidence.

## Roles and handoffs

Use separate agents when delegation is available. The coordinator gives each
agent the scope, source snapshot, relevant project documents, and record path.
Role access below is an instruction contract, not filesystem sandboxing. Shared
working directories require sequential handoffs; only Engineer edits product
files. Critic and Verifier return their findings to the coordinator for recording.
Do not create separate user-owned chats for these subtasks.

| Role     | Access and responsibility                                                                                                                                        | Handoff                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Critic   | Read source, tests, decisions, and local site; use non-mutating checks. Explore important weaknesses and alternative explanations without a prescribed bug list. | Ranked, falsifiable hypotheses with evidence and a proposed disproof experiment. |
| Engineer | Independently inspect each claim; accept, reject, or mark uncertain. Edit only confirmed, in-scope issues.                                                       | Decision, reproduction, minimal patch, tests, remaining risks.                   |
| Verifier | Read final diff and independently execute checks; do not edit the fix or weaken tests.                                                                           | Per-finding verdict tied to the exact verified snapshot and raw check results.   |

If separate agents are unavailable, perform the phases sequentially and disclose
that verification was a self-review, not an independent agent review. Never label
Engineer's own assertion as independent verification.

## Critic: generate useful hypotheses

Choose angles based on the actual project, rather than covering every category
mechanically. Trace user behavior through UI, server code, data, and tests.
Source access is intentional; the critic should understand implementation
details and use them to construct stronger counterexamples.

Every hypothesis includes:

- Stable ID, affected paths/lines or route, category, impact, and confidence.
- Observed facts separated from inference; expected versus actual behavior.
- The user outcome at stake and the relevant project invariant.
- A reproduction or measurement, plus evidence that would disprove the claim.
- Existing coverage and the smallest experiment needed to resolve uncertainty.

No minimum finding quota. Report no supported hypotheses when that is the result.
An aesthetic preference or speculative optimization is a proposal, not a defect.

## Engineer: investigate before changing

Evaluate each hypothesis independently of the critic's confidence:

- **Confirmed:** reproduce the problem or establish a specific code-level
  counterexample. Make the smallest coherent fix and preserve the contract.
- **Rejected:** record contradicting evidence or the deliberate design decision.
- **Uncertain:** record the missing evidence and next experiment; do not patch
  speculation into the application.

For a behavioral defect, establish a meaningful failing regression check before
the fix and show it passes afterward. For visual changes, capture comparable
before/after observations at the same viewport, theme, and interaction state.
Do not alter tests solely to accommodate a broken result.

Change brand or product direction only when the owner has authorized that scope.
Otherwise record that proposal separately and continue with eligible fixes.
Read-only investigation and authorized routine fixes do not require repeated
permission questions.

## Verifier: challenge the fix

Reproduce the original claim against the baseline and repeat the experiment on
the patched snapshot. Inspect the diff for accidental behavior changes and test
the normal user path as well as the counterexample. Run checks yourself rather
than relying on Engineer's pasted success message.

Discover current commands in `package.json`. Relevant existing commands include:

- Focused `bun test tests/<file>.test.ts`, then `bun run check`,
  `bun run build`, and `bun test` for application changes.
- `bun run test:browser -- <file>.pw.ts` for affected browser behavior; inspect
  `playwright.config.ts` and the fixture server first.
- `bun run verify` for the aggregate dead-code, formatting, type, build, and
  unit-test gate when applicable. Avoid repeating its constituent checks without
  a new change or failure.
- `bun run test:lighthouse` when a measured performance claim needs it; inspect
  its configuration before execution. Do not use a score as the sole UX verdict.

For UI changes, check affected routes on mobile and desktop, both system themes,
keyboard navigation, and reduced-motion behavior when relevant. Missing browser,
network, key, wallet, or database access means that check is **blocked**, not passed.
Distinguish pre-existing baseline failures from failures caused by the patch.

Verdicts: **verified**, **failed**, or **blocked**. Only verified changes count
as resolved. A failed fix returns to Engineer within the round's remaining
budget; allow at most one repair attempt per finding by default. A blocked fix
remains an explicitly unverified candidate. Subsequent edits invalidate affected
verification and require a new check.

## Portfolio-specific invariants

- Preserve Onur's personal voice, English UI, monochrome system theme, shared
  StyleX conventions, and intentional interaction design. Use `brand.md`,
  `docs/design.md`, and `docs/stylex.md` as the source of these decisions.
- For log signatures, identity proofs, archives, RSS, timestamps, or publication
  state, read `docs/log-and-proofs.md`, `docs/integrated-publication.md`, and the
  relevant focused document. Trace exactly which bytes and claims are verified.
  Do not regenerate signatures or publication artifacts just to hide a failure.
- For donations and the gateway, read `docs/donations.md` and
  `docs/acceptance.md`. Keep wallet allocation and payment experiments on local
  fixtures; simulated confirmation does not prove actual Monero settlement.
- Preserve privacy and honest claims. Do not add tracking, external dependencies,
  or stronger security assurances merely to improve a metric.

## Re-evaluate and stop

After verification, Critic reviews the patch and results for bypasses, regressions,
and disproved assumptions. New claims need fresh evidence and count toward the
budget. Stop on the requested budget, no actionable evidence, unchanged duplicate
claims, the repair limit, or a dependency that prevents meaningful progress.
The repair limit stops work on that finding. A blocked finding also remains open;
continue with independent eligible findings while budget remains. End the run
when no eligible work can proceed.
Never interpret this workflow as permission to run indefinitely or schedule work.

Finish with resolved, rejected, uncertain, and unverified findings; changed files;
checks actually run and their results; and remaining risks or owner decisions.
Leave the patch reviewable. Commit, publish, deploy, or merge only within the
owner's authorization. Do not automatically revert shared work after a failed check.

## Run record

Record scope, budget, baseline revision and dirty files, agent roles, and target
snapshot first. For each finding use these fields:

```text
ID / round / category / impact / confidence:
Claim and user impact:
Observed evidence / inference / disproof experiment:
Affected paths or route / relevant invariant:
Engineer decision: confirmed | rejected | uncertain
Decision evidence / baseline reproduction:
Patch and regression check:
Verifier snapshot / commands / exit codes / observed results:
Verdict: verified | failed | blocked | not-applicable
Critic re-evaluation / remaining uncertainty:
```

`not-applicable` applies to rejected/uncertain claims without a patch. Log command
failures and blocked checks explicitly, with concise sanitized excerpts. End the
record with consumed budget, stop reason, and unresolved items.

Example hypothesis (illustrative, not a discovered bug): a log verification badge
may imply that displayed HTML is signed. Trace the signed payload and renderer,
then mutate the claimed signed input in a local fixture. If documentation and UI
already accurately describe the verified payload, reject the claim; otherwise
fix the proven mismatch and independently rerun the original experiment.
