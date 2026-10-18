import { expect, test } from 'bun:test';
import {
  createSpectralField,
  glassProfile,
  projectGlassOffset,
} from '../src/portfolio/glass-random';

test('seeded spectral samples reproduce and analytic derivatives match finite differences', () => {
  const field = createSpectralField(71);
  expect(field.sample(17, 33, 4)).toEqual(
    createSpectralField(71).sample(17, 33, 4),
  );
  expect(field.sample(17, 33, 4)).not.toEqual(
    createSpectralField(72).sample(17, 33, 4),
  );
  const point = field.sample(17, 33, 4),
    e = 1e-4;
  expect(point.dx).toBeCloseTo(
    (field.sample(17 + e, 33, 4).value - field.sample(17 - e, 33, 4).value) /
      (2 * e),
    7,
  );
  expect(point.dy).toBeCloseTo(
    (field.sample(17, 33 + e, 4).value - field.sample(17, 33 - e, 4).value) /
      (2 * e),
    7,
  );
  expect(point.dt).toBeCloseTo(
    (field.sample(17, 33, 4 + e).value - field.sample(17, 33, 4 - e).value) /
      (2 * e),
    7,
  );
  expect(Math.abs(point.value)).toBeLessThan(1);
});

test('positive spectral weights yield a symmetric positive semidefinite covariance', () => {
  const field = createSpectralField(71);
  const points = [
    [0, 0, 0],
    [20, 70, 5],
    [100, -30, 20],
    [-10, 14, 41],
  ];
  expect(field.covariance(0, 0, 0)).toBeCloseTo(1, 12);
  expect(field.covariance(20, 70, 5)).toBeCloseTo(
    field.covariance(-20, -70, -5),
    12,
  );
  for (let lane = 0; lane < 50; lane++) {
    const vector = points.map((_, i) => Math.sin((lane + 1) * (i + 1)));
    let quadratic = 0;
    points.forEach((p, i) =>
      points.forEach((q, j) => {
        quadratic +=
          vector[i]! *
          vector[j]! *
          field.covariance(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
      }),
    );
    expect(quadratic).toBeGreaterThanOrEqual(-1e-12);
  }
});

test('Hermite profile and compact envelope join with zero first and second derivatives', () => {
  for (const u of [0, 1]) {
    const profile = glassProfile(u);
    expect(profile.height).toBe(u);
    expect(Math.abs(profile.slope)).toBe(0);
    expect(Math.abs(profile.curvature)).toBe(0);
    expect(Math.abs(profile.envelope)).toBe(0);
    expect(Math.abs(profile.envelopeSlope)).toBe(0);
    expect(Math.abs(profile.envelopeCurvature)).toBe(0);
  }
});

test('disk projection is bounded and non-expansive under large random-like inputs', () => {
  for (let i = 0; i < 1000; i++) {
    const a = [Math.sin(i) * 10, Math.cos(i * 3) * 10];
    const b = [Math.sin(i + 0.01) * 10, Math.cos(i * 3 + 0.01) * 10];
    const p = projectGlassOffset(a[0]!, a[1]!),
      q = projectGlassOffset(b[0]!, b[1]!);
    expect(Math.hypot(...p)).toBeLessThanOrEqual(0.6 + 1e-12);
    expect(Math.hypot(p[0] - q[0], p[1] - q[1])).toBeLessThanOrEqual(
      Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!) + 1e-12,
    );
  }
});
