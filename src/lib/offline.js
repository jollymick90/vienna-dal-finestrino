export function monitorOffline(notify) {
  let disposed = false;
  let registration;
  const report = (ready, error = false) => {
    if (!disposed) notify({ ready, error });
  };
  async function check() {
    const worker = navigator.serviceWorker.controller;
    if (!worker) {
      report(false);
      return;
    }
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      report(false, true);
    }, 5000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      report(event.data.ready);
    };
    worker.postMessage({ type: "CHECK_OFFLINE" }, [channel.port2]);
  }
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) {
    report(false, true);
    return () => {};
  }
  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      registration = reg;
      if (disposed) return;
      check();
      reg.addEventListener("updatefound", () => {
        reg.installing?.addEventListener("statechange", check);
      });
    })
    .catch(() => report(false, true));
  navigator.serviceWorker.addEventListener("controllerchange", check);
  document.addEventListener("visibilitychange", check);
  window.addEventListener("online", check);
  const interval = setInterval(check, 30000);
  return () => {
    disposed = true;
    clearInterval(interval);
    navigator.serviceWorker.removeEventListener("controllerchange", check);
    document.removeEventListener("visibilitychange", check);
    window.removeEventListener("online", check);
    registration = null;
  };
}
