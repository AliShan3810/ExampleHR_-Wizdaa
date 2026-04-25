let startPromise: Promise<void> | null = null;

/**
 * Ensures MSW `worker.start()` runs only once. React 18 Strict Mode runs
 * effects twice in development; a second `start()` is redundant and can race
 * the first registration.
 */
export function startBrowserMocks(): Promise<void> {
  if (!startPromise) {
    startPromise = (async () => {
      const { worker } = await import("./browser");
      await worker.start({ onUnhandledRequest: "bypass" });
    })();
  }
  return startPromise;
}
