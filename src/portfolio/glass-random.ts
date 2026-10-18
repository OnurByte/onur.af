// Finite positive spectral measure: k(delta) = sum w_j^2 cos(omega_j.delta).
// Bochner's representation gives a PSD stationary covariance before tanh.
const spectrum = [
  [1 / 47, 1 / 31, 1 / 17, 1],
  [1 / 83, -1 / 41, 1 / 29, 0.8],
  [-1 / 61, 1 / 71, 1 / 43, 0.6],
  [1 / 127, 1 / 53, -1 / 59, 0.45],
  [1 / 29, -1 / 97, 1 / 37, 0.25],
  [-1 / 109, -1 / 79, 1 / 67, 0.15],
] as const;
const normalization = Math.sqrt(
  spectrum.reduce((sum, mode) => sum + mode[3] ** 2, 0),
);

function uniform(seed: number, lane: number) {
  let x = (seed ^ Math.imul(lane + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  // Open interval avoids log(0). Finite seeded values approximate uniforms.
  return (((x ^ (x >>> 15)) >>> 0) + 0.5) / 0x100000000;
}

export function createSpectralField(seed: number) {
  if (!Number.isFinite(seed)) throw new RangeError('Invalid glass seed');
  const modes = spectrum.map(([x, y, t, weight], i) => {
    // Box–Muller: Gaussian coefficients under ideal independent uniforms.
    // The practical seeded finite-precision generator is an approximation.
    const radius = Math.sqrt(-2 * Math.log(uniform(seed, i * 2)));
    const angle = Math.PI * 2 * uniform(seed, i * 2 + 1);
    const scale = weight / normalization;
    return {
      x,
      y,
      t,
      a: radius * Math.cos(angle) * scale,
      b: radius * Math.sin(angle) * scale,
      weight: scale * scale,
    };
  });
  return {
    sample(x: number, y: number, seconds: number) {
      let raw = 0,
        dx = 0,
        dy = 0,
        dt = 0;
      for (const mode of modes) {
        const theta = mode.x * x + mode.y * y + mode.t * seconds;
        const sin = Math.sin(theta),
          cos = Math.cos(theta);
        raw += mode.a * cos + mode.b * sin;
        const derivative = -mode.a * sin + mode.b * cos;
        dx += mode.x * derivative;
        dy += mode.y * derivative;
        dt += mode.t * derivative;
      }
      const value = Math.tanh(raw);
      const jacobian = 1 - value * value;
      // The bounded transformed field is smooth, but is no longer Gaussian.
      return { value, dx: dx * jacobian, dy: dy * jacobian, dt: dt * jacobian };
    },
    covariance(dx: number, dy: number, dt: number) {
      return modes.reduce(
        (sum, mode) =>
          sum + mode.weight * Math.cos(mode.x * dx + mode.y * dy + mode.t * dt),
        0,
      );
    },
  };
}

export function glassProfile(u: number) {
  const t = Math.max(0, Math.min(1, u));
  // Quintic Hermite interpolation: endpoint value/slope/curvature constraints.
  return {
    height: t ** 3 * (10 - 15 * t + 6 * t * t),
    slope: 30 * t * t * (1 - t) ** 2,
    curvature: 60 * t * (1 - t) * (1 - 2 * t),
    envelope: 64 * t ** 3 * (1 - t) ** 3,
    envelopeSlope: 192 * t * t * (1 - t) ** 2 * (1 - 2 * t),
    envelopeCurvature: 384 * t * (1 - t) * (1 - 5 * t + 5 * t * t),
  };
}

export function projectGlassOffset(x: number, y: number): [number, number] {
  // Euclidean projection onto the closed convex disk: non-expansive, radius .6.
  const scale = Math.min(1, 0.6 / Math.max(Math.hypot(x, y), 1e-12));
  return [x * scale, y * scale];
}
