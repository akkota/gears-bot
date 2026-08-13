export function startIntervalWorker(
  tick: () => Promise<void>,
  intervalMs: number,
): () => void {
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  timer.unref?.();
  void tick();

  return () => {
    clearInterval(timer);
  };
}
