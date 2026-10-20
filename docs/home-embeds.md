# Native home embeds

Home embeds are native sections of the portfolio. A provider supplies data, never its interface. No iframe, provider script, raw HTML, remote stylesheet, player or third-party card image belongs in this pipeline. The existing outward-facing `/oembed.json` endpoint is unrelated.

## Boundaries

- `src/content/home-embeds.ts` is the ordered server-side source registry. It enables X `onurstirner` through FxEmbed and GitHub `onurbyte` through GitShow profile and repository pages. Removing an entry disables it. Empty configuration renders no section, heading or placeholder and makes no provider requests.
- `src/portfolio/embed-sources.ts` defines `EmbedSource`: validated section metadata plus `load(signal): Promise<unknown>`. Adapters fetch and normalize upstream data on the server. They must pass the abort signal to network requests, check HTTP responses and keep credentials in server-only configuration. Never use `PUBLIC_` secrets or import adapters into client scripts.
- `src/portfolio/embeds.ts` validates normalized snapshots with strict Zod objects and exports inferred types. Unknown properties, provider HTML, invalid URLs and inconsistent states are rejected. URLs must be HTTPS without embedded credentials. Section IDs must be unique.
- `src/components/embeds/HomeEmbeds.astro` renders escaped data using the native component. X and GitHub add no browser JavaScript or remote assets. `SpotifyEmbed.astro` owns a small local script for Spotify refreshes; no third-party scripts are loaded.
- `src/styles/embeds.ts` owns the StyleX definitions.

The loader validates registry metadata before executing adapters. Sources then run concurrently in registry order, with a three-second default deadline per source; the home activity component allows 15 seconds for cold upstream requests. The page streams its document head, introduction and other primary content before waiting for that async component; activity sections remain server-rendered later in the same response. Invalid output, thrown errors and timeouts become an `unavailable` snapshot for that section; upstream exception details are never rendered. The loader aborts timed-out adapters. Adapters must cooperate with cancellation; JavaScript cannot forcibly stop arbitrary synchronous code.

## Native data contract

Each section has `id`, `title`, `source` and `href`. Its snapshot has `status`, `items` and optional ISO `updatedAt`. Maximum five primary entries per section keeps home compact. Spotify additionally supports an optional `recentTracks` list of up to five validated track entries; a history-only section can be ready without a current track. Adapters select and trim upstream results before returning them.

Each entry has `kind`, `title`, `href` and optional `detail`:

| Kind         | Extra fields                                     | Native presentation                                   |
| ------------ | ------------------------------------------------ | ----------------------------------------------------- |
| `track`      | optional `playedAt`                              | Track link, artist/detail, listening time             |
| `post`       | required plain `text`, optional `publishedAt`    | Author/title link, detail, escaped post text and date |
| `repository` | optional `language`, nonnegative integer `stars` | Repository link, description, language and stars      |
| `link`       | none                                             | Title and optional description for other sources      |

`ready` and `stale` require primary entries or recent tracks. `empty` and `unavailable` require both lists to be empty. A source with no activity returns `empty`; failures are `unavailable`. An adapter may return `stale` if it has a previous valid snapshot, with its original update timestamp. The framework does not invent data or claim automatic persistence: provider refresh schedules, caching, credentials and previous-snapshot storage are implemented only with the selected real adapters. The trial adapters fetch up to five X posts per refresh and five recently updated public GitHub repositories per request. No credentials are configured; successful snapshots are persisted to local server storage, and upstream rate limits may temporarily make a section unavailable. FxEmbed application-level errors are treated as unavailable even when HTTP succeeds. Live checks on 2026-10-15 loaded five entries from each provider. The X timeline also returned a transient provider code 404 during an earlier check; failures leave the profile link visible.

## Design standard

Keep the motto and common 960 px alignment. Sections begin 40 px below it; use one column through 900 px and two above it, with a 32 px gap. Each section has a 1 px outer border using `var(--border)`, 4 px corners, 16 px mobile / 24 px desktop padding, a local monochrome provider icon and normal-weight 18 px heading. Repository language labels include local monochrome SVG icons for Rust, TypeScript and JavaScript. Preserve the site's system light/dark tokens, Helvetica stack and 4 px spacing scale. No decorative cards, provider palettes, shadows or gradients.

Track, post and repository details share 14 px secondary text. Links remain native links with global keyboard focus. Plain post text preserves line breaks and wraps long words. Dates have machine-readable `datetime` and explicit UTC labels. Status messages remain readable without JavaScript. Section headings use `h2` beneath the existing page `h1` and label their sections.

## Verification

`bun test tests/embeds.test.ts tests/embed-sources.test.ts tests/home-embed-adapters.test.ts` covers data boundaries, native variants, duplicate IDs, source isolation and timeout cancellation. Run the usual formatting, strict type check, build and browser checks before shipping changes. Provider availability is separate from local framework verification.

