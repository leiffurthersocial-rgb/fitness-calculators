"use client";

import { useEffect } from "react";

/**
 * The app previously installed a caching service worker. After moving to real
 * per-tool routes that cache could serve stale HTML and break navigation, so
 * we no longer register one — and we actively tear down any worker/caches a
 * returning visitor still has, which un-sticks them on the next load.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => keys.forEach((k) => caches.delete(k)))
        .catch(() => {});
    }
  }, []);
  return null;
}
