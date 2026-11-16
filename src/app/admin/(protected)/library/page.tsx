"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Trash2, Eye, FileText, BookOpen, RefreshCw, Download } from "lucide-react";
import { getPreviewUrl, getDownloadUrl, formatFileSize, getFileBadge, type DriveFile } from "@/lib/driveUrls";

export default function LibraryAdminPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/drive/files?type=books", { cache: "no-store" });
      const data = await res.json();
      setFiles(data.files || []);
    } catch { setFiles([]); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => files.filter(f => f.name.toLowerCase().includes(query.toLowerCase())), [files, query]);

  async function upload(list: FileList | File[]) {
    const arr = Array.from(list).filter(f => /\.(pdf|doc|docx)$/i.test(f.name) || /pdf|word|officedocument/.test(f.type));
    if (!arr.length) return alert("Please select .pdf, .doc, or .docx files.");
    setUploading(true);
    try {
      for (let i = 0; i < arr.length; i++) {
        const f = arr[i];
        setProgress(`Uploading ${i + 1}/${arr.length}: ${f.name}`);
        const base = bookTitle || f.name.replace(/\.[^/.]+$/, "");
        const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")) : "";
        const finalName = `${base}${author ? ` - ${author}` : ""}${arr.length > 1 ? ` (${i + 1})` : ""}${ext}`;
        const fd = new FormData();
        fd.append("file", f);
        fd.append("folderType", "books");
        fd.append("fileName", finalName);
        const res = await fetch("/api/admin/drive/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
      }
      setMsg("Upload complete. Library synced.");
      setBookTitle(""); setAuthor("");
      await load();
    } catch (e: any) { alert(e.message || "Upload failed"); }
    finally { setUploading(false); setProgress(null); setTimeout(()=>setMsg(null),3000); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document from Google Drive?")) return;
    const res = await fetch(`/api/admin/drive/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(()=>({})); alert(d.error || "Delete failed"); return; }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">E-Book & Document Library</h1><p className="mt-1 text-slate-600">Upload and manage PDF/DOC/DOCX books in the Google Drive Books folder.</p></div>
        <button onClick={load} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"><RefreshCw size={16}/> Refresh</button>
      </div>
      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>}

      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Document Upload Dropzone</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Book Title (optional)</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={bookTitle} onChange={(e)=>setBookTitle(e.target.value)} placeholder="Custom book title" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Author (optional)</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={author} onChange={(e)=>setAuthor(e.target.value)} placeholder="Author name" /></div>
        </div>
        <div onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault(); if(e.dataTransfer.files) upload(e.dataTransfer.files);}} className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
          <UploadCloud className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm text-slate-700">Drag & drop .pdf, .doc, or .docx files to upload</p>
          <label className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-saffron px-4 py-2 text-sm font-medium text-white hover:bg-saffron-dark">
            {uploading ? "Uploading..." : "Select Documents"}
            <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple className="hidden" onChange={(e)=> e.target.files && upload(e.target.files)} />
          </label>
          {progress && <p className="mt-3 text-sm text-slate-600">{progress}</p>}
        </div>
      </motion.div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Books & Documents ({filtered.length})</h2>
          <input className="w-full sm:max-w-xs min-h-[44px] rounded-xl border border-slate-300 px-3" placeholder="Search documents..." value={query} onChange={(e)=>setQuery(e.target.value)} />
        </div>
        {loading ? <p className="py-8 text-slate-500">Loading documents...</p> : (
          <div className="mt-4 space-y-3">
            {filtered.map((f) => {
              const badge = getFileBadge(f.mimeType, f.name);
              return (
                <div key={f.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-saffron/10 text-saffron-dark">{badge === "PDF" ? <BookOpen size={18}/> : <FileText size={18}/>}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 break-words">{f.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                          <span className="rounded-full bg-maroon/10 px-2 py-0.5 text-xs font-semibold text-maroon">{badge}</span>
                          <span>{formatFileSize(f.size)}</span>
                          <span>{f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={()=>setPreviewId(f.id)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm"><Eye size={14}/> Preview</button>
                      <a href={getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm"><Download size={14}/> Download</a>
                      <button onClick={()=>remove(f.id)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50"><Trash2 size={14}/> Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length===0 && <p className="py-6 text-slate-500">No documents found.</p>}
          </div>
        )}
      </div>

      {previewId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4" onClick={()=>setPreviewId(null)}>
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="font-semibold text-slate-900">Document Preview</h3>
              <button onClick={()=>setPreviewId(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100">✕</button>
            </div>
            <div className="h-[75vh] bg-slate-100"><iframe src={getPreviewUrl(previewId)} className="h-full w-full" title="Preview" /></div>
          </div>
        </div>
      )}
    </div>
  );
}
