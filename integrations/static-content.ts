import type { AstroIntegration } from 'astro';

const contentRoutes = new Set([
  'src/pages/log.astro',
  'src/pages/log/[id].astro',
  'src/pages/log/tag/[tag].astro',
  'src/pages/pgp/[proof].astro',
  'src/pages/search-index.json.ts',
]);

export default function staticContent({
  immutableDeployment,
  canonicalOrigin,
}: {
  immutableDeployment: boolean;
  canonicalOrigin: string | undefined;
}): AstroIntegration {
  return {
    name: 'static-content',
    hooks: {
      'astro:route:setup': ({ route }) => {
        // Local publishing needs request-time locks; a missing site origin also
        // needs the request host for sharing. Only immutable cloud builds opt in.
        if (
          immutableDeployment &&
          canonicalOrigin &&
          contentRoutes.has(route.component)
        )
          route.prerender = true;
      },
    },
  };
}
