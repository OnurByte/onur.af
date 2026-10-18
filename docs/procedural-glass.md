# Procedural navigation optics

The owner approved combining seeded variation, scroll response and slow organic motion after the [source research](liquid-glass-navbar-research.md). All existing navigation dimensions, hit targets and typography remain unchanged.

## Mathematical field

`src/portfolio/glass-optics.ts` is an original, deterministic CPU field generator. It combines a rounded-rectangle signed distance field, its finite-difference gradient, a smoothstep bezel profile and a seeded, domain-warped wave perturbation. The perturbation envelope and derivative vanish at the bezel boundaries. The surface normal refracts a perpendicular ray using Snell's law with index 1.48. The raised specular rim was removed after visual review: the surface now retains only the existing one-pixel site border.

The 3 px edge region is expressed in actual CSS pixels, independently of the navbar aspect ratio. The central plateau is neutral. The displacement vector is limited to 0.6 px; the animated filter scales it downward from that bound. The output is one RGBA displacement map. This is a single-surface optical approximation with artistic surface perturbations, not a complete physical light transport simulation.

## Rendering and motion

`src/client/nav-glass.ts` creates the SVG filter and maps once at initialization and regenerates them on actual size changes. It caps map geometry at 2048 × 256 and samples at the device pixel ratio capped at 2× while keeping the bezel in CSS pixels. No source from the research repositories is copied and no runtime package is installed.

A cryptographically generated per-page seed selects the stationary wave phases and slow temporal phases. The seed is used only for visual variation. Time evolves through two incommensurate low-frequency waves; this is continuous deterministic variation, not a fresh random sample every frame. There are no cursor or pointer listeners. Bounded scroll velocity briefly changes the optical strength. A maximum 30 Hz update changes the displacement scale and the slowly evolving light position; it does not regenerate the optical maps or transform the controls.

The effect samples the real backdrop in Chromium through an SVG `feDisplacementMap`. Other engines retain the CSS backdrop material with the same standard one-pixel border. Chromium detection is an explicit compatibility tier, not a claim that all browsers render SVG backdrop filters identically.

Reduced motion freezes the generated lens and light. Increased contrast or reduced transparency restores the existing opaque CSS surface. Visibility changes and pagehide pause the frame loop; pageshow resumes it without a wall-clock time jump. Without JavaScript the existing glass and native navigation remain functional. The optical surface and faint interior light overlay do not receive pointer events; text and controls render above both.

## Verification

Unit tests verify reproducibility, seed variation, neutral center, constant-pixel bezel, bounded/continuous motion and rejected allocation dimensions. Browser tests verify unchanged desktop/mobile geometry, interaction without layout movement, resized maps, search accessibility, pause/resume, preference changes and no-JavaScript navigation. Device performance must be measured; theoretical field complexity alone does not guarantee low compositor cost.

## Sources behind the design

- [Rounded-box and optical pipeline reference](https://github.com/rukkiecodes/liquid-glass).
- [Refraction and stretched-map analysis](https://github.com/sohumsuthar/liquid-glass/blob/main/PHYSICS.md).
- [SVG displacement demonstration](https://github.com/shuding/liquid-glass).
- [Backdrop compatibility limitation](https://github.com/WebKit/WebKit/pull/68614).

## Latest material settings

Roughness is zero: there is no blur filter in the enhanced or no-JavaScript surface. Backdrop coloration is monochrome through `grayscale(1)` and neutral tint only. There is no generated specular rim, raised bevel, outer shadow or simulated mirror-reflectivity control. The virtual slab depth is 1.5 ± 0.08 px, retaining only a slight edge refraction. Dense sampling follows screen resolution through 2× without tessellating or moving the navbar silhouette.

The navbar's one-pixel outline uses `edge.ring`, derived from exactly the same corner-light background as Connect's `edge.frame`. The ring masks out its interior so it cannot paint over the refractive surface. Log and Find reuse `edge.frame` directly. The Onur mark/name is a native link to `/` on every page.

The result is an artistic single-surface optical approximation. It is not a physically complete or mathematically perfect reproduction of Apple Liquid Glass: it has no full environment reflection, multiple scattering or measured material calibration.
