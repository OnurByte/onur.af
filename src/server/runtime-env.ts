/** Reads a variable from the live process, falling back to the build-time Vite env. */
export function runtimeEnv(name: string): string | undefined {
  return process.env[name] ?? import.meta.env[name];
}
