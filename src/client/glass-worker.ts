import { createGlassField } from '../portfolio/glass-optics';

export interface GlassMapRequest {
  id: number;
  geometry: Parameters<typeof createGlassField>[0];
  seed: number;
}
export type GlassMapResponse =
  | { id: number; blob: Blob; width: number; height: number }
  | { id: number; error: true };

globalThis.addEventListener(
  'message',
  (event: MessageEvent<GlassMapRequest>) => {
    const { id, geometry, seed } = event.data;
    void (async () => {
      try {
        const field = createGlassField(geometry, seed);
        const canvas = new OffscreenCanvas(field.width, field.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        const image = context.createImageData(field.width, field.height);
        image.data.set(field.displacement);
        context.putImageData(image, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        globalThis.postMessage({
          id,
          blob,
          width: geometry.width,
          height: geometry.height,
        });
      } catch {
        globalThis.postMessage({ id, error: true });
      }
    })();
  },
);
