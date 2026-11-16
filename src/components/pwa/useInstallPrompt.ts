"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// A single deferred prompt is shared by every component that asks to install.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisSession = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedThisSession = true;
    notify();
  });
}

function detectStandalone() {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return media || iosStandalone || installedThisSession;
}

function detectIOS() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua);
  const iPadOS = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return (iOS || iPadOS) && !/crios|fxios|edgios/i.test(ua);
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const sync = () => {
      setCanInstall(!!deferredPrompt);
      setIsStandalone(detectStandalone());
    };
    sync();
    setIsIOS(detectIOS());
    listeners.add(sync);

    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener?.("change", sync);

    return () => {
      listeners.delete(sync);
      media.removeEventListener?.("change", sync);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    const prompt = deferredPrompt;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt = null;
      installedThisSession = true;
    }
    notify();
    return outcome;
  }, []);

  return { canInstall, isStandalone, isIOS, promptInstall };
}

export const INSTALL_EVENT = "pwa:show-install";
