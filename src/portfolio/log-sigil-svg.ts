import { logSigilGeometry } from './log-sigil';
export function logSigilSvg(
  id: string,
  color: 'currentColor' | '#fff' = 'currentColor',
  classes = 'log-sigil',
) {
  const geometry = logSigilGeometry(id);
  const point = (angle: number, radius: number) => {
    const radians = (angle * Math.PI) / 180;
    return `${80 + Math.cos(radians) * radius} ${80 + Math.sin(radians) * radius}`;
  };
  const arcPath = `M ${point(geometry.arcStart, 69)} A 69 69 0 1 1 ${point(geometry.arcEnd, 69)}`;
  const polygonPoints = Array.from(
    { length: geometry.innerSides },
    (_, index) => {
      const angle =
        geometry.innerRotation + (360 / geometry.innerSides) * index;
      return point(angle, geometry.innerRadius);
    },
  ).join(' ');
  const framePoints = Array.from({ length: geometry.frameSides }, (_, index) =>
    point(geometry.frameRotation + (360 / geometry.frameSides) * index, 73),
  ).join(' ');
  const frame = geometry.frameSides
    ? `<polygon points="${framePoints}" />`
    : '<circle cx="80" cy="80" r="73" />';
  const centerMark = [
    '<path d="M80 48 84 76 112 80 84 84 80 112 76 84 48 80 76 76Z" />',
    '<path d="M56 56 104 104M104 56 56 104" />',
    '<polygon points="80,46 89,71 114,80 89,89 80,114 71,89 46,80 71,71" />',
    '<circle cx="80" cy="80" r="17" /><circle cx="80" cy="80" r="7" />',
    `<polygon points="${point(270, 20)} ${point(342, 20)} ${point(54, 20)} ${point(126, 20)}" />`,
    '',
  ][geometry.centerMark]!;
  return `<svg
  class="${classes.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 160 160"
  fill="none"
  stroke="${color}"
  stroke-width="1.35"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  ${frame}
  <path d="${arcPath}" />
  ${geometry.innerRing ? '<circle cx="80" cy="80" r="61" />' : ''}
  ${geometry.spokes.map((spoke) => `<line x1="${spoke.x1}" y1="${spoke.y1}" x2="${spoke.x2}" y2="${spoke.y2}" />`).join('')}
  ${geometry.nodes.map((node) => `<circle cx="${node.x}" cy="${node.y}" r="${node.radius}" fill="${color}" stroke="none" />`).join('')}
  <circle cx="80" cy="80" r="43" />
  <polygon points="${polygonPoints}" />
  ${centerMark}
  <circle cx="80" cy="80" r="5" fill="${color}" stroke="none" />
</svg>

`;
}
