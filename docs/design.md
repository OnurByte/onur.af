# Design standard

The site uses one restrained, monochrome design implemented with StyleX. The official Vite plugin compiles TypeScript style definitions into atomic CSS. Astro templates apply these definitions with `stylex.attrs()`. Global CSS owns only the reset, inherited system color tokens, keyboard focus, reduced motion and injected QR SVG defaults. See [StyleX](stylex.md) for setup and authoring rules.

- Utility pages (RSS, Donate, PGP): one plain `h1`, followed by a short introduction in the prose-width container, then the controls or empty state. Use the common main alignment.
- Typeface: Helvetica Neue, Helvetica, Arial. Body: 16 px, line height 1.6. Machine addresses use monospace for readability.
- Theme: system preference, white/black backgrounds. No theme selector. Shadows and gradients are limited to the documented shared edge, navigation and icon materials. The brand stays monochrome.
- Corners: 12 px on cards and dialogs through `--radius-card`; 8 px on buttons, inputs, amount choices and status labels through `--radius-control`; Connect uses the shared 8 px control radius.
- Borders: 1 px for controls and separators. Keyboard focus: 2 px outline, 3 px offset.
- Controls: at least 44 px high, 16 px text, weight 500, line height 1.4. Buttons use 12 px vertical and 16 px horizontal padding.
- Primary actions: solid foreground background, inverted text. Secondary actions such as Copy: transparent with a neutral border. Navigation actions remain native links, styled with the shared StyleX button definitions when they need button emphasis.
- Spacing: multiples of 4 px. Use 8/12 px within small groups, 16/20/24 px between related elements, 32/40 px between sections.
- Alignment: header, main and footer share a 960 px maximum width and 24 px side gutters, reduced to 20 px below 620 px. Limit prose to 65 characters and donation controls to 740 px inside this common alignment.
- Responsive groups wrap instead of overflowing. Preserve visible keyboard focus and reduced-motion preferences.
- QR codes keep a white background for scanning. Footer icons retain their existing proportions; the RSS icon is white in dark mode and black in light mode for visibility.

Do not add page-specific button radii, fonts or colors. Keep the existing StyleX patterns and shared system color tokens. StyleX is compiled locally; the browser does not download a CSS framework or execute a CDN runtime.

## Glass navigation material

The sticky navbar preserves its original dimensions: 104 px high on desktop, 96 px through 360 px, 24 px vertical padding, 48/56 px brand mark, 32/40 px name and 48 px controls. Its content keeps the common page alignment. A stationary, noninteractive surface extends 12 px beyond that content, using the existing 12 px card radius, 68% neutral tint and subtle zero-blur optical refraction without a raised rim or specular border highlight. This shared navigation material is an exception to the general no-gradient/no-shadow rule; it adds no outer shadow, chromatic fringe, pointer tracking or runtime library. Reduced transparency, increased contrast and unsupported backdrop filtering use a solid surface. The border and Log/Find controls share the Connect corner-light treatment; the Onur mark links home. See [procedural optics](procedural-glass.md) and [research and source comparison](liquid-glass-navbar-research.md).

## Static icons

All static SVG assets live in `public/brand/`, with lowercase filenames and their provenance in `public/brand/SOURCES.md`. Render them through `src/components/Icon.astro`; its typed name registry owns each asset URL and dimensions. Do not inline SVG markup, import icons with `?raw`, or duplicate image rendering in page templates.

The shared StyleX icon rule controls monochrome system-theme rendering. Icons are decorative (`alt=""`, `aria-hidden="true"`); the containing link or text provides the accessible name. Preserve source proportions: Onur 56 × 56 px, TOR and RSS 32 × 32 px, I2P 64 × 32 px. New icons follow this same registry and asset convention.

Icon depth uses `src/styles/icon-material.ts`. A nested mask takes the original SVG alpha and preserves contain/center proportions; a monochrome surface gradient supplies upper-left illumination. The outer icon applies a thin extrusion edge and soft directional alpha shadows. Sizes, hit targets and silhouettes stay unchanged. No box, hover movement or animation is added. High-contrast and forced-color modes remove depth and use a solid symbol; forced colors use CanvasText. Technology masks are activated near viewport visibility with a noscript mask fallback. The shared mark is preloaded. SVGO reduces SVG source overhead without changing the material; `icons:optimize` retains source IDs and descriptions.

