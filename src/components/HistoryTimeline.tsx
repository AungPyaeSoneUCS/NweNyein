"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";
import { getPhotoUrl } from "@/lib/driveUrls";
import SearchBar from "./SearchBar";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";

interface HistoryItem {
  _id: string;
  title: string;
  content: string;
  author?: string;
  coverImageDriveId?: string;
  createdAt: string;
}

export default function HistoryTimeline({ items }: { items: HistoryItem[] }) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => items.map((p) => p.title), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q) ||
        p.author?.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <div className="mx-auto max-w-4xl">
          <SearchBar
            value={query}
            onChange={setQuery}
            suggestions={suggestions}
            placeholder="Search history by title or content..."
            ariaLabel="Search monastery history"
          />
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="relative mx-auto max-w-4xl">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-saffron/60 via-amber-300/40 to-transparent md:left-1/2" />
          <StaggerGrid className="space-y-6 md:space-y-10">
            {filtered.map((post, idx) => (
              <StaggerItem key={post._id} className={`relative md:w-1/2 ${idx % 2 === 0 ? "md:pr-10 md:ml-0" : "md:pl-10 md:ml-auto"}`}>
                <span
                  className={`absolute left-4 top-6 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-saffron shadow-md md:top-8 ${idx % 2 === 0 ? "md:left-auto md:right-[-7px] md:translate-x-0" : "md:left-[-7px] md:translate-x-0"}`}
                />
                <div className="ml-10 md:ml-0 card overflow-hidden p-5 sm:p-6">
                  <time className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-saffron-dark">{formatDate(post.createdAt)}</time>
                  <h2 className="mt-3 text-xl sm:text-2xl text-maroon leading-snug">{post.title}</h2>
                  {post.author && <p className="mt-1 text-sm text-slate-600">By {post.author}</p>}
                  {post.coverImageDriveId && (
                    <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-amber-900/10 bg-maroon/5">
                      <Image src={getPhotoUrl(post.coverImageDriveId)} alt={post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                    </div>
                  )}
                  <div className="prose-content mt-4 text-sm sm:text-base font-myanmar" dangerouslySetInnerHTML={{ __html: post.content }} />
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      ) : (
        <div className="card p-8 text-center text-slate-600">
          {items.length > 0 ? "No history entries match your search." : "No history posts published yet."}
        </div>
      )}
    </div>
  );
}
