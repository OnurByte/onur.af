/** Runs a CLI entry point; a failure prints its message and sets a non-zero exit code. */
export function runCli(
  main: () => Promise<void>,
  fallbackMessage: string,
): void {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : fallbackMessage);
    process.exitCode = 1;
  });
}
