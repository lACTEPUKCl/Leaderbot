export function startBackgroundTask(name, task, {
  intervalMs = 30000, stopAfterSuccess = false, logger = console,
} = {}) {
  let running = false;
  let stopped = false;
  const run = async () => {
    if (running || stopped) return;
    running = true;
    try {
      await task();
      if (stopAfterSuccess) stop();
    } catch (error) {
      logger.error(`[background] ${name} failed: ${error.code || error.name}; will retry`);
    } finally { running = false; }
  };
  const timer = setInterval(run, intervalMs);
  timer.unref();
  function stop() { stopped = true; clearInterval(timer); }
  logger.info(`[background] ${name} started`);
  void run();
  return { run, stop };
}
