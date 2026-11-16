"use client";

import { useMemo, useState } from "react";
import PostCard from "./PostCard";
import SearchBar from "./SearchBar";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";

interface ActivityItem {
  _id: string;
  title: string;
  slug: string;
  category: "activity";
  content: string;
  author?: string;
  coverImageDriveId?: string;
  createdAt: string;
}

export default function ActivitiesGrid({ items }: { items: ActivityItem[] }) {
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
        <SearchBar
          value={query}
          onChange={setQuery}
          suggestions={suggestions}
          placeholder="Search activities by title or content..."
          ariaLabel="Search activities"
        />
      )}

      {filtered.length > 0 ? (
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {filtered.map((p) => (
            <StaggerItem key={p._id}>
              <PostCard {...p} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      ) : (
        <div className="card p-8 text-center text-slate-600">
          {items.length > 0 ? "No activities match your search." : "No activities published yet."}
        </div>
      )}
    </div>
  );
}
