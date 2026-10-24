import { vitalPage, vitalSchema } from '../portfolio/vitals';
export function startVitals() {
  const page = vitalPage(location.pathname);
  if (!page) return;
  void import('web-vitals')
    .then(({ onLCP, onINP, onTTFB }) => {
      const report = (metric: { name: string; value: number }) => {
        const parsed = vitalSchema.safeParse({
          name: metric.name,
          value: metric.value,
          page,
        });
        if (!parsed.success) return;
        void fetch('/vitals.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
          credentials: 'omit',
          keepalive: true,
        }).catch(() => {
          /* Observations never block navigation. */
        });
      };
      onLCP(report);
      onINP(report);
      onTTFB(report);
    })
    .catch(() => {
      /* Observations never block navigation. */
    });
}