Favicons remain document metadata links. Payment QR codes are generated per donation and are not static icons.

## Native home embeds

Home source sections follow the [native embed contract](home-embeds.md). Providers supply normalized data only; all typography, layout, status text and links are rendered by the portfolio. No iframe, provider UI, raw HTML or provider scripts. Use sections with a 1 px outer border in the shared border color, 12 px corners, 16 px mobile / 24 px desktop padding, local monochrome provider icons, normal-weight 18 px section heading, 14 px secondary text and 32 px column gaps. Place these secondary sources after the introduction, Logs, Connect and compact Technologies; use one column through 900 px and two above. Empty registry renders nothing. Keep every provider-independent state accessible in the existing system themes.

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

Every page mounts one progressive-enhancement Scroll Rail at the viewport’s right edge, below the navbar (z-index 20 versus the header’s 30). The compact vertical teeth are centered in the external page gutter, with a 24 px interaction area. Mobile main content reserves 4 px inside its existing right gutter so the rail does not cover cards or text; desktop already has the required 24 px gutter. There is no hamburger control or full-height editor-style track. The active section tooth grows from 8 to 16 px; a foreground fill advances within that section and completed sections stay filled. Home’s Log section is labelled “Logs”.

Native document scrolling, the existing smooth-scroll engine, hash/history and target focus remain authoritative. JavaScript hides the native scrollbar’s visual track after the rail is ready. Without JavaScript the document retains its styled native scrollbar. The rail supports drag seeking and Arrow/Page/Home/End keys; Enter or ArrowLeft opens the contents panel. Modal dialogs hide and disable the background rail.

Only explicit `data-scroll-section` targets and current-revision `data-scroll-headings` Markdown headings enter the contents model. Cards, code blocks and archived revisions do not. Pages without meaningful sections retain a minimal scroll indicator with no empty panel. Heading changes refresh the model without replacing unchanged links or losing keyboard focus; unrelated live clocks do not rebuild navigation. Section positions are cached and refreshed on content layout, font and viewport changes. Ordinary scroll events do not measure headings.

The inward-opening panel uses unnumbered native anchors, depth indentation, shared 12 px card geometry and a separate `edge.ring` corner-light border. The border is separate because opaque `edge.frame` layers would conceal the backdrop through a translucent fill. Hover and focus open the panel, the pointer can move into it, and Escape dismisses it until a new entry, focus action or explicit keyboard opening. Heading selection preserves hash history and focuses the actual destination.

Navbar and rail share `src/styles/glass-surface.ts` and the optical runtime. Tall panels use a static refractive field with at most 2,097,152 source pixels and dimensions up to 2048 px, preserving the physical bezel instead of stretching a short map. Only the navbar runs continuous motion; the rail adds no continuous loop. Firefox/WebKit use the same translucent material without SVG backdrop displacement. Reduced transparency, increased contrast and unsupported backdrop filtering retain an opaque readable monochrome surface.

Find, Share and the contents panel use the shared `ScrollBar.astro` and `local-scroll.ts` for overflow. Their native scroll viewports retain wheel, touch, focus and keyboard behavior while a custom monochrome thumb provides pointer/keyboard seeking. The native visual track is hidden only after enhancement. Code, tables, text fields and no-JavaScript fallbacks use the shared thin monochrome scrollbar styling rather than browser-default colors and geometry. Filtering, resizing and opening a dialog refresh scrollbar geometry; no continuous loop is added.

## Connect

The home Connect section follows Logs, before Technologies and provider activity, and renders independently of provider availability and follows the shared bordered card, monochrome icon registry and responsive spacing. Email, X, GitHub and XMPP remain visible. Service labels are primary; account names and configured addresses are secondary. Unconfigured Email and XMPP show only their service label, without placeholder status text or a link. PGP identity verification is available through the account proof badges; no separate Verify identity link is shown. Proof badges remain direct links without popups. Set `PUBLIC_CONTACT_EMAIL` and `PUBLIC_CONTACT_XMPP` to publish the owner's addresses; XMPP uses a native `xmpp:` URI. X and GitHub reuse the existing identity account registry. PGP links to the site's identity verification page. Links remain keyboard accessible and at least 44 px high.

