import { expect, test } from 'bun:test';
import { createGlassField, glassMotion } from '../src/portfolio/glass-optics';

test('optical fields are reproducible per seed and differ between visits', () => {
  const geometry = { width: 180, height: 56, radius: 12 };
  const first = createGlassField(geometry, 17);
  expect(first.displacement).toEqual(
    createGlassField(geometry, 17).displacement,
  );
  expect(first.displacement).not.toEqual(
    createGlassField(geometry, 18).displacement,
  );
});

test('the reading plateau stays optically neutral and the edge is bounded', () => {
  const field = createGlassField({ width: 180, height: 56, radius: 12 }, 41);
  const center = (28 * field.width + 90) * 4;
  expect(field.displacement[center]).toBe(128);
  expect(field.displacement[center + 1]).toBe(128);
  expect(field.maxOffset).toBeGreaterThan(0.1);
  expect(field.maxOffset).toBeLessThanOrEqual(0.6);
  expect([...field.displacement].every(Number.isFinite)).toBe(true);
  const belowBorder = (5 * field.width + 90) * 4;
  expect(field.displacement[belowBorder]).toBe(128);
  expect(field.displacement[belowBorder + 1]).toBe(128);
});

test('constant-pixel bezel does not stretch with navbar aspect ratio', () => {
  for (const width of [280, 984]) {
    const field = createGlassField({ width, height: 64, radius: 12 }, 41);
    const plateau = (16 * field.width + Math.floor(width / 2)) * 4;
    expect(field.displacement[plateau]).toBe(128);
    expect(field.displacement[plateau + 1]).toBe(128);
  }
});

test('motion is continuous, bounded and responds to scroll inputs', () => {
  const rest = glassMotion(17, 1000, 0);
  const next = glassMotion(17, 1001, 0);
  expect(Math.abs(rest.strength - next.strength)).toBeLessThan(0.01);
  expect(rest).not.toEqual(glassMotion(17, 1000, 1));
  for (const time of [0, 1000, 30000, 1e9]) {
    const state = glassMotion(17, time, 100);
    expect(state.strength).toBeGreaterThanOrEqual(0.55);
    expect(state.strength).toBeLessThanOrEqual(1);
    expect(state.lightX).toBeGreaterThanOrEqual(0);
    expect(state.lightX).toBeLessThanOrEqual(100);
    expect(Number.isFinite(state.lightY)).toBe(true);
  }
});

test('invalid geometry is rejected before allocating pixel buffers', () => {
  for (const width of [0, -1, NaN, Infinity, 100000]) {
    expect(() =>
      createGlassField({ width, height: 64, radius: 12 }, 1),
    ).toThrow();
  }
});

test('high-density sampling adds edge detail without changing optical dimensions', () => {
  const field = createGlassField(
    { width: 180, height: 56, radius: 12, resolution: 2 },
    41,
  );
  expect(field.width).toBe(360);
  expect(field.height).toBe(112);
  const center = (56 * field.width + 180) * 4;
  expect(field.displacement[center]).toBe(128);
  expect(field.displacement[center + 1]).toBe(128);
  expect(field.maxOffset).toBeLessThanOrEqual(0.6);
  expect(() =>
    createGlassField(
      { width: 180, height: 56, radius: 12, resolution: Infinity },
      41,
    ),
  ).toThrow();
});

test('tall panel maps keep a neutral plateau with a bounded allocation', () => {
  const field = createGlassField(
    { width: 296, height: 640, radius: 12, resolution: 2 },
    71,
  );
  expect(field.width * field.height).toBeLessThanOrEqual(2097152);
  const center = (640 * field.width + 296) * 4;
  expect(field.displacement[center]).toBe(128);
  expect(field.displacement[center + 1]).toBe(128);
  expect(field.maxOffset).toBeLessThanOrEqual(0.6);
  expect(() =>
    createGlassField({ width: 2048, height: 2048, radius: 12 }, 71),
  ).toThrow();
});

test('interleaved glass seeds preserve deterministic motion', () => {
  const first = glassMotion(17, 5000, 0.2);
  glassMotion(18, 9000, 0.8);
  expect(glassMotion(17, 5000, 0.2)).toEqual(first);
});
