"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker in production only.
 * Local dev is skipped on purpose so cached chunks never mask code changes.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => console.warn("[pwa] Service worker registration failed:", error));
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