## Verification badges

Proof icons always appear to the right of the text they verify, including labeled Verified links. All identity and publication proof badges use `src/styles/proof.ts`: a 16 px decorative seal centered in a 24 px link, a 4 px gap from adjacent text, and shared hover/focus treatment. Labeled publication badges use the same 14 px text and 24 px line height. Account names and badges share one vertically centered identity row. Provider profile spacing belongs to the whole row, never just the account link. Connect uses the same identity row; proof links remain independent of the surrounding account click target.

## Corner radius rationale

Cards and dialogs use `--radius-card: 12px`; controls and proof focus outlines use `--radius-control: 8px`; Connect uses the shared 8 px control radius. This is a restrained design choice for the monochrome technical site, not a scientifically optimal pixel value. Bar and Neta (2006) found a preference for curved over sharp contours in visual objects; their study does not establish a numerical radius for web interfaces. Source: https://doi.org/10.1111/j.1467-9280.2006.01759.x .

Connect geometry: ordinary 8 px rounded corners; no squircle, translate, scale or tilt. The shared layered background treatment strengthens the top-right and bottom-left border regions while preserving independent nick/proof hit targets. Hover changes only surface and border colors.

Shared edge treatment: `src/styles/edge.ts` renders corner-anchored specular borders with layered CSS backgrounds, avoiding pseudo-elements that could conflict with card links or scroll inside dialogs. Apply to Log cards, home source sections, Connect items and Find/Share dialogs. Do not apply to text links, proof badges, form fields, QR codes, separators or small controls. The normal border remains the unsupported-browser fallback; shared fill/line custom properties support Connect hover and focus.

Responsive edge lighting uses corner-anchored `ellipse 50% 50%` gradients: each lighting field scales independently with the element’s own width and height. Stops run from 0% to 100%, with no fixed pixel fade distance, DOM measurement or resize listener. Browser layout automatically recalculates the field on content and viewport changes.

## Find availability

Find is server-rendered and always visible. Its native `commandfor` /
`show-modal` button opens the page-link dialog without waiting for the search
module. JavaScript enhances it with filtering, shortcuts and shared dialog
coordination. Keep the query input disabled until filtering is ready; a failed
module request must not hide navigation or present a working search field.

In fallback mode, show document destinations only. Same-page fragment links
become available when the enhancement can close the modal before scrolling;
otherwise their destinations would remain inert behind an open dialog.

## Home content hierarchy

Preserve the signed introduction, portrait, motto, published Logs and identity proofs. Connect precedes secondary catalogs. Technologies keeps every existing name with its existing 16 px monochrome icon in eight readable groups (one column on mobile, two above 620 px) instead of individual bordered tool cards. Do not shrink body type or remove values to shorten the page.

Provider sections show two primary entries initially. A native details/summary labeled Show more exposes the remaining entries without JavaScript; its accessible name identifies the source. Keep all item links, counters and status messages. Collapsed rows are not part of visual row-height comparisons. No inner scrollbar, carousel or new animation is added. Spotify retains its existing independent recent-track disclosure.

## Custom pointer

The pointer is a filled 24 px circle using white with difference blending, so the content beneath it is inverted. Enabled actions expand it to 32 px; pressing contracts it by 4 px. Text inputs and editable content use a 4 × 24 px form. Pointer position updates immediately. Reduced motion disables size transitions while preserving the custom pointer. Disabled controls retain the resting circle. The CSS circular cursor covers initial loading, keyboard mode and JavaScript-free pages; system arrows, hands and text pointers are suppressed throughout the document and dialog backdrops. Touch input adds no pointer. Native browser chrome remains outside the site's control.

## Selection and home motto

Text selection uses one connected monochrome outline, a 4 px horizontal / 3 px vertical outside inset and the shared 8 px control radius. Round only the outside contour, not every inline fragment independently. Preserve native selection, copy and context menus; editable fields and unsupported modes retain the native monochrome fallback. The shared layout applies selection rendering site-wide, while annotation controls mount only inside Log revisions. Each new homepage response excludes the previous motto for that browser session, storing only the previous variant index in an HTTP-only same-site functional cookie. The motto remains server-rendered; it does not change after first paint.
