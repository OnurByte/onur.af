# Proportional icon depth

The owner selected very subtle proportional depth, preserving the existing icon silhouettes and monochrome identity. Flat icons were considered; fixed-pixel stacked shadows were rejected because they overemphasize small artwork.

Use one upper-left light and a two-stop neutral gradient. A single alpha shadow uses the rendered shorter side s: x = 0.0075s, y = 0.015s, blur = 0.01s. It stays outside the mask to avoid clipping. Explicit icon dimensions, responsive variants, deferred technology masks and no-JavaScript rendering remain intact. Increased contrast and forced colors use flat symbols.

Verify computed scaling at 16, 24, 32 and 56 px and a wide icon, both themes, and accessibility overrides. Run the applicable format, check and production build gates. No publication or deployment is included.
