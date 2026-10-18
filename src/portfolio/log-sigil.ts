export type LogSigilGeometry = {
  spokes: { x1: number; y1: number; x2: number; y2: number }[];
  nodes: { x: number; y: number; radius: number }[];
  innerRotation: number;
  innerSides: number;
  innerRadius: number;
  frameSides: number;
  frameRotation: number;
  innerRing: boolean;
  centerMark: number;
  arcStart: number;
  arcEnd: number;
};

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

/** Stable geometry for a Log entry's visual seal. */
export function logSigilGeometry(id: string): LogSigilGeometry {
  const [frameWord = '', motifWord = '', actionWord = ''] = id.split('-');
  let seed = hash(id);

  const random = () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const center = 80;
  const spokeCount =
    actionWord === 'turns'
      ? 12
      : actionWord === 'waits'
        ? 8
        : actionWord === 'endures'
          ? 10
          : 4 + (hash(`${id}:spokes`) % 13);
  const spokeOffset =
    actionWord === 'waits' ? 0 : random() * (360 / spokeCount);
  const spokes = Array.from({ length: spokeCount }, (_, index) => {
    const angle = ((spokeOffset + (360 / spokeCount) * index) * Math.PI) / 180;
    const inner = 54 + random() * 8;
    const outer = 67 + random() * 5;
    return {
      x1: center + Math.cos(angle) * inner,
      y1: center + Math.sin(angle) * inner,
      x2: center + Math.cos(angle) * outer,
      y2: center + Math.sin(angle) * outer,
    };
  });

  const nodeCount = hash(`${id}:nodes`) % 13;
  const nodeOffset = nodeCount ? random() * (360 / nodeCount) : 0;
  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const angle = ((nodeOffset + (360 / nodeCount) * index) * Math.PI) / 180;
    const radius = 55 + random() * 7;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      radius: 1.25 + random() * 0.8,
    };
  });

  return {
    spokes,
    nodes,
    innerRotation: Math.floor(random() * 30),
    innerSides:
      motifWord === 'lodge'
        ? 6
        : motifWord === 'compass'
          ? 4
          : motifWord === 'oath'
            ? 3
            : 4 + Math.floor(random() * 5),
    innerRadius: 25 + random() * 8,
    frameSides: [0, 4, 5, 6, 7, 8, 9][hash(`${id}:frame`) % 7]!,
    frameRotation: Math.floor(random() * 360),
    innerRing: hash(`${id}:ring`) % 2 === 0,
    centerMark: hash(`${id}:mark`) % 6,
    arcStart:
      frameWord === 'sealed'
        ? 18
        : frameWord === 'veiled'
          ? 92
          : frameWord === 'hidden'
            ? 180
            : 12 + random() * 32,
    arcEnd:
      frameWord === 'sealed'
        ? 142
        : frameWord === 'veiled'
          ? 256
          : frameWord === 'hidden'
            ? 332
            : 276 + random() * 48,
  };
}
