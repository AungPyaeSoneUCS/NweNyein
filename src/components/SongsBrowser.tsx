"use client";

import { useMemo, useState } from "react";
import AudioPlayer, { type AudioTrack, type SongGroup } from "./AudioPlayer";
import SearchBar from "./SearchBar";
import {
  collectionFiles,
  fileCollectionPath,
  isAudioFile,
  type DriveTree,
} from "@/lib/driveTree";

export default function SongsBrowser({
  tree,
  covers = {},
}: {
  tree: DriveTree;
  covers?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");

  const audioFiles = useMemo(
    () => tree.allFiles.filter(isAudioFile),
    [tree]
  );

  const groups = useMemo<SongGroup[]>(() => {
    const label = (file: (typeof tree.allFiles)[number]): AudioTrack => ({
      ...file,
      collectionLabel: fileCollectionPath(tree, file.id)?.join(" / ") || null,
    });

    const result: SongGroup[] = [];
    if (audioFiles.length) {
      result.push({
        id: "all",
        name: "All songs",
        tracks: audioFiles.map(label),
      });
    }

    for (const collection of tree.collections) {
      const tracks = collectionFiles(collection)
        .filter(isAudioFile)
        .map(label);
      if (tracks.length) {
        result.push({
          id: collection.id,
          name: collection.name,
          tracks,
        });
      }
    }

    const rootTracks = tree.files.filter(isAudioFile).map(label);
    if (rootTracks.length && tree.collections.length) {
      result.push({ id: "root", name: "Other songs", tracks: rootTracks });
    }

    return result;
  }, [audioFiles, tree]);

  const suggestions = useMemo(
    () => [
      ...groups.map((group) => group.name),
      ...audioFiles.map((file) => file.name.replace(/\.[^/.]+$/, "")),
    ],
    [audioFiles, groups]
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => {
        if (group.name.toLowerCase().includes(q)) return group;
        return {
          ...group,
          tracks: group.tracks.filter(
            (track) =>
              track.name.toLowerCase().includes(q) ||
              (track.collectionLabel || "").toLowerCase().includes(q)
          ),
        };
      })
      .filter((group) => group.tracks.length > 0);
  }, [groups, query]);

  return (
    <div className="space-y-6">
      {audioFiles.length > 0 && (
        <SearchBar
          value={query}
          onChange={setQuery}
          suggestions={suggestions}
          placeholder="Search songs, singers, albums or chants..."
          ariaLabel="Search dhamma songs"
        />
      )}

      <AudioPlayer groups={filteredGroups} covers={covers} />
    </div>
  );
}
