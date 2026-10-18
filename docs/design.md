# Design standard

The site uses one restrained, monochrome design implemented with StyleX. The official Vite plugin compiles TypeScript style definitions into atomic CSS. Astro templates apply these definitions with `stylex.attrs()`. Global CSS owns only the reset, inherited system color tokens, keyboard focus, reduced motion and injected QR SVG defaults. See [StyleX](stylex.md) for setup and authoring rules.

- Utility pages (RSS, Donate, PGP): one plain `h1`, followed by a short introduction in the prose-width container, then the controls or empty state. Use the common main alignment.
- Typeface: Helvetica Neue, Helvetica, Arial. Body: 16 px, line height 1.6. Machine addresses use monospace for readability.
- Theme: system preference, white/black backgrounds. No shadows, gradients or theme selector. The brand stays monochrome.
- Corners: 12 px on cards and dialogs through `--radius-card`; 8 px on buttons, inputs, amount choices and status labels through `--radius-control`; Connect uses the shared 8 px control radius.
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

Home source sections follow the [native embed contract](home-embeds.md). Providers supply normalized data only; all typography, layout, status text and links are rendered by the portfolio. No iframe, provider UI, raw HTML or provider scripts. Use sections with a 1 px outer border in the shared border color, 12 px corners, 16 px mobile / 24 px desktop padding, local monochrome provider icons, normal-weight 18 px section heading, 14 px secondary text and 32 px column gaps. Start 40 px below the motto, one column through 900 px and two above. Empty registry renders nothing. Keep every provider-independent state accessible in the existing system themes.

Embed provider icons share a non-shrinking square sized to the combined title line height, 4 px gap and profile line height (51.6 px at the default font size), with contained SVG artwork and no inner padding. Header titles and 14 px profile links stack together beside that box so profile length cannot change icon sizing or header alignment. Entries use 24 px spacing; secondary text uses 14 px / 1.6 line height. All colors inherit shared theme tokens.

The Spotify source appears below the two home columns as a full-width native section. Its provider heading and track information form a horizontal row that wraps on narrow screens; use the same border, 12 px corners, padding, type scale and monochrome icon registry as the other embeds.

Limit X post previews to two visible lines, keeping the full text accessible through the native post link and preserving keyboard focus without hover underlines. Repository names use weight 500, with 4 px before their 14 px descriptions. Spotify remains visible with Playing nothing replacing the Listening heading only for confirmed idle playback; otherwise it shows the current track and up to five distinct recent tracks in a responsive grid below it.

Spotify Recent is initially collapsed. Clicking the card’s non-link area or its 44 px arrow button at the far right of the provider/current-track row toggles the history. Native profile and track links retain their navigation behavior; keyboard users can use the arrow button. The button has `aria-expanded`, `aria-controls` and visible keyboard focus. Its local 16 px chevron rotates when expanded. Recent tracks form a single vertical list at every screen width. Refreshes replace list contents without resetting the disclosure state.

X like/repost counters use local decorative SVG icons with visible counts and accessible counter labels; the words are not repeated visually.

The native Spotify player uses validated Lanyard start/end timestamps to show a monochrome progress bar and elapsed/total time, updated every second while visible. It displays playback status and position, with no simulated play/pause or seeking controls. Confirmed idle playback replaces the Listening heading with Playing nothing and hides the timeline while retaining recent history; the empty message is never duplicated in the track area.

X and GitHub share 5 rem activity rows with 24 px gaps. X previews use two lines with collapsed whitespace; repository titles and descriptions each use one ellipsized line. Counter/language/commit footers align to the bottom of each row. Both desktop cards stretch to the same grid-row height. Full content remains available through the native links.

## Log sharing

Individual Log pages expose Share beside their metadata. Find and Share use the shared native dialog styles and exclusive dialog controller. Share opens on release of Ctrl + Shift alone, outside editable fields (Find's search field permits switching dialogs). Chords containing a third key do not open Share. Match Find’s plain action list: no visible dialog heading, footer key guide or section dividers. The Share trigger uses a neutral 1 px border, the existing bordered shortcut badge and a local diamond-node share icon. The action list has equal 8 px padding on all sides. Successful clipboard and device sharing close the dialog and return focus to Share; clipboard success stays silent. Navigation selections also close the dialog. Failures keep it open with a status message. RSS always comes first and links to `/rss`; X appears before Discord, followed by Telegram and Mail. Discord copies the canonical link for pasting. Mail opens the visitor’s email client with the log title and canonical link. Native device sharing appears only where supported; RSS, X and Telegram have a no-JavaScript fallback.

Log and Log proof social cards reuse the complete deterministic seal renderer from the list cards. The existing 1200 × 630 monochrome composition remains, with text constrained beside a 240 px seal. Other public cards retain their existing layout.

Log contents indicators remain a fixed vertical rail at the right edge at every viewport width. The rail respects the shared page gutter (20 px on mobile, 24 px above 620 px). Narrow article layouts reserve 32 px beside the reading column so the rail never covers prose; the contents panel opens inward beside it.

## Connect

The home Connect section sits immediately above Spotify and follows the shared bordered card, monochrome icon registry and responsive spacing. Email, X, GitHub and XMPP remain visible. Service labels are primary; account names and configured addresses are secondary. Unconfigured Email and XMPP show only their service label, without placeholder status text or a link. PGP identity verification is available through the account proof badges; no separate Verify identity link is shown. Proof badges remain direct links without popups. Set `PUBLIC_CONTACT_EMAIL` and `PUBLIC_CONTACT_XMPP` to publish the owner's addresses; XMPP uses a native `xmpp:` URI. X and GitHub reuse the existing identity account registry. PGP links to the site's identity verification page. Links remain keyboard accessible and at least 44 px high.

## Verification badges

All identity and publication proof badges use `src/styles/proof.ts`: a 16 px decorative seal centered in a 24 px link, a 4 px gap from adjacent text, and shared hover/focus treatment. Labeled publication badges use the same 14 px text and 24 px line height. Account names and badges share one vertically centered identity row. Provider profile spacing belongs to the whole row, never just the account link. Connect uses the same identity row; proof links remain independent of the surrounding account click target.

## Corner radius rationale

Cards and dialogs use `--radius-card: 12px`; controls and proof focus outlines use `--radius-control: 8px`; Connect uses the shared 8 px control radius. This is a restrained design choice for the monochrome technical site, not a scientifically optimal pixel value. Bar and Neta (2006) found a preference for curved over sharp contours in visual objects; their study does not establish a numerical radius for web interfaces. Source: https://doi.org/10.1111/j.1467-9280.2006.01759.x .

Connect geometry: ordinary 8 px rounded corners; no squircle, translate, scale or tilt. The shared layered background treatment strengthens the top-right and bottom-left border regions while preserving independent nick/proof hit targets. Hover changes only surface and border colors.

Shared edge treatment: `src/styles/edge.ts` renders corner-anchored specular borders with layered CSS backgrounds, avoiding pseudo-elements that could conflict with card links or scroll inside dialogs. Apply to Log cards, home source sections, Connect items and Find/Share dialogs. Do not apply to text links, proof badges, form fields, QR codes, separators or small controls. The normal border remains the unsupported-browser fallback; shared fill/line custom properties support Connect hover and focus.

Responsive edge lighting uses corner-anchored `ellipse 50% 50%` gradients: each lighting field scales independently with the element’s own width and height. Stops run from 0% to 100%, with no fixed pixel fade distance, DOM measurement or resize listener. Browser layout automatically recalculates the field on content and viewport changes.
