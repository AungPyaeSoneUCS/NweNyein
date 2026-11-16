"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import PostCard from "./PostCard";

interface PostItem {
  _id: string;
  title: string;
  slug: string;
  category: "knowledge" | "history" | "activity";
  content: string;
  author?: string;
  coverImageDriveId?: string;
  createdAt: string;
}

export default function KnowledgeList({ posts }: { posts: PostItem[] }) {
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("all");

  const authors = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.author && set.add(p.author));
    return Array.from(set).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const matchQuery = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      const matchAuthor = author === "all" || p.author === author;
      return matchQuery && matchAuthor;
    });
  }, [posts, query, author]);

  const authorFilters = ["all", ...authors];

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search teachings by title or content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {authorFilters.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {authorFilters.map((a) => {
              const active = author === a;
              return (
                <button
                  key={a}
                  onClick={() => setAuthor(a)}
                  className={`relative min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${active ? "text-maroon" : "text-slate-600 hover:text-maroon bg-white/60 border border-amber-900/10"}`}
                >
                  {active && (
                    <motion.span
                      layoutId="author-filter-pill"
                      className="absolute inset-0 rounded-full border border-amber-200/70 bg-amber-100/80 shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{a === "all" ? "All authors" : a}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length > 0 ? (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {filtered.map((p) => (
            <PostCard key={p._id} {...p} />
          ))}
        </motion.div>
      ) : (
        <div className="card p-8 text-center text-slate-600">No teachings found. Try adjusting your search or filter.</div>
      )}
    </div>
  );
}
