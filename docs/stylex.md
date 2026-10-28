# StyleX in this Astro portfolio

StyleX replaces Tailwind; the site remains server-rendered Astro, with no React dependency or client-side styling runtime. The installed runtime and compiler are `@stylexjs/stylex` and `@stylexjs/unplugin` (0.19.1 at migration).

## Sources to read before editing

Use the official references rather than guessing from older React examples:

- [LLM resources](https://stylexjs.com/docs/llm-resources): installation, authoring and API reference material intended for coding agents.
- [Vite integration](https://stylexjs.com/docs/learn/installation/vite/): compiler configuration, CSS aggregation and development loading.
- [stylex.attrs](https://stylexjs.com/docs/api/javascript/attrs/): HTML `class` and serialized `style` attributes for SSR templates.
- [Defining styles](https://stylexjs.com/docs/learn/styling-ui/defining-styles/): static style definitions, pseudo states and media queries.
- [stylex.when](https://stylexjs.com/docs/api/javascript/when/): conditional selectors and markers for related elements.

These links are the upstream authority. Recheck them when upgrading; this document describes the integration tested in this repository.

## Build and authoring

`astro.config.ts` registers `stylex.vite({ useCSSLayers: false, runtimeInjection: false, lightningcssOptions: { minify: true } })`. The bounded shared production CSS is inlined with Astro’s `build.inlineStylesheets: 'always'` to avoid a render-blocking request. The opening-performance browser gate enforces a 48 KiB budget; future growth requires splitting styles rather than silently increasing that limit. StyleX definitions live in `src/styles/*.ts`, where the compiler can process them. Keep compiler-only APIs (`stylex.create()`, `stylex.defaultMarker()`, `stylex.when.*` and theme definitions) in these TypeScript modules, exporting markers for templates as needed. Do not call them in `.astro` frontmatter: the plugin's JavaScript/TypeScript transform does not process Astro source files directly.

Import definitions and the runtime in frontmatter, then spread HTML attributes:

```astro
---
import * as stylex from '@stylexjs/stylex';
import { styles } from '../styles/pages';
---

<h1 {...stylex.attrs(styles.heading)}>Title</h1>
```

Use `stylex.attrs()`, not React's `stylex.props()` (`className` is the wrong attribute). Compose styles by passing multiple definitions to `attrs`; keep conditions as explicit variants. Definitions must be statically analyzable; use literal CSS values and media queries inside `stylex.create()` rather than a runtime utility-class parser.

`Layout.astro` imports `src/styles/global.css`, providing a CSS asset for generated atomic rules. During development it also loads the compiler's virtual stylesheet. Global CSS is limited to document resets, inherited light/dark color tokens, accessibility defaults and the injected payment QR SVG. Component spacing, typography and controls belong in StyleX. Colors continue to use the existing `--background`, `--text`, `--muted`, `--border` and `--surface` tokens. Theme selection remains `prefers-color-scheme`.

Preserve native form behavior: amount radios remain real inputs with checked/focus styles, links remain links, and the payment QR stays white in both themes. No payment logic belongs in style modules.

## Verification

```sh
bun run format:check
bun run check
bun run build
bun test
TEST_CHECKOUT=1 bun test tests/checkout.test.ts
```

Inspect the built HTML and its linked CSS as well as development output: SSR class attributes alone do not prove CSS was emitted. Check narrow/wide viewports, system light/dark themes, keyboard focus and checked amount choices. Checkout tests use a fake gateway; real payments and production deployment require their own verification.

## Generated Log markup exceptions

Log article layout, headings, tags, source disclosures, history diffs and subject relationships use shared `src/styles/log-layout.ts`. Keep their presentation in StyleX. Stable semantic classes remain as microformat, browser-test and source-navigation hooks.

`src/styles/log-content.css`, used by `LogRevision.astro`, retains global descendant selectors for sanitized/generated Markdown and KaTeX markup, whose nodes do not pass through Astro component templates. `LogSigil.astro` retains the small structural SVG descendant rule for generated deterministic artwork. These are documented producer-specific exceptions; do not use them as permission to add unrelated page layout CSS.
