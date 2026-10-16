import { logSigilGeometry } from './log-sigil';
export function logSigilSvg(
  id: string,
  color: 'currentColor' | '#fff' = 'currentColor',
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
  return `<svg
  class="log-sigil"
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
  <circle cx="80" cy="80" r="73" />
  <path d="${arcPath}" />
  <circle cx="80" cy="80" r="61" />
  ${geometry.spokes.map((spoke) => `<line x1="${spoke.x1}" y1="${spoke.y1}" x2="${spoke.x2}" y2="${spoke.y2}" />`).join('')}
  ${geometry.nodes.map((node) => `<circle cx="${node.x}" cy="${node.y}" r="${node.radius}" fill="${color}" stroke="none" />`).join('')}
  <circle cx="80" cy="80" r="43" />
  <polygon points="${polygonPoints}" />
  <path d="M80 48 84 76 112 80 84 84 80 112 76 84 48 80 76 76Z" />
  <circle cx="80" cy="80" r="5" fill="${color}" stroke="none" />
</svg>

`;
}
