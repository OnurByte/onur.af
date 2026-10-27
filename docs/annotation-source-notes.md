# Annotation interaction reference

Reference: [dokieli/dokieli](https://github.com/dokieli/dokieli), commit `a70c9eaa65319e762b378b5cf4384a92ee1ee99a`.

Reviewed `src/editor/utils/annotation.js`, `src/editor/toolbar/toolbar.js`, and `src/activity.js`. Their relevant patterns are preserving the selection before editor focus, keeping an open editor stationary, quote/context selectors, cross-node selections and W3C Web Annotation representations. The portfolio uses an independent implementation of these interaction patterns; it does not embed dokieli's application, editor, authentication or global styles.

The portfolio keeps its stricter trust boundaries: annotations remain bound to the exact signed revision hash; quote-based display recovery must yield a single context-matching result; server acceptance still validates original positions against signed content; repeated ambiguous text is not marked indiscriminately. Existing signed Markdown and the original article text nodes are not rewritten to add marks.

The contextual composer shows its selected quote, saves new-note drafts locally, preserves keyboard editing and offers a standard JSON-LD export. `onur-text-v1` stores UTF-16 offsets, while W3C exports explicitly convert them to Unicode codepoint positions. Source fragments identify stable per-revision article containers, including archived revisions. Browser ownership, automatic publication and rate limits remain independent of Witness measurement and require no PGP approval or moderator.

Rounded selection rendering is shared by the site layout. Only Log article components mount annotation controls. Editable fields, forced-colour modes and JavaScript-free documents retain native selection fallbacks.