Embed provider icons share a non-shrinking square sized to the combined title line height, 4 px gap and profile line height (51.6 px at the default font size), with contained SVG artwork and no inner padding. Header titles and 14 px profile links stack together beside that box so profile length cannot change icon sizing or header alignment. Entries use 24 px spacing; secondary text uses 14 px / 1.6 line height. All colors inherit shared theme tokens.

X timelines refresh on the first request after a 30-minute process-local cache expires and one retry, with a five-second deadline per attempt within the home page’s 15-second loader deadline. Failed refreshes return the last successful nonempty snapshot as stale with its original timestamp. Both sources persist validated successful snapshots in `data/embeds/` so local server restarts and development reloads retain them. `PORTFOLIO_EMBED_CACHE_DIR` overrides that directory. Vercel uses writable `/tmp/onur-portfolio-embeds`, which is instance-local and may disappear when an instance is replaced; this is not shared durable cloud storage. Cache read/write failures do not discard valid live data.

The X header keeps its local SVG logo; the adjacent profile link uses the text mark `𝕏`. GitHub rows use GitShow (`https://gitshow.dev/onurbyte`) as their only upstream. The server parses serialized category JSON without executing scripts and maps the five most recently pushed repositories to native entries. Repository pages provide last-12-week commit activity, kept as internal metadata and a tooltip rather than a visible suffix; these are not lifetime commit counts. GitShow has no documented public JSON endpoint, so this parser depends on its current server-rendered page structure. Missing or changed data fails closed. GitHub repository snapshots and commit counts are cached for 30 minutes; the first request after expiry refreshes them. Failed refreshes keep the last nonempty snapshot. Failed count requests omit the metric without hiding the repository; a missing activity chart omits the count.

Post entries omit repeated author headings and visible dates. The post text is the native permalink, with no underline on hover and the global keyboard focus outline. Post entries use 24 px spacing without internal separator lines; their native 14 px like and repost counters provide each entry’s footer. Missing counters are omitted rather than invented.

Cached content is displayed without a stale-status message.

Repository activity requests allow four seconds per attempt and retry once. A partial refresh preserves previously known counts for the same repository. Both providers combine concurrent refreshes. The streamed home activity component only waits for upstream requests on a cold cache or after its 30-minute refresh interval; the document head and primary content do not wait for it.

Spotify uses Lanyard REST presence for the existing site Discord user `1434953668959932426`. The Spotify label is plain text with no profile navigation; only track links navigate out. The native section spans both columns beneath X and GitHub, with the shared SVG icon, border, corners and spacing. Track name and artist come from validated live presence; no iframe, cover image or provider script is rendered. Lanyard is polled server-side on page requests with a five-second shared cache, not the 30-minute activity cache. Spotify playback stops clear the track; outages never relabel an old song as currently playing. The player stays visible. Confirmed idle presence replaces the Listening heading with Playing nothing; unknown/error presence uses Spotify as the heading and does not claim the user stopped listening. Up to five distinct previous tracks appear under Recent, excluding the current song. Stopping playback moves the last current song into history. Local development persists observed songs in the local cache directory; Vercel uses one private Blob object for shared persistent history and overwrites it with the latest five distinct previous tracks. Refresh errors show history without claiming an old track is currently playing. Lanyard does not supply past playback history: this records only songs observed by this site, without backfilling Spotify history. While the page is visible, a local script requests `/spotify.json` every five seconds; the shared server cache prevents duplicate upstream requests. This collector depends on page requests or an open visible page and does not record every song while the site is unvisited. The Discord account must join https://discord.gg/lanyard and expose Spotify activity.

X previews are clamped to two visible lines. GitHub repository names use weight 500 and a 4 px gap before the description.

Spotify Recent is initially collapsed. Clicking the card’s non-link area or its 44 px arrow button at the far right of the provider/current-track row toggles the history. Native profile and track links retain their navigation behavior; keyboard users can use the arrow button. The button has `aria-expanded`, `aria-controls` and visible keyboard focus. Its local 16 px chevron rotates when expanded. Recent tracks form a single vertical list at every screen width. Refreshes replace list contents without resetting the disclosure state.

X like/repost counters use local decorative SVG icons with visible counts and accessible counter labels; the words are not repeated visually.

The native Spotify player uses validated Lanyard start/end timestamps to show a monochrome progress bar and elapsed/total time, updated every second while visible. It displays playback status and position, with no simulated play/pause or seeking controls. Confirmed idle playback replaces the Listening heading with Playing nothing and hides the timeline while retaining recent history; the empty message is never duplicated in the track area.

X and GitHub share 5 rem activity rows with 24 px gaps. X previews use two lines with collapsed whitespace; repository titles and descriptions each use one ellipsized line. Counter/language/commit footers align to the bottom of each row. Both desktop cards stretch to the same grid-row height. Full content remains available through the native links.
