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

## Static icons

All static SVG assets live in `public/brand/`, with lowercase filenames and their provenance in `public/brand/SOURCES.md`. Render them through `src/components/Icon.astro`; its typed name registry owns each asset URL and dimensions. Do not inline SVG markup, import icons with `?raw`, or duplicate image rendering in page templates.

The shared StyleX icon rule controls monochrome system-theme rendering. Icons are decorative (`alt=""`, `aria-hidden="true"`); the containing link or text provides the accessible name. Preserve source proportions: Onur 56 × 56 px, TOR and RSS 32 × 32 px, I2P 64 × 32 px. New icons follow this same registry and asset convention.

Favicons remain document metadata links. Payment QR codes are generated per donation and are not static icons.

## Native home embeds

Home source sections follow the [native embed contract](home-embeds.md). Providers supply normalized data only; all typography, layout, status text and links are rendered by the portfolio. No iframe, provider UI, raw HTML or provider scripts. Use sections with a 1 px outer border in the shared border color, 4 px corners, 16 px mobile / 24 px desktop padding, local monochrome provider icons, normal-weight 18 px section heading, 14 px secondary text and 32 px column gaps. Start 40 px below the motto, one column through 900 px and two above. Empty registry renders nothing. Keep every provider-independent state accessible in the existing system themes.

Embed provider icons share a non-shrinking square sized to the combined title line height, 4 px gap and profile line height (51.6 px at the default font size), with contained SVG artwork and no inner padding. Header titles and 14 px profile links stack together beside that box so profile length cannot change icon sizing or header alignment. Entries use 24 px spacing; secondary text uses 14 px / 1.6 line height. All colors inherit shared theme tokens.

The Spotify source appears below the two home columns as a full-width native section. Its provider heading and track information form a horizontal row that wraps on narrow screens; use the same border, 4 px corners, padding, type scale and monochrome icon registry as the other embeds.

Limit X post previews to two visible lines, keeping the full text accessible through the native post link and preserving keyboard focus without hover underlines. Repository names use weight 500, with 4 px before their 14 px descriptions. Spotify remains visible with Playing nothing replacing the Listening heading only for confirmed idle playback; otherwise it shows the current track and up to five distinct recent tracks in a responsive grid below it.

Spotify Recent is initially collapsed. Clicking the card’s non-link area or its 44 px arrow button at the far right of the provider/current-track row toggles the history. Native profile and track links retain their navigation behavior; keyboard users can use the arrow button. The button has `aria-expanded`, `aria-controls` and visible keyboard focus. Its local 16 px chevron rotates when expanded. Recent tracks form a single vertical list at every screen width. Refreshes replace list contents without resetting the disclosure state.

X like/repost counters use local decorative SVG icons with visible counts and accessible counter labels; the words are not repeated visually.

The native Spotify player uses validated Lanyard start/end timestamps to show a monochrome progress bar and elapsed/total time, updated every second while visible. It displays playback status and position, with no simulated play/pause or seeking controls. Confirmed idle playback replaces the Listening heading with Playing nothing and hides the timeline while retaining recent history; the empty message is never duplicated in the track area.

X and GitHub share 5 rem activity rows with 24 px gaps. X previews use two lines with collapsed whitespace; repository titles and descriptions each use one ellipsized line. Counter/language/commit footers align to the bottom of each row. Both desktop cards stretch to the same grid-row height. Full content remains available through the native links.

## Log sharing

Individual Log pages expose Share beside their metadata. Find and Share use the shared native dialog styles and exclusive dialog controller. Share opens on release of Ctrl + Shift alone, outside editable fields (Find's search field permits switching dialogs). Chords containing a third key do not open Share. Match Find’s plain action list: no visible dialog heading, footer key guide or section dividers. Clipboard success is silent; only failures show a status message. RSS always comes first and links to `/rss`; X appears before Discord. Discord copies the canonical link for pasting. Citation includes the current revision and only labels its proof verified when the signature exists. Native device sharing appears only where supported; RSS, X and Telegram have a no-JavaScript fallback.

Log and Log proof social cards reuse the complete deterministic seal renderer from the list cards. The existing 1200 × 630 monochrome composition remains, with text constrained beside a 240 px seal. Other public cards retain their existing layout.
