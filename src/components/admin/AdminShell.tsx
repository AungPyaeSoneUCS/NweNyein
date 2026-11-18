"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, BookOpen, History, Image as ImageIcon, Music, Library,
  LogOut, ExternalLink, Menu, X, PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/siteConfig";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/admin/history", label: "History", icon: History },
  { href: "/admin/activities", label: "Activities", icon: ImageIcon },
  { href: "/admin/songs", label: "Songs", icon: Music },
  { href: "/admin/library", label: "Library", icon: Library },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const current = useMemo(() => navItems.find((n) => isActive(pathname, n.href)) || navItems[0], [pathname]);

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn("flex gap-1", mobile ? "flex-col" : "flex-col px-3 py-4")}>
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active ? "text-maroon" : "text-slate-600 hover:text-maroon hover:bg-slate-100/80",
              mobile && "px-4"
            )}
          >
            {active && (
              <motion.span
                layoutId={mobile ? "admin-nav-mobile" : "admin-nav-desktop"}
                className="absolute inset-0 rounded-xl border border-amber-200/70 bg-amber-100/70"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon size={18} className="relative z-10" />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200/80 px-5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-maroon to-maroon-light text-white shadow-sm">☸</span>
          <div className="leading-tight">
            <p className="max-w-[12rem] truncate text-sm font-semibold text-maroon font-myanmar">{SITE_NAME}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Admin CMS</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto"><NavLinks /></div>
        <div className="space-y-1 border-t border-slate-200/80 p-3">
          <Link href="/" className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-maroon">
            <ExternalLink size={18} /> View Live Site
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/admin/login" })} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={() => setOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 font-semibold text-maroon">
            <current.icon size={18} className="text-saffron-dark" />
            <span>{current.label}</span>
          </div>
          <Link href="/admin/knowledge" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-saffron-dark hover:bg-amber-50" aria-label="Quick create">
            <PlusCircle size={22} />
          </Link>
        </div>
        {/* horizontal scrollable quick tabs */}
        <div className="flex gap-2 overflow-x-auto border-t border-slate-200/70 px-3 py-2 no-scrollbar">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("relative inline-flex min-h-[40px] flex-none items-center gap-2 rounded-full px-3 text-xs font-medium", active ? "text-maroon" : "text-slate-600 bg-slate-100") }>
                {active && <motion.span layoutId="admin-mobile-chip" className="absolute inset-0 rounded-full border border-amber-200/70 bg-amber-100/80" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                <Icon size={15} className="relative z-10" /><span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs border-r border-slate-200 bg-white shadow-2xl lg:hidden" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }}>
              <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-maroon text-white">☸</span>
                  <span className="text-sm font-semibold text-maroon">Admin CMS</span>
                </div>
                <button onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Close menu"><X size={20} /></button>
              </div>
              <div className="overflow-y-auto p-3"><NavLinks mobile /></div>
              <div className="absolute inset-x-0 bottom-0 space-y-1 border-t border-slate-200 bg-white p-3 pb-safe">
                <Link href="/" className="flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"><ExternalLink size={18} /> View Live Site</Link>
                <button onClick={() => signOut({ callbackUrl: "/admin/login" })} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"><LogOut size={18} /> Logout</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="lg:pl-64">
        <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
