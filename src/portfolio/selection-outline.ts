import { required } from './required';
export interface SelectionBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface Point {
  x: number;
  y: number;
}
export function selectionOutline(
  input: readonly SelectionBox[],
  radius: number,
): string {
  const rows: SelectionBox[] = [];
  for (const box of [...input].sort(
    (a, b) => a.top - b.top || a.left - b.left,
  )) {
    if (box.right <= box.left || box.bottom <= box.top) continue;
    const previous = rows.at(-1);
    if (
      previous &&
      Math.min(previous.bottom, box.bottom) - Math.max(previous.top, box.top) >=
        Math.min(previous.bottom - previous.top, box.bottom - box.top) * 0.45
    ) {
      previous.left = Math.min(previous.left, box.left);
      previous.right = Math.max(previous.right, box.right);
      previous.top = Math.min(previous.top, box.top);
      previous.bottom = Math.max(previous.bottom, box.bottom);
    } else rows.push({ ...box });
  }
  if (!rows.length) return '';
  const rectangles = [...rows];
  for (let i = 1; i < rows.length; i++) {
    const a = required(rows[i - 1]),
      b = required(rows[i]);
    const gap = b.top - a.bottom;
    if (gap > 0 && gap <= Math.max(a.bottom - a.top, b.bottom - b.top) * 1.5) {
      const left = Math.max(a.left, b.left),
        right = Math.min(a.right, b.right);
      rectangles.push({
        left: left < right ? left : Math.min(a.left, b.left),
        right: left < right ? right : Math.max(a.right, b.right),
        top: a.bottom,
        bottom: b.top,
      });
    }
  }
  const xs = [...new Set(rectangles.flatMap((r) => [r.left, r.right]))].sort(
      (a, b) => a - b,
    ),
    ys = [...new Set(rectangles.flatMap((r) => [r.top, r.bottom]))].sort(
      (a, b) => a - b,
    );
  const cells = new Set<string>();
  const key = (x: number, y: number) => `${String(x)},${String(y)}`;
  for (let y = 0; y < ys.length - 1; y++)
    for (let x = 0; x < xs.length - 1; x++) {
      const cx = (required(xs[x]) + required(xs[x + 1])) / 2,
        cy = (required(ys[y]) + required(ys[y + 1])) / 2;
      if (
        rectangles.some(
          (r) => cx > r.left && cx < r.right && cy > r.top && cy < r.bottom,
        )
      )
        cells.add(key(x, y));
    }
  const edges = new Map<string, { from: Point; to: Point }>();
  function edge(x: number, y: number, xx: number, yy: number): void {
    const from = { x: required(xs[x]), y: required(ys[y]) },
      to = { x: required(xs[xx]), y: required(ys[yy]) };
    edges.set(key(from.x, from.y), { from, to });
  }
  for (let y = 0; y < ys.length - 1; y++)
    for (let x = 0; x < xs.length - 1; x++) {
      if (!cells.has(key(x, y))) continue;
      if (!cells.has(key(x, y - 1))) edge(x, y, x + 1, y);
      if (!cells.has(key(x + 1, y))) edge(x + 1, y, x + 1, y + 1);
      if (!cells.has(key(x, y + 1))) edge(x + 1, y + 1, x, y + 1);
      if (!cells.has(key(x - 1, y))) edge(x, y + 1, x, y);
    }
  const paths: string[] = [];
  while (edges.size) {
    const first = required(edges.values().next().value);
    const points: Point[] = [];
    let current: typeof first | undefined = first;
    while (current) {
      points.push(current.from);
      edges.delete(key(current.from.x, current.from.y));
      current = edges.get(key(current.to.x, current.to.y));
      if (current === first) break;
    }
    const corners = points.filter((point, i) => {
      const a = required(points[(i + points.length - 1) % points.length]),
        b = required(points[(i + 1) % points.length]);
      return !(
        (a.x === point.x && point.x === b.x) ||
        (a.y === point.y && point.y === b.y)
      );
    });
    if (corners.length < 3) continue;
    const rounded = corners.map((point, i) => {
      const before = required(
          corners[(i + corners.length - 1) % corners.length],
        ),
        after = required(corners[(i + 1) % corners.length]);
      const beforeLength = Math.hypot(before.x - point.x, before.y - point.y),
        afterLength = Math.hypot(after.x - point.x, after.y - point.y);
      const r = Math.min(radius, beforeLength / 2, afterLength / 2);
      return {
        point,
        start: {
          x: point.x + ((before.x - point.x) * r) / beforeLength,
          y: point.y + ((before.y - point.y) * r) / beforeLength,
        },
        end: {
          x: point.x + ((after.x - point.x) * r) / afterLength,
          y: point.y + ((after.y - point.y) * r) / afterLength,
        },
      };
    });
    const coord = (p: Point) => `${String(p.x)} ${String(p.y)}`;
    paths.push(
      rounded
        .map(
          (r, i) =>
            `${i ? 'L' : 'M'}${coord(r.start)} Q${coord(r.point)} ${coord(r.end)}`,
        )
        .join(' ') + ' Z',
    );
  }
  return paths.join(' ');
}
