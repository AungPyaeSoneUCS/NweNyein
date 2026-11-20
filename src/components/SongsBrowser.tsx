"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ListMusic, Music2, UserRound } from "lucide-react";
import SearchBar from "./SearchBar";
import { usePlayer } from "./PlayerProvider";
import { getPhotoUrl } from "@/lib/driveUrls";
import {
  collectionFiles,
  fileCollectionPath,
  isAudioFile,
  type DriveTree,
} from "@/lib/driveTree";
import type { AudioTrack, SongGroup } from "@/lib/player";

const EMPTY_COVERS: Record<string, string> = {};

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="inline-flex h-4 items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-saffron"
          animate={playing ? { height: [4, 14, 6, 16, 4] } : { height: 4 }}
          transition={
            playing
              ? { duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        />
      ))}
    </span>
  );
}

export default function SongsBrowser({
  tree,
  covers,
}: {
  tree: DriveTree;
  covers?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const player = usePlayer();
  const coverMap = covers || EMPTY_COVERS;

  const audioFiles = useMemo(() => tree.allFiles.filter(isAudioFile), [tree]);

  const allGroups = useMemo<SongGroup[]>(() => {
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
      const tracks = collectionFiles(collection).filter(isAudioFile).map(label);
      if (tracks.length) {
        result.push({ id: collection.id, name: collection.name, tracks });
      }
    }

    const rootTracks = tree.files.filter(isAudioFile).map(label);
    if (rootTracks.length && tree.collections.length) {
      result.push({ id: "root", name: "Other songs", tracks: rootTracks });
    }

    return result;
  }, [audioFiles, tree]);

  // Keep the global queue loaded even before the first tap, and restore it when
  // the user comes back from another page.
  useEffect(() => {
    player.setQueue(allGroups, coverMap);
  }, [allGroups, coverMap, player.setQueue]);

  const suggestions = useMemo(
    () => [
      ...allGroups.map((group) => group.name),
      ...audioFiles.map((file) => file.name.replace(/\.[^/.]+$/, "")),
    ],
    [allGroups, audioFiles]
  );

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups
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
  }, [allGroups, query]);

  const activeGroupId =
    visibleGroups.find((group) => group.id === player.activeGroupId)?.id ||
    visibleGroups[0]?.id ||
    null;
  const playable =
    visibleGroups.find((group) => group.id === activeGroupId)?.tracks || [];
  const showGroupCards = visibleGroups.some((group) => group.id !== "all");

  if (!audioFiles.length) {
    return (
      <div className="card p-8 text-center text-slate-600">
        No audio tracks available.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 md:pb-24">
      <SearchBar
        value={query}
        onChange={setQuery}
        suggestions={suggestions}
        placeholder="Search songs, singers, albums or chants..."
        ariaLabel="Search dhamma songs"
      />

      {showGroupCards && (
        <section aria-label="Singers and albums">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleGroups.map((group) => {
              const active = group.id === activeGroupId;
              return (
                <motion.button
                  key={group.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    player.setQueue(visibleGroups, coverMap);
                    player.setActiveGroup(group.id);
                  }}
                  className={`card flex h-full items-center gap-3 p-4 text-left transition ${
                    active
                      ? "border-amber-300/80 shadow-md ring-1 ring-amber-200/60"
                      : "hover:border-amber-300/70 hover:shadow-sm"
                  }`}
                >
                  <span
                    className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl ${
                      active ? "bg-saffron text-white" : "bg-maroon/10 text-maroon"
                    }`}
                  >
                    {group.id === "all" ? <ListMusic size={19} /> : <UserRound size={19} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold leading-snug text-maroon">
                      {group.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {group.tracks.length} {group.tracks.length === 1 ? "track" : "tracks"}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <ul className="space-y-2">
          {playable.map((item, index) => {
            const active = item.id === player.currentId;
            const cover = player.covers[item.id] || coverMap[item.id];
            return (
              <li key={item.id}>
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => player.playTrack(item.id, visibleGroups, coverMap)}
                  className={`flex w-full min-h-[56px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                    active
                      ? "border-amber-200/70 bg-white/90 shadow-sm ring-1 ring-amber-200/50"
                      : "border-amber-900/10 bg-white/70 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getPhotoUrl(cover)}
                        alt=""
                        loading="lazy"
                        className={`h-9 w-9 flex-none rounded-xl border object-cover ${
                          active ? "border-saffron/60" : "border-amber-900/10"
                        }`}
                      />
                    ) : (
                      <span
                        className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl text-sm font-semibold ${
                          active ? "bg-saffron text-white" : "bg-maroon/10 text-maroon"
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-charcoal">
                        {item.name.replace(/\.[^/.]+$/, "")}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.collectionLabel || "Dhamma audio"}
                      </span>
                    </span>
                  </span>
                  {active && <Equalizer playing={player.playing} />}
                </motion.button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
