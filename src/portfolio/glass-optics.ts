import {
  createSpectralField,
  glassProfile,
  projectGlassOffset,
} from './glass-random';

// A deterministic optical field, independent of the DOM and rendering backend.
const MAX_OFFSET = 0.6;
const BEZEL = 3;
const IOR = 1.48;
const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

function distance(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const qx = Math.abs(x - width / 2) - width / 2 + radius;
  const qy = Math.abs(y - height / 2) - height / 2 + radius;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    radius
  );
}

export function createGlassField(
  geometry: {
    width: number;
    height: number;
    radius: number;
    resolution?: number;
  },
  seed: number,
) {
  const {
    width: inputWidth,
    height: inputHeight,
    radius: inputRadius,
  } = geometry;
  const resolution = geometry.resolution ?? 1;
  if (
    ![inputWidth, inputHeight, inputRadius, seed, resolution].every(
      Number.isFinite,
    ) ||
    resolution < 1 ||
    resolution > 2 ||
    inputWidth < 2 ||
    inputHeight < 2 ||
    inputWidth > 2048 ||
    inputHeight > 256 ||
    inputRadius < 0
  )
    throw new RangeError('Invalid glass geometry');
  const width = Math.round(inputWidth * resolution);
  const height = Math.round(inputHeight * resolution);
  const radius = Math.min(inputRadius, inputWidth / 2, inputHeight / 2);
  const displacement = new Uint8ClampedArray(width * height * 4);
  const field = createSpectralField(seed);
  const depth = 1.5 + field.sample(0, 0, 0).value * 0.08;
  let maxOffset = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      displacement[offset] =
        displacement[offset + 1] =
        displacement[offset + 2] =
          128;
      displacement[offset + 3] = 255;
      const px = (x + 0.5) / resolution,
        py = (y + 0.5) / resolution;
      const d = distance(px, py, inputWidth, inputHeight, radius);
      if (d > 0 || d <= -BEZEL) continue;
      const u = clamp(-d / BEZEL, 0, 1);
      const gx =
        distance(px + 0.5, py, inputWidth, inputHeight, radius) -
        distance(px - 0.5, py, inputWidth, inputHeight, radius);
      const gy =
        distance(px, py + 0.5, inputWidth, inputHeight, radius) -
        distance(px, py - 0.5, inputWidth, inputHeight, radius);
      const gradient = Math.hypot(gx, gy) || 1;

      const profile = glassProfile(u);
      const sample = field.sample(px, py, 0);
      const slope = (depth / BEZEL) * profile.slope;
      const perturbation =
        (0.16 * profile.envelopeSlope * sample.value) / BEZEL;
      const tangentX = 0.16 * profile.envelope * sample.dx;
      const tangentY = 0.16 * profile.envelope * sample.dy;
      let nx = (gx / gradient) * (slope + perturbation) - tangentX;
      let ny = (gy / gradient) * (slope + perturbation) - tangentY;
      const length = Math.hypot(nx, ny, 1);
      nx /= length;
      ny /= length;
      const nz = 1 / length;

      // Snell transmission of a perpendicular view ray through the slab.
      const eta = 1 / IOR;
      const f =
        eta * nz - Math.sqrt(Math.max(0, 1 - eta * eta * (1 - nz * nz)));
      const travel = depth / Math.max(1e-4, eta - f * nz);
      const [dx, dy] = projectGlassOffset(f * nx * travel, f * ny * travel);
      maxOffset = Math.max(maxOffset, Math.hypot(dx, dy));
      displacement[offset] = 128 + (dx / MAX_OFFSET) * 127;
      displacement[offset + 1] = 128 + (dy / MAX_OFFSET) * 127;
    }
  }
  return { width, height, displacement, maxOffset };
}

let motionField:
  { seed: number; field: ReturnType<typeof createSpectralField> } | undefined;

export function glassMotion(
  seed: number,
  milliseconds: number,
  velocity: number,
) {
  if (!motionField || motionField.seed !== seed)
    motionField = { seed, field: createSpectralField(seed) };
  const t = milliseconds / 1000;
  const drift = motionField.field.sample(0, 0, t).value;
  const vertical = motionField.field.sample(123, 71, t).value;
  const v = Math.tanh(velocity);
  // Smooth bounded scroll energy: no abs cusp or clamp discontinuity at rest.
  const energy = 1 - Math.exp(-8 * v * v);
  return {
    strength: 0.74 + drift * 0.12 + energy * 0.12,
    lightX: 50 + drift * 8,
    lightY: 40 + vertical * 6,
  };
}
