# Design standard

The site uses one restrained, monochrome design implemented with StyleX. The official Vite plugin compiles TypeScript style definitions into atomic CSS. Astro templates apply these definitions with `stylex.attrs()`. Global CSS owns only the reset, inherited system color tokens, keyboard focus, reduced motion and injected QR SVG defaults. See [StyleX](stylex.md) for setup and authoring rules.

- Utility pages (RSS, Donate, PGP): one plain `h1`, followed by a short introduction in the prose-width container, then the controls or empty state. Use the common main alignment.
- Typeface: Helvetica Neue, Helvetica, Arial. Body: 16 px, line height 1.6. Machine addresses use monospace for readability.
- Theme: system preference, white/black backgrounds. No shadows, gradients or theme selector. The brand stays monochrome.
- Corners: 4 px on buttons, inputs, amount choices and status labels, through StyleX `borderRadius: 4`.
- Borders: 1 px for controls and separators. Keyboard focus: 2 px outline, 3 px offset.
- Controls: at least 44 px high, 16 px text, weight 500, line height 1.4. Buttons use 12 px vertical and 16 px horizontal padding.
- Primary actions: solid foreground background, inverted text. Secondary actions such as Copy: transparent with a neutral border. Navigation actions remain native links, styled with the shared StyleX button definitions when they need button emphasis.
- Spacing: multiples of 4 px. Use 8/12 px within small groups, 16/20/24 px between related elements, 32/40 px between sections.
- Alignment: header, main and footer share a 960 px maximum width and 24 px side gutters, reduced to 20 px below 620 px. Limit prose to 65 characters and donation controls to 740 px inside this common alignment.
- Responsive groups wrap instead of overflowing. Preserve visible keyboard focus and reduced-motion preferences.
- QR codes keep a white background for scanning. Footer icons retain their existing proportions; the RSS icon is white in dark mode and black in light mode for visibility.

Do not add page-specific button radii, fonts or colors. Keep the existing StyleX patterns and shared system color tokens. StyleX is compiled locally; the browser does not download a CSS framework or execute a CDN runtime.
