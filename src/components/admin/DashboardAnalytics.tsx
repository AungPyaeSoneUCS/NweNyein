"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Database, HardDrive, Copy, Check, FileText, Image as ImageIcon, Music, BookOpen, History, Activity, ShieldCheck, X } from "lucide-react";

function fmtBytes(bytes: number) {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function maskId(id?: string) {
  if (!id) return "Not set";
  if (id.length <= 10) return "••••••";
  return `${id.slice(0, 4)}••••${id.slice(-4)}`;
}

type Props = {
  mongo: {
    knowledge: { total: number; published: number; draft: number; latest: string | null };
    history: { total: number; published: number; draft: number; latest: string | null };
    activity: { total: number; published: number; draft: number; latest: string | null };
  };
  drive: {
    configured: {
      authMode?: string;
      oauthConfigured?: boolean;
      serviceAccountConfigured: boolean;
      folders: { photos: string; songs: string; books: string };
    };
    error: string | null;
    photos: { count: number; bytes: number };
    songs: { count: number; bytes: number };
    books: { count: number; bytes: number; pdf: number; docx: number };
  };
  recentPosts: { id: string; kind: string; title: string; type: string; status: string; date: string }[];
};

type VerifyResult = {
  ok: boolean;
  authMode: string;
  user: string | null;
  canUpload: boolean;
  folders: Record<string, { id: string; ok: boolean; error?: string }>;
  error?: string;
};

export default function DashboardAnalytics({ mongo, drive, recentPosts }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const cards = useMemo(() => [
    {
      title: "Knowledge Posts",
      icon: FileText,
      value: mongo.knowledge.total,
      lines: [`Published: ${mongo.knowledge.published} · Draft: ${mongo.knowledge.draft}`, `Latest: ${mongo.knowledge.latest ? new Date(mongo.knowledge.latest).toLocaleDateString() : "—"}`],
      accent: "text-amber-700 bg-amber-100",
    },
    {
      title: "History Entries",
      icon: History,
      value: mongo.history.total,
      lines: [`Timeline milestones: ${mongo.history.published}`, `Last updated: ${mongo.history.latest ? new Date(mongo.history.latest).toLocaleString() : "—"}`],
      accent: "text-maroon bg-maroon/10",
    },
    {
      title: "Activities & Events",
      icon: Activity,
      value: mongo.activity.total,
      lines: [`Published: ${mongo.activity.published} · Draft: ${mongo.activity.draft}`, `Photo albums linked: ${mongo.activity.total}`],
      accent: "text-orange-700 bg-orange-100",
    },
    {
      title: "Dhamma Songs",
      icon: Music,
      value: drive.songs.count,
      lines: [`Google Drive audio files`, `Storage: ${fmtBytes(drive.songs.bytes)}`],
      accent: "text-saffron-dark bg-saffron/10",
    },
    {
      title: "Library Books",
      icon: BookOpen,
      value: drive.books.count,
      lines: [`PDF: ${drive.books.pdf} · DOC/DOCX: ${drive.books.docx}`, `Storage: ${fmtBytes(drive.books.bytes)}`],
      accent: "text-slate-700 bg-slate-100",
    },
    {
      title: "Photo Gallery",
      icon: ImageIcon,
      value: drive.photos.count,
      lines: [`Images in Photos folder`, `Storage: ${fmtBytes(drive.photos.bytes)}`],
      accent: "text-emerald-700 bg-emerald-100",
    },
  ], [mongo, drive]);

  async function sync() {
    setSyncing(true); setToast(null);
    try {
      const res = await fetch("/api/admin/revalidate-drive", { method: "POST" });
      if (!res.ok) throw new Error();
      setToast("Drive media cache synced successfully.");
    } catch {
      setToast("Failed to sync Drive cache.");
    } finally {
      setSyncing(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function testDrive() {
    setVerifying(true); setToast(null); setVerifyResult(null);
    try {
      const res = await fetch("/api/admin/drive/status", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setVerifyResult(data.live as VerifyResult);
    } catch (e: any) {
      setVerifyResult({
        ok: false,
        authMode: drive.configured.authMode || "none",
        user: null,
        canUpload: false,
        folders: {},
        error: e?.message || "Connection test failed",
      });
    } finally {
      setVerifying(false);
    }
  }

  async function copy(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); } catch {}
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.title} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-600">{c.title}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{c.value}</p>
                </div>
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${c.accent}`}><Icon size={20} /></span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {c.lines.map((l) => <p key={l}>{l}</p>)}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Drive sync & health */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Google Drive Sync & Health</h2>
            <p className="mt-1 text-sm text-slate-600">Connection status, folder configuration, and media cache controls.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {toast && <span className="text-sm text-slate-700">{toast}</span>}
            <button onClick={testDrive} disabled={verifying} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              <ShieldCheck size={16} /> {verifying ? "Testing..." : "Test Drive Connection"}
            </button>
            <button onClick={sync} disabled={syncing} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-maroon px-4 py-2 text-sm font-medium text-white hover:bg-maroon-light disabled:opacity-60">
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing..." : "Sync All Drive Media"}
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Database size={16} className="text-emerald-600" /> MongoDB Atlas</p>
            <p className="mt-2 text-sm text-slate-600">Status: <span className="font-medium text-emerald-700">Connected (server runtime)</span></p>
            <p className="mt-1 text-xs text-slate-500">Connection cached for serverless functions.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><HardDrive size={16} className={(drive.configured.oauthConfigured || drive.configured.serviceAccountConfigured) ? "text-emerald-600" : "text-amber-600"} /> Google Drive Authentication</p>
            <p className="mt-2 text-sm text-slate-600">Mode: <span className="font-medium text-slate-800">{drive.configured.authMode === "oauth" ? "OAuth 2.0 (User/Owner quota)" : drive.configured.authMode === "service_account" ? "Service Account" : "Not configured"}</span></p>
            <p className="mt-1 text-xs text-slate-500">{drive.configured.authMode === "oauth" ? "Recommended for personal My Drive uploads." : drive.configured.authMode === "service_account" ? "Use for Shared Drives; My Drive uploads may fail without owner quota." : "Set OAuth or Service Account credentials in environment."}</p>
            {(drive.configured as any).oauthPartial && (
              <p className="mt-1 text-xs text-amber-700">OAuth is only partially configured — fill all three GOOGLE_OAUTH_* values or the app falls back to the service account.</p>
            )}
            {drive.error && <p className="mt-1 text-xs text-red-700">{drive.error}</p>}
          </div>
        </div>

        {verifyResult && (
          <div className={`mt-4 rounded-xl border p-4 ${verifyResult.ok ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Live Drive check: {verifyResult.ok ? "Passed" : "Failed"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Mode: {verifyResult.authMode} · Account: {verifyResult.user || "unknown"} · Upload capable: {verifyResult.canUpload ? "yes" : "no"}
                </p>
                {verifyResult.error && <p className="mt-1 text-xs text-red-700">{verifyResult.error}</p>}
                <ul className="mt-2 space-y-1 text-xs">
                  {Object.entries(verifyResult.folders).map(([k, f]) => (
                    <li key={k} className="flex items-center gap-2">
                      {f.ok ? <Check size={13} className="text-emerald-600" /> : <X size={13} className="text-red-600" />}
                      <span className={f.ok ? "text-emerald-800" : "text-red-800"}>{k}</span>
                      {f.error && <span className="text-slate-500">— {f.error}</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={() => setVerifyResult(null)} className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-white" aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {(["photos", "songs", "books"] as const).map((k) => (
            <div key={k} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k} folder id</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <code className="text-sm text-slate-800">{maskId(drive.configured.folders[k])}</code>
                <button disabled={!drive.configured.folders[k]} onClick={() => copy(drive.configured.folders[k], k)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Copy folder id">
                  {copied === k ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity & Content</h2>
        <p className="mt-1 text-sm text-slate-600">Latest MongoDB posts and synced content overview.</p>

        {/* Desktop table */}
        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 font-semibold">Title</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentPosts.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No recent activity.</td></tr>
              ) : recentPosts.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-medium text-slate-800 max-w-md truncate">{item.title}</td>
                  <td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{item.type}</span></td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "Published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{item.status}</span></td>
                  <td className="px-3 py-3 text-slate-600">{new Date(item.date).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right"><a href={`/admin/${item.type}`} className="text-saffron-dark hover:text-maroon font-medium">Manage</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mt-4 space-y-3 md:hidden">
          {recentPosts.length === 0 ? <p className="text-sm text-slate-500">No recent activity.</p> : recentPosts.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-800 leading-snug">{item.title}</p>
                <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${item.status === "Published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{item.status}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize">{item.type}</span>
                <span>{new Date(item.date).toLocaleString()}</span>
              </div>
              <a href={`/admin/${item.type}`} className="mt-3 inline-flex min-h-[40px] items-center text-sm font-medium text-saffron-dark">Manage section →</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
