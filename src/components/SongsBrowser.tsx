"use client";

import { useMemo, useState } from "react";
import AudioPlayer from "./AudioPlayer";
import SearchBar from "./SearchBar";
import type { DriveFile } from "@/lib/driveUrls";

export default function SongsBrowser({ tracks }: { tracks: DriveFile[] }) {
  const [query, setQuery] = useState("");

  const audioTracks = useMemo(
    () =>
      tracks.filter(
        (t) => t.mimeType?.startsWith("audio/") || /\.(mp3|m4a|wav|ogg)$/i.test(t.name)
      ),
    [tracks]
  );

  const suggestions = useMemo(
    () => audioTracks.map((t) => t.name.replace(/\.[^/.]+$/, "")),
    [audioTracks]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return audioTracks;
    return audioTracks.filter((t) => t.name.toLowerCase().includes(q));
  }, [audioTracks, query]);

  return (
    <div className="space-y-6">
      {audioTracks.length > 0 && (
        <SearchBar
          value={query}
          onChange={setQuery}
          suggestions={suggestions}
          placeholder="Search songs and chants by name..."
          ariaLabel="Search dhamma songs"
        />
      )}

      {filtered.length > 0 ? (
        <AudioPlayer key={query} tracks={filtered} />
      ) : (
        <div className="card p-8 text-center text-slate-600">
          {audioTracks.length > 0
            ? "No tracks match your search."
            : "No audio tracks available."}
        </div>
      )}
    </div>
  );
}
