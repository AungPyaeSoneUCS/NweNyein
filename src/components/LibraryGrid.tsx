"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, FileText, Download, BookOpenCheck } from "lucide-react";
import {
  formatFileSize,
  getDownloadUrl,
  getFileBadge,
  getPhotoUrl,
  type DriveFile,
} from "@/lib/driveUrls";
import SearchBar from "./SearchBar";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";

export default function LibraryGrid({
  files,
  covers = {},
}: {
  files: DriveFile[];
  covers?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(
    () => files.map((f) => f.name.replace(/\.[^/.]+$/, "")),
    [files]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, query]);

  return (
    <div className="space-y-6">
      {files.length > 0 && (
        <SearchBar
          value={query}
          onChange={setQuery}
          suggestions={suggestions}
          placeholder="Search books and documents by name..."
          ariaLabel="Search library documents"
        />
      )}

      {filtered.length > 0 ? (
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {filtered.map((file) => {
            const badge = getFileBadge(file.mimeType, file.name);
            const title = file.name.replace(/\.[^/.]+$/, "");
            const cover = covers[file.id];
            return (
              <StaggerItem key={file.id}>
                <div className="card flex h-full flex-col p-5 sm:p-6">
                  {cover && (
                    <div className="mb-4 overflow-hidden rounded-xl border border-amber-900/10 bg-amber-50/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getPhotoUrl(cover)}
                        alt=""
                        loading="lazy"
                        className="h-36 w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-saffron/10 text-saffron-dark">
                      {badge === "PDF" ? <BookOpen size={22} /> : <FileText size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-snug text-maroon break-words">{title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-maroon/10 px-2.5 py-1 font-semibold text-maroon">{badge}</span>
                        {file.size && <span className="text-slate-500">{formatFileSize(file.size)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-5 grid grid-cols-2 gap-2">
                    <Link href={`/library/${file.id}`} className="btn-primary text-sm">
                      <BookOpenCheck size={16} /> Read
                    </Link>
                    <a href={getDownloadUrl(file.id)} className="btn-outline text-sm" target="_blank" rel="noopener noreferrer">
                      <Download size={16} /> Download
                    </a>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
      ) : (
        <div className="card p-8 text-center text-slate-600">
          {files.length > 0 ? "No documents match your search." : "No documents available in the library yet."}
        </div>
      )}
    </div>
  );
}
