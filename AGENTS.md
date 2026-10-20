# Portfolio agent instructions

Read `brand.md` before changing UI or copy. Follow `docs/design.md` and
`docs/stylex.md` for implementation. The visitor-facing language is English;
communicate with the owner in their preferred language.

## Adversarial improvement workflow

When the owner asks for an agent loop, critic/engineer review, or open-ended
portfolio improvement, read `.agents/skills/portfolio-improvement-loop/SKILL.md`.
The owner may invoke it as `$portfolio-improvement-loop`.
Ordinary targeted tasks do not automatically start a review loop.

This is an on-demand workflow, not a background service. `bun run agent` starts
the Monero agent host, **not** this review workflow.

Use source code, tests, project decisions, and local browser observations as
evidence. Respect existing changes. Keep private keys, wallet credentials, and
environment secrets out of prompts, reports, and logs. Use local fixtures for
payment and publication experiments. Do not publish, sign content, transfer
funds, deploy, or change live services merely to validate a hypothesis.

Discover current commands in `package.json`. For application changes, select
focused tests and then run the applicable check/build suite. Keep blocked or
unexecuted checks explicit; mocks do not prove real payments, and a passing build
does not prove browser behavior.
