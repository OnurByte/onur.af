// A deterministic optical field, independent of the DOM and rendering backend.
const MAX_OFFSET = 2.4;
const BEZEL = 10;
const IOR = 1.48;
const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

function phase(seed: number, lane: number) {
  let value = (seed ^ Math.imul(lane + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (((value ^ (value >>> 15)) >>> 0) / 0x100000000) * Math.PI * 2;
}

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
  const highlight = new Uint8ClampedArray(displacement.length);
  const phases = [phase(seed, 0), phase(seed, 1), phase(seed, 2)];
  const depth = 5.5 + Math.sin(phases[0]!) * 0.35;
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

      // Seeded, domain-warped low-frequency waves perturb the optical slope.
      // Their envelope and its derivative vanish at both bezel boundaries.
      const warp = Math.sin(px / 91 + phases[0]!) * 0.32;
      const a = px / 47 + py / 31 + phases[1]! + warp;
      const b = px / 23 - py / 41 + phases[2]!;
      const wave = Math.sin(a) * 0.7 + Math.sin(b) * 0.3;
      const envelope = 16 * u * u * (1 - u) * (1 - u);
      const derivative = 32 * u * (1 - u) * (1 - 2 * u);
      const slope = (depth / BEZEL) * 6 * u * (1 - u);
      const perturbation = (0.16 * derivative * wave) / BEZEL;
      const tangentX =
        0.16 *
        envelope *
        (Math.cos(a) *
          0.7 *
          (1 / 47 + (Math.cos(px / 91 + phases[0]!) * 0.32) / 91) +
          (Math.cos(b) * 0.3) / 23);
      const tangentY =
        0.16 * envelope * ((Math.cos(a) * 0.7) / 31 - (Math.cos(b) * 0.3) / 41);
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
      let dx = f * nx * travel,
        dy = f * ny * travel;
      const magnitude = Math.hypot(dx, dy);
      const attenuation = Math.min(1, MAX_OFFSET / Math.max(magnitude, 1e-6));
      dx *= attenuation;
      dy *= attenuation;
      maxOffset = Math.max(maxOffset, Math.hypot(dx, dy));
      displacement[offset] = 128 + (dx / MAX_OFFSET) * 127;
      displacement[offset + 1] = 128 + (dy / MAX_OFFSET) * 127;

      // Schlick Fresnel reflectance and a monochrome, directional rim lobe.
      const r0 = ((IOR - 1) / (IOR + 1)) ** 2;
      const fresnel = r0 + (1 - r0) * (1 - nz) ** 5;
      const light = Math.max(0, nx * -0.36 + ny * -0.48 + nz * 0.8);
      const rim = Math.sin(Math.PI * u) ** 2;
      const intensity = clamp((fresnel * 2 + light ** 24) * rim, 0, 1);
      highlight[offset] = highlight[offset + 1] = highlight[offset + 2] = 255;
      highlight[offset + 3] = Math.round(intensity * 255);
    }
  }
  return { width, height, displacement, highlight, maxOffset };
}

export function glassMotion(
  seed: number,
  milliseconds: number,
  velocity: number,
) {
  const t = milliseconds / 1000;
  const drift =
    Math.sin(t / 13 + phase(seed, 3)) * 0.65 +
    Math.sin(t / 23 + phase(seed, 4)) * 0.35;
  return {
    strength: clamp(
      0.74 + drift * 0.12 + Math.abs(clamp(velocity, -1, 1)) * 0.14,
      0.55,
      1,
    ),
    lightX: clamp(50 + drift * 8, 0, 100),
    lightY: clamp(40 + Math.sin(t / 19 + phase(seed, 5)) * 6, 0, 100),
  };
}
