"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  ImagePlus,
  Images,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { getPhotoUrl, type DriveFile } from "@/lib/driveUrls";
import { cn } from "@/lib/utils";

type DriveImage = DriveFile & { folderName?: string };
type Scope = "photos" | "all";

interface DriveImagePickerProps {
  value?: string;
  onChange: (id: string) => void;
  label?: string;
  buttonLabel?: string;
  compact?: boolean;
  className?: string;
}

export default function DriveImagePicker({
  value = "",
  onChange,
  label,
  buttonLabel = "Choose from Drive",
  compact = false,
  className,
}: DriveImagePickerProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("photos");
  const [cache, setCache] = useState<Partial<Record<Scope, DriveImage[]>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");

  useEffect(() => setMounted(true), []);

  const load = useCallback(async (nextScope: Scope) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/drive/images?scope=${nextScope}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load photos");
      setCache((prev) => ({ ...prev, [nextScope]: data.images || [] }));
    } catch (e: any) {
      setError(e.message || "Could not load photos from Google Drive.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openPicker = () => {
    setOpen(true);
    setSelected(value || "");
    setQuery("");
    if (!cache[scope]) load(scope);
  };

  const switchScope = (next: Scope) => {
    setScope(next);
    if (!cache[next]) load(next);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const images = cache[scope] || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return images;
    return images.filter(
      (image) =>
        image.name.toLowerCase().includes(q) || (image.folderName || "").toLowerCase().includes(q)
    );
  }, [images, query]);

  const apply = () => {
    if (!selected) return;
    onChange(selected);
    setOpen(false);
  };

  return (
    <div className={cn(compact ? "" : "space-y-2", className)}>
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}

      <div className="flex flex-wrap items-center gap-2">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPhotoUrl(value)}
            alt="Selected Google Drive photo"
            className={cn(
              "flex-none rounded-xl border border-slate-200 bg-slate-100 object-cover",
              compact ? "h-10 w-10 rounded-lg" : "h-16 w-16"
            )}
          />
        )}
        <button
          type="button"
          onClick={openPicker}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50",
            compact ? "min-h-[40px] px-3 text-sm" : "min-h-[44px] px-4 text-sm"
          )}
        >
          <ImagePlus size={16} />
          {value ? "Change photo" : buttonLabel}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-xl px-3 text-sm text-red-700 hover:bg-red-50"
          >
            <X size={14} /> Remove
          </button>
        )}
      </div>

      {!compact && (
        <p className="text-xs text-slate-500">
          Pick any photo already uploaded to the monastery Google Drive — no upload needed.
        </p>
      )}

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Choose a photo from Google Drive"
              className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[82vh] sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Images size={18} className="text-saffron-dark" /> Choose a photo from Drive
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Select an existing image for this thumbnail.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg hover:bg-slate-100"
                  aria-label="Close photo picker"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm"
                    placeholder="Search photos by name or album..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  {(["photos", "all"] as Scope[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => switchScope(option)}
                      className={cn(
                        "min-h-[40px] rounded-full px-3 text-sm capitalize",
                        scope === option
                          ? "border border-amber-200 bg-amber-100 text-maroon"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {option === "photos" ? "Photos folder" : "All Drive"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => load(scope)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    aria-label="Refresh photos"
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-5">
                {loading && images.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 size={26} className="animate-spin" />
                    <p className="text-sm">Loading photos from Google Drive...</p>
                  </div>
                ) : error ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                    <AlertTriangle size={26} className="text-amber-600" />
                    <p className="max-w-md text-sm text-slate-700">{error}</p>
                    <button
                      type="button"
                      onClick={() => load(scope)}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50"
                    >
                      <RefreshCw size={15} /> Try again
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-slate-500">
                    <Images size={26} />
                    <p className="text-sm font-medium text-slate-700">
                      {images.length === 0 ? "No photos found" : "No photos match your search"}
                    </p>
                    <p className="max-w-sm text-xs">
                      {images.length === 0
                        ? "Upload photos to the Drive Photos folder (or an album subfolder) and refresh."
                        : "Try a different name or switch to All Drive."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {filtered.map((image) => {
                      const isSelected = selected === image.id;
                      return (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => setSelected(image.id)}
                          onDoubleClick={() => {
                            setSelected(image.id);
                            onChange(image.id);
                            setOpen(false);
                          }}
                          aria-pressed={isSelected}
                          className={cn(
                            "group relative aspect-square overflow-hidden rounded-xl border-2 bg-white text-left shadow-sm transition",
                            isSelected
                              ? "border-saffron ring-2 ring-saffron/40"
                              : "border-transparent hover:border-amber-200"
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getPhotoUrl(image.id)}
                            alt={image.name}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(event) => {
                              const el = event.currentTarget;
                              if (image.thumbnailLink && el.src !== image.thumbnailLink) {
                                el.src = image.thumbnailLink;
                              }
                            }}
                          />
                          {isSelected && (
                            <span className="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-saffron text-white shadow">
                              <Check size={14} />
                            </span>
                          )}
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 to-transparent px-2 pb-2 pt-6">
                            <span className="block truncate text-[11px] font-medium text-white">
                              {image.name.replace(/\.[^/.]+$/, "")}
                            </span>
                            {image.folderName && (
                              <span className="block truncate text-[10px] text-white/70">
                                {image.folderName}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-5">
                <p className="text-xs text-slate-500">
                  {selected ? "1 photo selected" : `${filtered.length} photo(s) available`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-[40px] items-center rounded-xl border border-slate-300 px-4 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={apply}
                    disabled={!selected}
                    className="btn-primary min-h-[40px] text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check size={15} /> Use photo
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
