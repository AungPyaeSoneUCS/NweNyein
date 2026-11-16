"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Trash2, Play, Music2, RefreshCw } from "lucide-react";
import { getAudioUrl, getPhotoUrl, formatFileSize, type DriveFile } from "@/lib/driveUrls";
import DriveImagePicker from "@/components/admin/DriveImagePicker";

export default function SongsAdminPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState("");
  const [sayadaw, setSayadaw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [filesRes, coversRes] = await Promise.all([
        fetch("/api/drive/files?type=songs", { cache: "no-store" }),
        fetch("/api/admin/media-meta?kind=songs", { cache: "no-store" }),
      ]);
      const data = await filesRes.json();
      setFiles(data.files || []);

      if (coversRes.ok) {
        const meta = await coversRes.json();
        const map: Record<string, string> = {};
        for (const item of meta.items || []) map[item.fileId] = item.coverImageDriveId;
        setCovers(map);
      }
    } catch { setFiles([]); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function saveCover(fileId: string, coverImageDriveId: string) {
    setCovers((prev) => {
      const next = { ...prev };
      if (coverImageDriveId) next[fileId] = coverImageDriveId;
      else delete next[fileId];
      return next;
    });
    try {
      const res = await fetch("/api/admin/media-meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "songs", fileId, coverImageDriveId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save thumbnail");
      }
      setMsg("Track thumbnail saved.");
    } catch (e: any) {
      alert(e.message || "Failed to save thumbnail");
      await load();
    } finally {
      setTimeout(() => setMsg(null), 3000);
    }
  }

  const filtered = useMemo(() => files.filter(f => f.name.toLowerCase().includes(query.toLowerCase())), [files, query]);

  async function upload(list: FileList | File[]) {
    const arr = Array.from(list).filter(f => /audio\//.test(f.type) || /\.(mp3|m4a|wav)$/i.test(f.name));
    if (!arr.length) return alert("Please select .mp3, .m4a, or .wav files.");
    setUploading(true);
    try {
      for (let i = 0; i < arr.length; i++) {
        const f = arr[i];
        setProgress(`Uploading ${i + 1}/${arr.length}: ${f.name}`);
        const base = trackTitle || f.name.replace(/\.[^/.]+$/, "");
        const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")) : "";
        const finalName = `${sayadaw ? `${sayadaw} - ` : ""}${base}${arr.length > 1 ? ` (${i + 1})` : ""}${ext}`;
        const fd = new FormData();
        fd.append("file", f);
        fd.append("folderType", "songs");
        fd.append("fileName", finalName);
        const res = await fetch("/api/admin/drive/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
      }
      setMsg("Upload complete. Cache revalidated.");
      setTrackTitle(""); setSayadaw("");
      await load();
    } catch (e: any) { alert(e.message || "Upload failed"); }
    finally { setUploading(false); setProgress(null); setTimeout(()=>setMsg(null),3000); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this audio file from Google Drive?")) return;
    const res = await fetch(`/api/admin/drive/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(()=>({})); alert(d.error || "Delete failed"); return; }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Dhamma Songs & Chants</h1><p className="mt-1 text-slate-600">Upload and manage audio tracks in the Google Drive Songs folder.</p></div>
        <button onClick={load} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"><RefreshCw size={16}/> Refresh</button>
      </div>
      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>}

      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Audio Upload Dropzone</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Track Title (optional)</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={trackTitle} onChange={(e)=>setTrackTitle(e.target.value)} placeholder="Custom track title" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Sayadaw / Metadata (optional)</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={sayadaw} onChange={(e)=>setSayadaw(e.target.value)} placeholder="Sayadaw name" /></div>
        </div>
        <div onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault(); if(e.dataTransfer.files) upload(e.dataTransfer.files);}} className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
          <UploadCloud className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm text-slate-700">Drag & drop .mp3, .m4a, or .wav files to upload</p>
          <label className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-saffron px-4 py-2 text-sm font-medium text-white hover:bg-saffron-dark">
            {uploading ? "Uploading..." : "Select Audio Files"}
            <input type="file" accept=".mp3,.m4a,.wav,audio/*" multiple className="hidden" onChange={(e)=> e.target.files && upload(e.target.files)} />
          </label>
          {progress && <p className="mt-3 text-sm text-slate-600">{progress}</p>}
        </div>
      </motion.div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Tracks ({filtered.length})</h2>
          <input className="w-full sm:max-w-xs min-h-[44px] rounded-xl border border-slate-300 px-3" placeholder="Search tracks..." value={query} onChange={(e)=>setQuery(e.target.value)} />
        </div>
        {loading ? <p className="py-8 text-slate-500">Loading tracks...</p> : (
          <div className="mt-4 space-y-3">
            {filtered.map((f) => (
              <div key={f.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex items-start gap-3">
                    {covers[f.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getPhotoUrl(covers[f.id])} alt="" className="mt-0.5 h-10 w-10 flex-none rounded-xl border border-slate-200 bg-slate-100 object-cover" />
                    ) : (
                      <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-saffron/10 text-saffron-dark"><Music2 size={18}/></span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 break-words">{f.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatFileSize(f.size)} · {f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : "—"}</p>
                      <DriveImagePicker
                        compact
                        className="mt-2"
                        buttonLabel="Thumbnail"
                        value={covers[f.id] || ""}
                        onChange={(id) => saveCover(f.id, id)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <audio controls preload="none" src={getAudioUrl(f.id)} className="h-10 max-w-full" />
                    <button onClick={()=>remove(f.id)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50"><Trash2 size={14}/> Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length===0 && <p className="py-6 text-slate-500">No audio tracks found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
