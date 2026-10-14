# Link previews

The server renders Open Graph and X Card metadata for public pages. The homepage title is `motto · Onur`, with the same randomly selected motto as its heading and preview image. Utility pages share their visible descriptions with metadata and image cards. The homepage has no description in standard metadata, JSON-LD or its image card; the selected motto appears once as the card’s large title. Messaging services cache previews independently; refreshing the page does not refresh an existing message.

`SITE_URL` must contain the public HTTP(S) origin. Never derive public asset addresses from an incoming Host header. Without that configuration, canonical URLs, oEmbed discovery and the Discord component card are omitted.

The public page set is Home, Donate, RSS and PGP. The redundant Identity page, empty project, note and reading pages and the OPML endpoint have been removed.

## Shared preview

- `/social/<public-page-key>.png?v=<revision>&m=0|1|2`: page-specific 1200 × 630 PNG. Header: owner logo and larger Onur name. On the homepage, the name matches the icon's visible height and vertical position. Body: the homepage’s selected motto, separated by a fine rule. Utility cards retain the smaller header motto, large page title and description. `public/brand/social.png` remains a redesigned home-card fallback for older shared URLs.
- `public/brand/icon.png`: 512 × 512; `apple-touch-icon.png`: 180 × 180; `/favicon.ico`: 16/32/48 pixels.
- OG image URL, HTTPS secure URL, MIME type, dimensions and alt text; matching X large-image card.
- Absolute PNG/touch/icon addresses when the public origin is configured. PNG is the first favicon declaration; the SVG and ICO fallbacks remain available.

The server renders PNGs using Sharp and bundled Liberation Sans font bytes, so card typography does not depend on host fonts. Fonts are initialized once per process in writable temporary storage. The public image route accepts only the public page keys and the three motto indices. It never fetches URLs or uses private payment records. Successful images are cached for one day; changing card content may require a preview cache refresh.

`socialImageVersion` versions the image URLs shared by OG, X Cards and the Discord component payload. Increment it when changing the card design so newly fetched pages reference a fresh image cache key. This does not invalidate previews already cached for existing Discord messages.

Apple recommends both a large OG image and a high-resolution square icon, with metadata available in the initial HTML: [TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages). Icons need not appear alongside an image in every layout.

Slack explicitly reads OG, X Cards and oEmbed: [Slack robots](https://api.slack.com/robots). Custom Slack buttons require an installed app, as shown by [Slack's unfurl example](https://github.com/slack-samples/javascript-link-unfurls). Website metadata alone cannot create Slack Block Kit cards.

WhatsApp, Telegram, Facebook and LinkedIn receive the same standard OG metadata. Their exact layout, truncation and cache behavior require real application checks; no simulator proves that result.

## oEmbed

`/oembed.json?url=<canonical-public-url>&format=json` returns link-type oEmbed 1.0 with provider, author, page title, description and a real icon thumbnail. The homepage omits optional title/description so a generic value does not override the motto in OG; consumers control how they combine both formats. Discovery appears only on indexable public pages.

The endpoint only accepts canonical public URLs on the configured origin. It never fetches user-supplied URLs. Private checkout paths, credentials, query strings, fragments and external origins fail with 404. Unsupported formats return 501; missing configuration returns 503. Requested thumbnail size limits choose an existing 512px or 180px image, or omit the thumbnail below 180px. Successful JSON may be cached for five minutes.

Sources: [oEmbed specification](https://oembed.com/), [specification repository](https://github.com/iamcal/oembed).

## Discord component card

Public pages additionally render a compact `discord:component-embed` JSON script: one Container containing the page image and Open page / PGP / RSS / Discord profile link buttons. The name, motto, title and description appear in the image, so the component card does not repeat them as text. Private payment status pages do not expose images or component cards. No bot, webhook or client script is required.

The official format requires server HTML, a single root Container, at most 3,000 JSON bytes and 40 components, link-style buttons, and a complete page/media fetch within ten seconds. OG remains the fallback. Source: [official component embeds](https://github.com/discord/discord-api-docs/blob/main/developers/link-previews/component-embeds.mdx), [documentation PR](https://github.com/discord/discord-api-docs/pull/8606). Implementation examples examined: [Seedcord](https://github.com/seedcord/seedcord/tree/next/packages/discord-component-embed), [Discord Embed Studio](https://github.com/bobjoerules/Discord-Embed-Studio). Simulator output is not a live Discord result.

## Verification boundary

Run focused SEO/oEmbed tests and Astro checks/build. Against a running build, inspect initial HTML using crawler user agents, follow discovery, check actual PNG bytes and dimensions, and reject external/private oEmbed targets. Before declaring live compatibility, repeat against the deployed public URL and inspect previews in the actual applications. No automated test sends messages on the user's behalf.
