"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";
import { SITE_NAME } from "@/lib/siteConfig";
import { INSTALL_EVENT, useInstallPrompt } from "./useInstallPrompt";

const DISMISS_KEY = "nnh-install-dismissed-at";
const DISMISS_DAYS = 14;

export default function InstallPrompt() {
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstallPrompt();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    setMounted(true);
    const last = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    if (last && Date.now() - last < DISMISS_DAYS * 24 * 60 * 60 * 1000) setDismissed(true);

    const show = () => {
      setForceShow(true);
      setReady(true);
    };
    window.addEventListener(INSTALL_EVENT, show);
    return () => window.removeEventListener(INSTALL_EVENT, show);
  }, []);

  // Let the page settle before the automatic prompt slides in.
  useEffect(() => {
    if (dismissed || isStandalone) return;
    if (!canInstall && !isIOS) return;
    const timer = window.setTimeout(() => setReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, [canInstall, isIOS, dismissed, isStandalone]);

  const close = (remember: boolean) => {
    if (remember) {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setDismissed(true);
    }
    setForceShow(false);
    setReady(false);
  };

  const visible =
    mounted && ready && !isStandalone && (forceShow || ((canInstall || isIOS) && !dismissed));

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      setForceShow(false);
      setReady(false);
    }
  };

  const iosInstructions = isIOS && !canInstall;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="install-prompt"
          role="region"
          aria-label="Install app"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[55] md:inset-x-auto md:bottom-6 md:right-6 md:w-[22rem]"
        >
          <div className="rounded-2xl border border-amber-900/10 bg-white/90 p-4 shadow-xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-saffron to-saffron-dark text-white shadow-sm">
                <Download size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-maroon">
                  {iosInstructions ? "Add to Home Screen" : `Install ${SITE_NAME}`}
                </p>
                {iosInstructions ? (
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Tap <Share size={12} className="mx-0.5 inline -translate-y-0.5" /> Share, then choose{" "}
                    <span className="font-medium text-slate-700">Add to Home Screen</span>.
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Quick access from your home screen — even when the connection is slow.
                  </p>
                )}
              </div>
              <button
                onClick={() => close(true)}
                className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss install prompt"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => close(true)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                {iosInstructions ? "Got it" : "Not now"}
              </button>
              {!iosInstructions && canInstall && (
                <button onClick={install} className="btn-primary text-sm">
                  <Download size={15} /> Install
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
