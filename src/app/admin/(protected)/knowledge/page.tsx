"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Plus, Search, Pencil, Trash2, Eye, EyeOff, Save, X } from "lucide-react";
import { slugify } from "@/lib/utils";
import { getPhotoUrl, extractDriveId } from "@/lib/driveUrls";

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), { ssr: false });

type Post = {
  _id: string; title: string; slug: string; category: string; content: string; author?: string;
  coverImageDriveId?: string; published: boolean; createdAt: string; updatedAt: string;
};

const emptyForm = { title: "", slug: "", author: "", content: "", coverImageDriveId: "", published: true };

export default function KnowledgeAdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all"|"published"|"draft">("all");
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/posts");
    const data = await res.json();
    setPosts((data.posts || []).filter((p: Post) => p.category === "knowledge"));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => posts.filter((p) => {
    const q = query.toLowerCase();
    const matchQ = !q || p.title.toLowerCase().includes(q) || (p.author || "").toLowerCase().includes(q);
    const matchS = status === "all" || (status === "published" ? p.published : !p.published);
    return matchQ && matchS;
  }), [posts, query, status]);

  function openCreate() {
    setEditing(null); setForm(emptyForm); setSlugTouched(false); setCreating(true);
  }
  function openEdit(p: Post) {
    setEditing(p); setCreating(false); setSlugTouched(true);
    setForm({ title: p.title, slug: p.slug, author: p.author || "", content: p.content || "", coverImageDriveId: p.coverImageDriveId || "", published: p.published });
  }
  function closeForm() { setCreating(false); setEditing(null); setForm(emptyForm); }

  useEffect(() => { if (creating && !slugTouched) setForm((f) => ({ ...f, slug: slugify(f.title) })); }, [form.title, creating, slugTouched]);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const payload = { ...form, coverImageDriveId: extractDriveId(form.coverImageDriveId), category: "knowledge", slug: form.slug || slugify(form.title) };
      const url = editing ? `/api/admin/posts/${editing._id}` : "/api/admin/posts";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg(editing ? "Post updated." : "Post created.");
      closeForm();
      await load();
    } catch (e: any) { setMsg(e.message || "Error"); } finally { setSaving(false); setTimeout(() => setMsg(null), 3000); }
  }

  async function togglePublish(p: Post) {
    await fetch(`/api/admin/posts/${p._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, published: !p.published }) });
    await load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this knowledge post?")) return;
    await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    await load();
  }

  async function uploadCover(file: File) {
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folderType", "photos");
      fd.append("fileName", file.name);
      const res = await fetch("/api/admin/drive/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm((f) => ({ ...f, coverImageDriveId: data.file.id }));
    } catch (e: any) { alert(e.message || "Cover upload failed"); }
    finally { setUploadingCover(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Knowledge & Dhamma Teachings</h1>
          <p className="mt-1 text-slate-600">Create, edit, and manage knowledge posts.</p>
        </div>
        <button onClick={openCreate} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-saffron px-4 py-2 font-medium text-white hover:bg-saffron-dark"><Plus size={18} /> New Teaching</button>
      </div>

      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>}

      {(creating || editing) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editing ? "Edit Teaching" : "Create Teaching"}</h2>
            <button onClick={closeForm} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Slug (Burmese/English)</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={form.slug} onChange={(e)=>{setSlugTouched(true); setForm({...form,slug:e.target.value});}} onBlur={()=>setForm(f=>({...f,slug:slugify(f.slug||f.title)}))} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Sayadaw / Author</label><input className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3" value={form.author} onChange={(e)=>setForm({...form,author:e.target.value})} /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Cover Image (Drive ID, full Google Drive link, or upload)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-300 px-3"
                  placeholder="Paste Drive File ID or link (e.g. https://drive.google.com/file/d/.../view)"
                  value={form.coverImageDriveId}
                  onChange={(e)=>setForm({...form,coverImageDriveId:e.target.value})}
                  onBlur={(e)=>setForm(f=>({...f,coverImageDriveId:extractDriveId(e.target.value)}))}
                  onPaste={(e)=>{ const text = e.clipboardData.getData('text'); if(text){ e.preventDefault(); setForm(f=>({...f,coverImageDriveId:extractDriveId(text)})); } }}
                />
                <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
                  {uploadingCover ? "Uploading..." : "Upload Cover"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e)=> e.target.files?.[0] && uploadCover(e.target.files[0])} />
                </label>
              </div>
              <p className="mt-1 text-xs text-slate-500">Supports file IDs and share links like https://drive.google.com/file/d/FILE_ID/view</p>
              {extractDriveId(form.coverImageDriveId) && <img src={getPhotoUrl(extractDriveId(form.coverImageDriveId))} alt="Cover preview" className="mt-3 h-40 w-full max-w-sm rounded-xl border object-cover" />}
            </div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Content (Burmese Unicode supported)</label><RichTextEditor value={form.content} onChange={(html)=>setForm({...form,content:html})} /></div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" className="h-4 w-4 accent-saffron" checked={form.published} onChange={(e)=>setForm({...form,published:e.target.checked})} /> Published</label>
          </div>
          <div className="flex flex-wrap gap-2"><button onClick={save} disabled={saving} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-maroon px-4 py-2 text-white hover:bg-maroon-light disabled:opacity-60"><Save size={16} /> {saving?"Saving...":"Save"}</button><button onClick={closeForm} className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 px-4 py-2">Cancel</button></div>
        </motion.div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full min-h-[44px] rounded-xl border border-slate-300 pl-9 pr-3" placeholder="Search teachings..." value={query} onChange={(e)=>setQuery(e.target.value)} /></div>
          <div className="flex gap-2">
            {(["all","published","draft"] as const).map((s)=> (
              <button key={s} onClick={()=>setStatus(s)} className={`min-h-[40px] rounded-full px-3 text-sm capitalize ${status===s?"bg-amber-100 text-maroon border border-amber-200":"bg-slate-100 text-slate-600"}`}>{s}</button>
            ))}
          </div>
        </div>
        {loading ? <p className="py-8 text-slate-500">Loading...</p> : (
          <div className="mt-4 space-y-3">
            {filtered.map((p)=> (
              <div key={p._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{p.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{p.author || "No author"} · {new Date(p.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.published?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-800"}`}>{p.published?"Published":"Draft"}</span>
                  <button onClick={()=>togglePublish(p)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm">{p.published?<EyeOff size={14}/>:<Eye size={14}/>} {p.published?"Draft":"Publish"}</button>
                  <button onClick={()=>openEdit(p)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm"><Pencil size={14}/> Edit</button>
                  <button onClick={()=>remove(p._id)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50"><Trash2 size={14}/> Delete</button>
                </div>
              </div>
            ))}
            {filtered.length===0 && <p className="py-6 text-slate-500">No knowledge posts found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
