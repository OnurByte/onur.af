type CountState =
  | { status: 'available'; count: number }
  | { status: 'disabled' | 'unavailable' };
export function viewCountLabel(hostname: string, state: CountState): string {
  const local =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('127.');
  if (local) return '- views';
  if (state.status === 'unavailable') return '- views';
  return `${(state.status === 'available' ? state.count : 0).toLocaleString('en-US')} views`;
}
