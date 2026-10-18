# Glass navigation material

Research date: 2026-10-18.

The portfolio's navigation should suggest clear liquid glass while retaining its monochrome, quiet, technical character. The owner explicitly requested preserving the original dimensions: 104 px desktop header, 96 px through 360 px, 24 px vertical padding, 48/56 px brand mark, 32/40 px name, and 48 px controls. Only the material changes.

## GitHub source review

| Source                                                                                                                                                                                                            | Technique inspected                                                                                                               | Fit for this site                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shuding/liquid-glass](https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js)                                                                                                                         | Canvas-generated displacement map, SVG `feDisplacementMap`, backdrop filtering and inset shading.                                 | Useful explanation of edge lensing, but its draggable demonstration and generated map are unnecessary for one static navbar.                                                                                                                                           |
| [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react/blob/master/src/index.tsx)                                                                                                                   | Three displaced RGB channels, edge masking, blur and interaction transforms.                                                      | React integration, chromatic fringes, large shadows and elastic motion would change the portfolio's visual language. The README documents partial Safari/Firefox support; [issue 3](https://github.com/rdev/liquid-glass-react/issues/3) reports Chromium frame drops. |
| [rizzytoday/liquid-glass](https://github.com/rizzytoday/liquid-glass/blob/main/core/liquid-glass.ts)                                                                                                              | Dependency-free generated displacement maps, resize observation and explicit Chromium detection.                                  | More suitable than a React package if physical refraction becomes a requirement, but Safari/Firefox still receive a blur fallback. The default three-channel aberration is inappropriate for monochrome navigation.                                                    |
| [sohumsuthar/liquid-glass core](https://github.com/sohumsuthar/liquid-glass/blob/main/css/liquid-glass-core.css) and [navigation](https://github.com/sohumsuthar/liquid-glass/blob/main/css/liquid-glass-nav.css) | Separates transmission, neutral tint, specular rim and content; uses a compact navbar and distinguishes clear from regular glass. | The separation of material from content informs this implementation. Its full optics, pill geometry, scroll effects and outer shadows are not adopted. Its calibration/performance claims are author claims, not measurements reproduced here.                         |

## Decision

Implement an original CSS material in the existing StyleX definitions, without copying source or adding a runtime dependency. The result suggests clear liquid glass through transmission and rim lighting; it does not physically refract the backdrop.

- Keep the existing centered 960 px content alignment, sticky behavior and unlinked brand.
- Place the material on a noninteractive pseudo-element. Extend its rim 12 px beyond the navigation content so the name and controls still align with main and footer.
- Use the site's existing 12 px card corners, a neutral 68% tint, 6 px backdrop blur and stationary inset highlights. The surface stays monochrome and the existing button/focus styles remain intact.
- Use a solid surface when backdrop filtering is unsupported or when reduced transparency or increased contrast is requested.
- Avoid continuously running JavaScript, pointer tracking, RGB dispersion, scale/tilt effects and outer drop shadows.
- Preserve the existing 120 px anchor clearance and all navigation dimensions.

The only exception to the general no-gradient/no-shadow language is the navbar material: a very faint neutral tint gradient and inset rim highlights describe the glass surface. They are not a new treatment for cards or controls.
