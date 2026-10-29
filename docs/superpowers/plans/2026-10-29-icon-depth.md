# Proportional Icon Depth Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the owner's selected subtle proportional depth throughout the shared icon renderer.
**Architecture:** Explicitly sized outer container, shadow wrapper, original alpha-masked face. CSS container units scale to the shorter rendered side.
**Tech Stack:** Astro, StyleX, Playwright.
**Spec:** docs/superpowers/specs/2026-10-29-icon-depth-design.md

## Global Constraints

Preserve silhouettes, dimensions, theme behavior, deferred masks and noscript rendering. Keep styles in shared StyleX modules. No deployment.

## Review Focus

Small icons must remain sharp; wide icons scale by the shorter side; responsive branding must recalculate; forced colors and increased contrast must remove material; deferred technology faces must still appear.

### Task 1: Shared material

- [x] Update icon-material.ts, shell.ts and Icon.astro with the size container and single shadow wrapper.
- [x] Document the exact proportional rule in brand.md and docs/design.md.
- [x] Add browser coverage for computed shadow dimensions, responsive and wide icons, deferred masks, both themes and contrast overrides.
- [x] Run focused browser tests against the production build, format checks, type checks and build. Inspect screenshots for edge clarity.

## Verification

Production build and Astro/TypeScript checks passed. Format check passed; final lint passed. Ten focused browser tests passed; after lint-only test cleanup, all three material tests passed again. Light and dark screenshots were inspected. Independent review found no important issues. No deployment performed.
