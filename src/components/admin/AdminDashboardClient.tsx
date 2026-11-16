"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Pencil, Trash2, Eye, EyeOff, Plus } from "lucide-react";

interface PostRow {
  _id: string;
  title: string;
  slug: string;
  category: string;
  published: boolean;
  createdAt: string;
}

export default function AdminDashboardClient({ initialPosts }: { initialPosts: PostRow[] }) {
  const [posts, setPosts] = useState<PostRow[]>(initialPosts);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function syncDrive() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/revalidate-drive", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      setMessage("Google Drive cache synced.");
      router.refresh();
    } catch {
      setMessage("Failed to sync Drive cache.");
    } finally {
      setSyncing(false);
    }
  }

  async function togglePublish(post: PostRow) {
    try {
      const res = await fetch(`/api/admin/posts/${post._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...post, published: !post.published }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPosts((prev) => prev.map((p) => (p._id === post._id ? { ...p, published: data.post.published } : p)));
    } catch {
      alert("Failed to update post.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setPosts((prev) => prev.filter((p) => p._id !== id));
    } catch {
      alert("Failed to delete post.");
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={syncDrive} className="btn-secondary" disabled={syncing}>
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing..." : "Sync Google Drive Cache"}
          </button>
          {message && <span className="text-sm text-slate-700">{message}</span>}
        </div>
        <Link href="/admin/posts/new" className="btn-primary">
          <Plus size={16} /> New Post
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-maroon/5 text-left text-maroon">
            <tr>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">No posts yet.</td></tr>
            ) : posts.map((post) => (
              <tr key={post._id} className="border-t border-maroon/10">
                <td className="px-4 py-3 font-medium text-slate-800 max-w-md truncate">{post.title}</td>
                <td className="px-4 py-3 capitalize text-slate-700">{post.category}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${post.published ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"}`}>
                    {post.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{new Date(post.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => togglePublish(post)} className="btn-outline px-2 py-1 text-xs" title={post.published ? "Unpublish" : "Publish"}>
                      {post.published ? <EyeOff size={14} /> : <Eye size={14} />} {post.published ? "Draft" : "Publish"}
                    </button>
                    <Link href={`/admin/posts/${post._id}/edit`} className="btn-outline px-2 py-1 text-xs"><Pencil size={14} /> Edit</Link>
                    <button onClick={() => remove(post._id)} className="btn-outline px-2 py-1 text-xs text-red-700 border-red-200 hover:bg-red-50"><Trash2 size={14} /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
