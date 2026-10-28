// One refresh loop per mounted data view; requests never overlap.
export function createRefreshLoop(load, { interval = 10000, immediate = true, environment = globalThis, onError = () => {} } = {}) {
  const { document, window } = environment;
  const controller = new environment.AbortController();
  let active = true, busy = false, initial = true;
  const isCurrent = () => active && !controller.signal.aborted;
  const refresh = async () => {
    if (!active || busy || document.hidden) return;
    busy = true;
    const first = initial;
    initial = false;
    try { await load({ signal: controller.signal, isCurrent, initial: first }); }
    catch (error) { if (isCurrent()) onError(error); }
    finally { busy = false; }
  };
  if (immediate) refresh();
  const timer = environment.setInterval(refresh, interval);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    active = false;
    controller.abort();
    environment.clearInterval(timer);
    window.removeEventListener('focus', refresh);
    document.removeEventListener('visibilitychange', refresh);
  };
}
