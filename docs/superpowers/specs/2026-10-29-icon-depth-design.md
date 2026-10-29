# Proportional icon depth

The owner selected very subtle proportional depth, preserving the existing icon silhouettes and monochrome identity. Flat icons were considered; fixed-pixel stacked shadows were rejected because they overemphasize small artwork.

Use one upper-left light and a two-stop neutral gradient. A single alpha shadow uses the rendered shorter side s: x = 0.02s, y = 0.04s, blur = 0.005s. It stays outside the mask to avoid clipping. Explicit icon dimensions, responsive variants, deferred technology masks and no-JavaScript rendering remain intact. Increased contrast and forced colors use flat symbols.

Verify computed scaling at 16, 24, 32 and 56 px and a wide icon, both themes, and accessibility overrides. Run the applicable format, check and production build gates. No publication or deployment is included.

Owner feedback: the initial material looked flat. Increase face contrast and lower-edge opacity while retaining the single proportional shadow. At 24 px the edge offset is 0.48 × 0.96 px with 0.12 px blur; at 56 px it is 1.12 × 2.24 px with 0.28 px blur. Dark mode uses a neutral gray edge, not a white glow.
