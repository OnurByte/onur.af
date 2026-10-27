# Cursor ring implementation plan

**Goal:** Add a restrained monochrome circle inspired by Google Design, replacing the native mouse cursor while active.
**Architecture:** Shared Astro component, compiled StyleX styles, event-driven client module. No dependency or perpetual animation loop.
**References:** https://design.google/ (24 px circle and target expansion); https://github.com/Cuberto/mouse-follower (delegated interactive state). Independently authored implementation, no upstream code copied.

- [x] Add shared 24 px ring, 32 px on enabled interactive targets, using existing theme tokens.
- [x] Hide over text controls, on keyboard input, pointer exit, blur, touch, reduced motion and forced colors. Include dialog top-layer coverage without obstructing clicks.
- [x] Verify with browser interaction coverage, check, lint and build.

Validation: check and build passed; focused ESLint passed; two Chromium interaction tests passed. Full Bun suite: 257 pass, 8 skip; existing untracked campaign-preview.test.tsx fails because react/jsx-dev-runtime is unavailable. Browser border assertion caught reset interference; explicit StyleX border longhands fixed it.

Owner correction: circle replaces the pointer. A document attribute hides all native cursor overrides only after the ring opens; hide paths restore native cursors. Regression assertion reproduced cursor=auto before the fix.

Final owner requirement: filled white cursor with difference blending inverts underlying pixels. Native cursors are replaced throughout the page, including text controls (4 × 24 px caret). Pointer link state is 32 px, default is 24 px. Render within body or active dialog so difference blending reaches actual content. Keep cursor visible during scrolling. Three Chromium interaction tests pass, including input state and native cursor suppression.

Continuous custom pointer correction: CSS supplies original cursor.svg before hydration and without JavaScript, and while keyboard mode hides the live circle. Reduced motion keeps the live inverted cursor with zero-duration transitions. Fine pointers on hybrid devices are supported via any-pointer. Press feedback contracts enabled actions to 28 px, resting areas to 20 px. Scroll and native dialog close refresh the target under the stationary pointer. Disabled targets do not expand. New regressions first failed on the old native fallback; final browser checks cover these paths.
