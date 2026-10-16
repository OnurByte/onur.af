import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { parseLog } from '../src/portfolio/log';
import { prepareLogImages, type LogImages } from '../src/portfolio/log-images';

export default function logImages(): AstroIntegration {
  let manifest: LogImages = {};
  let source: string;
  let publicDirectory: string;
  const virtualId = '\0virtual:log-images';
  const regenerate = async () => {
    manifest = await prepareLogImages(
      parseLog(JSON.parse(await readFile(source, 'utf8'))),
      publicDirectory,
    );
  };
  return {
    name: 'log-images',
    hooks: {
      'astro:config:setup': async ({ config, updateConfig }) => {
        source = fileURLToPath(new URL('src/content/log.json', config.root));
        publicDirectory = fileURLToPath(config.publicDir);
        await regenerate();
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'log-image-manifest',
                resolveId(id) {
                  if (id === 'virtual:log-images') return virtualId;
                  return null;
                },
                load(id) {
                  if (id === virtualId)
                    return `export default ${JSON.stringify(manifest)};`;
                  return null;
                },
              },
            ],
          },
        });
      },
      'astro:server:setup': ({ server, logger }) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let running = false;
        let pending = false;
        const refresh = async () => {
          pending = true;
          if (running) return;
          running = true;
          try {
            while (pending) {
              pending = false;
              await regenerate();
            }
            const module = server.moduleGraph.getModuleById(virtualId);
            if (module) server.moduleGraph.invalidateModule(module);
            server.ws.send({ type: 'full-reload' });
          } catch (error) {
            logger.error(String(error));
          } finally {
            running = false;
          }
        };
        const watch = (path: string) => {
          if (
            path !== source &&
            !(
              path.startsWith(publicDirectory) &&
              !path.startsWith(`${publicDirectory}log-media/`)
            )
          )
            return;
          clearTimeout(timer);
          timer = setTimeout(() => void refresh(), 150);
        };
        server.watcher.on('add', watch).on('change', watch).on('unlink', watch);
        server.httpServer?.once('close', () => {
          clearTimeout(timer);
          server.watcher
            .off('add', watch)
            .off('change', watch)
            .off('unlink', watch);
        });
      },
    },
  };
}
