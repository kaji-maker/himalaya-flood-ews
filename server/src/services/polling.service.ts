/** Wait after completion, back off failed cycles, and cancel timers on shutdown. */
export function startPolling(task: () => Promise<boolean>, intervalMs: number,
  onError: (error: unknown) => void = () => {}) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let inFlight: Promise<void> = Promise.resolve();
  function launch() {
    inFlight = (async () => {
      try { failures = await task() ? 0 : failures + 1; }
      catch (error) { failures++; onError(error); }
      if (!stopped) timer = setTimeout(launch, intervalMs * Math.min(8, 2 ** failures));
    })();
  }
  launch();
  return { stop: async () => { stopped = true; if (timer) clearTimeout(timer); await inFlight; } };
}
