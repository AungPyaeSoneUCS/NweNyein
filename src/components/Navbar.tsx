"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  BookOpen,
  Music,
  Library,
  MoreHorizontal,
  History,
  Shield,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/siteConfig";
import { INSTALL_EVENT, useInstallPrompt } from "./pwa/useInstallPrompt";

const desktopLinks = [
  { href: "/", label: "Home" },
  { href: "/knowledge", label: "Read" },
  { href: "/history", label: "History" },
  { href: "/songs", label: "Songs" },
  { href: "/library", label: "Library" },
];

const bottomTabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/knowledge", label: "Read", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/songs", label: "Songs", icon: Music },
  { href: "/library", label: "Library", icon: Library },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { isStandalone } = useInstallPrompt();

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (moreOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  return (
    <>
      {/* Mobile compact top bar */}
      <header className="md:hidden sticky top-0 z-40 border-b border-amber-900/10 bg-white/80 backdrop-blur-lg">
        <div className="container-page flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-maroon">
            <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-dark text-white shadow-sm">☸</span>
            <span className="block font-myanmar text-xs leading-tight sm:text-sm">{SITE_NAME}</span>
          </Link>
          <button
            onClick={() => setMoreOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-maroon hover:bg-maroon/5"
            aria-label="More menu"
          >
            <MoreHorizontal size={22} />
          </button>
        </div>
      </header>

      {/* Desktop floating glassmorphic navbar */}
      <div className="hidden md:block sticky top-3 z-40 px-4">
        <header className="mx-auto max-w-6xl rounded-2xl border border-amber-200/60 bg-white/80 backdrop-blur-lg shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-maroon">
              <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-dark text-white shadow-sm">☸</span>
              <span className="block font-myanmar text-sm leading-tight lg:text-base">{SITE_NAME}</span>
            </Link>
            <nav className="flex items-center gap-1">
              {desktopLinks.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                      active ? "text-maroon" : "text-slate-600 hover:text-maroon"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="desktop-nav-pill"
                        className="absolute inset-0 rounded-full bg-amber-100/80 border border-amber-200/70"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{l.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-amber-900/10 bg-white/90 backdrop-blur-xl pb-safe">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5 pb-1">
          {bottomTabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-medium transition-colors",
                  active ? "text-maroon" : "text-slate-500"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-tab-pill"
                    className="absolute inset-x-2 top-0.5 bottom-0.5 rounded-xl bg-amber-100/70"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={20} className="relative z-10" strokeWidth={active ? 2.4 : 2} />
                <span className="relative z-10 leading-none mt-0.5">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Slide-up More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl border-t border-amber-900/10 bg-white/95 backdrop-blur-xl shadow-2xl pb-safe"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="mx-auto max-w-lg px-5 pt-3 pb-6">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-maroon">More</h3>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/admin"
                    className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-amber-900/10 bg-ivory/60 px-4 py-3 text-charcoal hover:bg-amber-50/60"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-saffron/10 text-saffron-dark"><Shield size={20} /></span>
                    <span>
                      <span className="block font-medium">Admin Portal</span>
                      <span className="block text-xs text-slate-500">Manage posts and media</span>
                    </span>
                  </Link>
                  {!isStandalone && (
                    <button
                      onClick={() => {
                        setMoreOpen(false);
                        window.dispatchEvent(new Event(INSTALL_EVENT));
                      }}
                      className="flex w-full min-h-[52px] items-center gap-3 rounded-2xl border border-amber-900/10 bg-ivory/60 px-4 py-3 text-left text-charcoal hover:bg-amber-50/60"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-saffron/15 text-saffron-dark"><Download size={20} /></span>
                      <span>
                        <span className="block font-medium">Install App</span>
                        <span className="block text-xs text-slate-500">Add {SITE_NAME} to your home screen</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
