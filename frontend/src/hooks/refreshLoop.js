// One refresh loop per mounted data view; requests never overlap.
export function createRefreshLoop(load, { interval = 10000, immediate = true, environment = globalThis, onError = () => {} } = {}) {
  const { document, window } = environment;
  const controller = new environment.AbortController();
  let active = true, busy = false, initial = true, pending = false;
  const isCurrent = () => active && !controller.signal.aborted;
  const refresh = async () => {
    if (!active || busy || document.hidden) return;
    busy = true;
    const first = initial;
    initial = false;
    try { await load({ signal: controller.signal, isCurrent, initial: first }); }
    catch (error) { if (isCurrent()) onError(error); }
    finally {
      busy = false;
      if (pending && isCurrent()) {
        pending = false;
        refresh();
      }
    }
  };
  const changed = () => {
    if (busy) pending = true;
    else refresh();
  };
  const storageChanged = event => {
    if (event.key === 'data:last-change') changed();
  };
  if (immediate) refresh();
  const timer = environment.setInterval(refresh, interval);
  window.addEventListener('focus', refresh);
  window.addEventListener('data:changed', changed);
  window.addEventListener('storage', storageChanged);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    active = false;
    controller.abort();
    environment.clearInterval(timer);
    window.removeEventListener('focus', refresh);
    window.removeEventListener('data:changed', changed);
    window.removeEventListener('storage', storageChanged);
    document.removeEventListener('visibilitychange', refresh);
  };
}
