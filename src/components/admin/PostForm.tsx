"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { slugify } from "@/lib/utils";
import { extractDriveId } from "@/lib/driveUrls";
import { isPostCategory, POST_CATEGORIES, type PostCategory } from "@/lib/postCategories";
import DriveCoverField from "./DriveCoverField";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

export interface PostFormValues {
  _id?: string;
  title: string;
  slug: string;
  category: PostCategory;
  content: string;
  author?: string;
  coverImageDriveId?: string;
  driveAlbumFolderId?: string;
  published: boolean;
}

export default function PostForm({ initial }: { initial?: Partial<PostFormValues> }) {
  const router = useRouter();
  const isEdit = !!initial?._id;
  const [values, setValues] = useState<PostFormValues>({
    title: initial?.title || "",
    slug: initial?.slug || "",
    category: isPostCategory(initial?.category) ? initial.category : POST_CATEGORIES[0],
    content: initial?.content || "",
    author: initial?.author || "",
    coverImageDriveId: initial?.coverImageDriveId || "",
    driveAlbumFolderId: initial?.driveAlbumFolderId || "",
    published: initial?.published ?? true,
  });
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) {
      setValues((v) => ({ ...v, slug: slugify(v.title) }));
    }
  }, [values.title, slugTouched]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...values,
        coverImageDriveId: extractDriveId(values.coverImageDriveId || ""),
        driveAlbumFolderId: extractDriveId(values.driveAlbumFolderId || ""),
        slug: values.slug || slugify(values.title),
      };
      const url = isEdit ? `/api/admin/posts/${initial!._id}` : "/api/admin/posts";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save post");
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Title</label>
          <input className="input" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">URL Slug (Burmese/English supported)</label>
          <input
            className="input"
            value={values.slug}
            onChange={(e) => { setSlugTouched(true); setValues({ ...values, slug: e.target.value }); }}
            onBlur={() => setValues((v) => ({ ...v, slug: slugify(v.slug || v.title) }))}
            required
          />
          <p className="mt-1 text-xs text-slate-500">Auto-generated from title; you can edit manually.</p>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value as PostCategory })}>
            {POST_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sayadaw / Author</label>
          <input className="input" value={values.author} onChange={(e) => setValues({ ...values, author: e.target.value })} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input id="published" type="checkbox" className="h-4 w-4 accent-saffron" checked={values.published} onChange={(e) => setValues({ ...values, published: e.target.checked })} />
          <label htmlFor="published" className="text-sm font-medium text-maroon">Published</label>
        </div>
      </div>

      <div>
        <label className="label">Content</label>
        <RichTextEditor value={values.content} onChange={(html) => setValues((v) => ({ ...v, content: html }))} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DriveCoverField
          label="Cover Image (choose from Google Drive)"
          value={values.coverImageDriveId || ""}
          onChange={(id) => setValues((v) => ({ ...v, coverImageDriveId: id }))}
        />
        <div>
          <label className="label">Google Drive Album Folder ID</label>
          <input className="input" value={values.driveAlbumFolderId} onChange={(e) => setValues({ ...values, driveAlbumFolderId: e.target.value })} placeholder="Optional, for linked photo galleries" />
          <p className="mt-1 text-xs text-slate-500">Optional Drive folder used for attached photos.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update Post" : "Create Post"}</button>
        <button type="button" className="btn-outline" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
