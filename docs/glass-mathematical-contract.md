# Mathematical contract for random glass

This contract defines verifiable numerical and visual invariants, not a claim of perfect glass or perfect randomness. The material remains flat and monochrome with 6 px backdrop blur, with no pointer tracking or geometric motion.

## 1. Positive spectral covariance

The unbounded model is a finite Fourier field:

`G(p) = sum_j w_j [A_j cos(omega_j.p) + B_j sin(omega_j.p)]`.

With independent standard normal coefficients, its covariance is
`k(delta) = sum_j w_j² cos(omega_j.delta)`.
All spectral masses are positive and the weights have unit squared sum. This is a discrete instance of the spectral representation in [Bochner's theorem, GPML §4.2, Theorem 4.1](https://gaussianprocess.org/gpml/chapters/RW4.pdf).

There is also a direct finite proof: for any positions `p_i` and real numbers `v_i`,

`v^T K v = sum_j w_j² [(sum_i v_i cos(omega_j.p_i))² + (sum_i v_i sin(omega_j.p_i))²] >= 0`.

Thus the theoretical covariance is positive semidefinite. Random coefficients come from the [Box–Muller transform](https://doi.org/10.1214/aoms/1177706645). Its exact normal-distribution result assumes independent continuous uniform inputs. Our seeded integer hash and floating-point arithmetic only approximate those inputs; we do not claim exact Gaussian samples, independent random bits or cryptographic security from that hash. A fresh browser-generated seed supplies per-load variation.

The renderer uses `tanh(G)` to bound perturbation amplitude. This transformed field is smooth and stationary under the ideal model, but is not itself Gaussian; its covariance is not the raw kernel above. Six fixed low-frequency modes have spatial and temporal components. No fresh random sample is taken each animation frame. Analytic spatial/time derivatives include the derivative of `tanh`.

## 2. Hermite endpoint conditions

The unique polynomial of degree at most five satisfying `h(0)=0`, `h(1)=1` and zero first/second derivatives at both endpoints is

`h(u) = 6u^5 - 15u^4 + 10u^3`.

Uniqueness follows because the difference of two solutions would have roots of multiplicity at least three at both 0 and 1: a degree-six factor cannot divide a nonzero polynomial of degree at most five. Direct differentiation verifies the constraints.

Random surface height is multiplied by `e(u)=64u³(1-u)³`. Its value and first two derivatives vanish at both endpoints. Therefore the profile and perturbation join their constant extensions with C² continuity in the edge-distance coordinate. This is not a claim that a rounded-box distance field is globally C²: geometric seams, finite differences, map quantization and the displacement limiter have their own regularity.

## 3. Non-expansive convex projection

The displacement limiter is the Euclidean projection onto the closed radius-0.6 map-unit disk:

`P(x) = x min(1, 0.6 / ||x||)`.

It satisfies `||P(x)|| <= 0.6` and `||P(x)-P(y)|| <= ||x-y||`. See [Duchi, Introductory Lectures on Stochastic Optimization, Corollary 2.2.8](https://stanford.edu/~jduchi/PCMIConvex/Duchi16.pdf). The limiter cannot amplify a perturbation. Projection is not differentiable at every point of the disk boundary; no stronger smoothness claim is made.

The animation strength is `0.74 + 0.12*tanh(G) + 0.12*(1-exp(-8*tanh(v)²))`. Its range is contained in `[0.62, 0.98]`. The scroll response is smooth through zero velocity. The renderer applies a display scale of 12 times this strength: the ideal visible displacement is bounded by 5.88 CSS px. The 0.6 bound above concerns the generated field, not the final display displacement; raster rounding adds finite error.

## 4. Exact neutral code and practical limits

The raster encodes neutral displacement at integer 128. SVG subtracts 0.5 from a normalized channel, which would otherwise introduce a constant subpixel bias. A component transfer applies `(255/254)c - 1/254` before displacement. At normalized code `c=128/255` the result is 0.5, and the plateau has zero offset in the ideal arithmetic model. Actual GPU and floating-point evaluation have finite precision.

The renderer retains Snell refraction with index 1.48, the existing 3 px edge region, original navbar/control dimensions and one-pixel standard border. The theorem-backed construction addresses random-field validity, profile joins and boundedness. It does not prove visual taste, browser equivalence, physical completeness or device performance. Tests are regression checks alongside these derivations, not substitutes for universal proofs.
