"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Plus, Search, Pencil, Trash2, Eye, EyeOff, Save, X, UploadCloud, Images } from "lucide-react";
import { slugify } from "@/lib/utils";
import { extractDriveId } from "@/lib/driveUrls";
import DriveCoverField from "@/components/admin/DriveCoverField";

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), { ssr: false });

type Post = {
  _id: string; title: string; slug: string; category: string; content: string; author?: string;
  coverImageDriveId?: string; driveAlbumFolderId?: string; published: boolean; createdAt: string; updatedAt: string;
};

export default function ActivitiesAdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all"|"published"|"draft">("all");
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({ title: "", eventDate: "", location: "", slug: "", content: "", coverImageDriveId: "", driveAlbumFolderId: "", albumSubfolder: "", published: true });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/posts");
    const data = await res.json();
    setPosts((data.posts || []).filter((p: Post) => p.category === "activity"));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => posts.filter((p) => {
    const q = query.toLowerCase();
    const matchQ = !q || p.title.toLowerCase().includes(q);
    const matchS = status === "all" || (status === "published" ? p.published : !p.published);
    return matchQ && matchS;
  }), [posts, query, status]);

  function openCreate() { setEditing(null); setCreating(true); setSlugTouched(false); setForm({ title:"",eventDate:"",location:"",slug:"",content:"",coverImageDriveId:"",driveAlbumFolderId:"",albumSubfolder:"",published:true }); }
  function openEdit(p: Post) { setEditing(p); setCreating(false); setSlugTouched(true); setForm({ title:p.title,eventDate:"",location:"",slug:p.slug,content:p.content||"",coverImageDriveId:p.coverImageDriveId||"",driveAlbumFolderId:p.driveAlbumFolderId||"",albumSubfolder:"",published:p.published }); }
  function closeForm() { setCreating(false); setEditing(null); }

  useEffect(() => { if (creating && !slugTouched) setForm((f) => ({ ...f, slug: slugify(f.title) })); }, [form.title, creating, slugTouched]);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const meta = [form.eventDate && `Date: ${form.eventDate}`, form.location && `Location: ${form.location}`].filter(Boolean).join(" | ");
      const content = meta ? `<p><strong>${meta}</strong></p>${form.content}` : form.content;
      const payload = { title: form.title, slug: form.slug || slugify(form.title), category: "activity", content, author: "", coverImageDriveId: extractDriveId(form.coverImageDriveId), driveAlbumFolderId: extractDriveId(form.driveAlbumFolderId), published: form.published };
      const url = editing ? `/api/admin/posts/${editing._id}` : "/api/admin/posts";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg(editing ? "Activity updated." : "Activity created.");
      closeForm(); await load();
    } catch (e: any) { setMsg(e.message || "Error"); } finally { setSaving(false); setTimeout(()=>setMsg(null),3000); }
  }

  async function togglePublish(p: Post) { await fetch(`/api/admin/posts/${p._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({...p, published: !p.published}) }); await load(); }
  async function remove(id: string) { if (!confirm("Delete this activity post?")) return; await fetch(`/api/admin/posts/${id}`, { method: "DELETE" }); await load(); }

  async function uploadPhotos(files: FileList | File[]) {
    const list = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!list.length) return alert("Please select image files.");
    const subfolder = form.albumSubfolder || form.title || "activity-album";
    setUploading(true);
    let albumId = form.driveAlbumFolderId;
    try {
      for (let i = 0; i < list.length; i++) {
        setProgress(`Uploading ${i + 1}/${list.length}: ${list[i].name}`);
        const fd = new FormData();
        fd.append("file", list[i]);
        fd.append("folderType", "photos");
        fd.append("subfolderName", subfolder);
        const res = await fetch("/api/admin/drive/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        if (!albumId && data.subfolderId) albumId = data.subfolderId;
      }
      setForm((f) => ({ ...f, driveAlbumFolderId: albumId || f.driveAlbumFolderId, albumSubfolder: subfolder }));
      setMsg(`Uploaded ${list.length} photo(s) to album.`);
    } catch (e: any) { alert(e.message || "Photo upload failed"); }
    finally { setUploading(false); setProgress(null); setTimeout(()=>setMsg(null),3000); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files?.length) uploadPhotos(e.dataTransfer.files);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Activities & Photo Album Uploader</h1><p className="mt-1 text-slate-600">Manage activity posts and upload event photos to Google Drive albums.</p></div>
        <button onClick={openCreate} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-saffron px-4 py-2 font-medium text-white hover:bg-saffron-dark"><Plus size={18}/> New Activity</button>
      </div>
      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>}

      {(creating || editing) && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">{editing?"Edit Activity":"Create Activity"}</h2><button onClick={closeForm} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"><X size={18}/></button></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Event Date</label><input type="date" className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={form.eventDate} onChange={(e)=>setForm({...form,eventDate:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Location</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Slug</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={form.slug} onChange={(e)=>{setSlugTouched(true); setForm({...form,slug:e.target.value});}} onBlur={()=>setForm(f=>({...f,slug:slugify(f.slug||f.title)}))} /></div>
            <DriveCoverField
              className="md:col-span-2"
              label="Cover Image (choose from Google Drive)"
              value={form.coverImageDriveId}
              onChange={(id) => setForm({ ...form, coverImageDriveId: id })}
            />
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><RichTextEditor value={form.content} onChange={(html)=>setForm({...form,content:html})} /></div>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-medium"><Images size={18} className="text-saffron-dark"/> Multi-Photo Album Uploader</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Album Subfolder Name (new or existing)</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" placeholder="e.g. Kathina-2026" value={form.albumSubfolder} onChange={(e)=>setForm({...form,albumSubfolder:e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Drive Album Folder ID (auto-attached)</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={form.driveAlbumFolderId} onChange={(e)=>setForm({...form,driveAlbumFolderId:e.target.value})} onBlur={(e)=>setForm(f=>({...f,driveAlbumFolderId:extractDriveId(e.target.value)}))} onPaste={(e)=>{const t=e.clipboardData.getData('text'); if(t){e.preventDefault(); setForm(f=>({...f,driveAlbumFolderId:extractDriveId(t)}));}}} placeholder="Filled after upload or paste folder link/ID" /></div>
              </div>
              <div ref={dropRef} onDragOver={(e)=>e.preventDefault()} onDrop={onDrop} className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
                <UploadCloud className="mx-auto text-slate-400" />
                <p className="mt-2 text-sm text-slate-700">Drag & drop event photos here (uploads into Photos folder subfolder)</p>
                <label className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-saffron px-4 py-2 text-sm font-medium text-white hover:bg-saffron-dark">
                  {uploading ? "Uploading..." : "Select Photos"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e)=> e.target.files && uploadPhotos(e.target.files)} />
                </label>
                {progress && <p className="mt-3 text-sm text-slate-600">{progress}</p>}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" className="h-4 w-4 accent-saffron" checked={form.published} onChange={(e)=>setForm({...form,published:e.target.checked})} /> Published</label>
          </div>
          <div className="flex flex-wrap gap-2"><button onClick={save} disabled={saving} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-maroon px-4 py-2 text-white hover:bg-maroon-light disabled:opacity-60"><Save size={16}/> {saving?"Saving...":"Save Activity"}</button><button onClick={closeForm} className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 px-4 py-2">Cancel</button></div>
        </motion.div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full min-h-[44px] rounded-xl border border-slate-300 pl-9 pr-3" placeholder="Search activities..." value={query} onChange={(e)=>setQuery(e.target.value)} /></div>
          <div className="flex gap-2">{(["all","published","draft"] as const).map((s)=> (<button key={s} onClick={()=>setStatus(s)} className={`min-h-[40px] rounded-full px-3 text-sm capitalize ${status===s?"bg-amber-100 text-maroon border border-amber-200":"bg-slate-100 text-slate-600"}`}>{s}</button>))}</div>
        </div>
        {loading ? <p className="py-8 text-slate-500">Loading...</p> : (
          <div className="mt-4 space-y-3">
            {filtered.map((p)=> (
              <div key={p._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="font-medium text-slate-900 truncate">{p.title}</p><p className="mt-1 text-sm text-slate-600">Album: {p.driveAlbumFolderId ? `${p.driveAlbumFolderId.slice(0,6)}•••` : "Not linked"} · {new Date(p.updatedAt).toLocaleDateString()}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.published?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-800"}`}>{p.published?"Published":"Draft"}</span>
                  <button onClick={()=>togglePublish(p)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm">{p.published?<EyeOff size={14}/>:<Eye size={14}/>} {p.published?"Draft":"Publish"}</button>
                  <button onClick={()=>openEdit(p)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm"><Pencil size={14}/> Edit</button>
                  <button onClick={()=>remove(p._id)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50"><Trash2 size={14}/> Delete</button>
                </div>
              </div>
            ))}
            {filtered.length===0 && <p className="py-6 text-slate-500">No activities found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
