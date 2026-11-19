"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Settings2,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
  Timer,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAudioUrl, getPhotoUrl, type DriveFile } from "@/lib/driveUrls";

export type AudioTrack = DriveFile & { collectionLabel?: string | null };

export interface SongGroup {
  id: string;
  name: string;
  tracks: AudioTrack[];
}

type RepeatMode = "off" | "all" | "one";
const SLEEP_OPTIONS = [5, 10, 15, 30, 45, 60];
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="inline-flex h-4 items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-saffron"
          animate={playing ? { height: [4, 14, 6, 16, 4] } : { height: 4 }}
          transition={playing ? { duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" } : { duration: 0.2 }}
        />
      ))}
    </span>
  );
}

export default function AudioPlayer({
  groups,
  covers = {},
}: {
  groups: SongGroup[];
  covers?: Record<string, string>;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayRef = useRef(false);

  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? null);
  const [currentId, setCurrentId] = useState<string | null>(groups[0]?.tracks[0]?.id ?? null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeGroup = groups.find((group) => group.id === activeGroupId) || groups[0] || null;
  const playable = activeGroup?.tracks || [];
  const currentIndex = Math.max(
    0,
    playable.findIndex((track) => track.id === currentId)
  );
  const track = playable[currentIndex] || null;

  const fmt = useCallback((seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }, []);

  // Keep the selection valid when search results change.
  useEffect(() => {
    if (!groups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(groups[0]?.id ?? null);
    }
  }, [groups, activeGroupId]);

  useEffect(() => {
    if (!playable.length) {
      if (currentId !== null) setCurrentId(null);
      return;
    }
    if (!playable.some((candidate) => candidate.id === currentId)) {
      setCurrentId(playable[0].id);
    }
  }, [playable, currentId]);

  // Load a new source only when the selected track actually changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.src = getAudioUrl(track.id);
    audio.load();
    setProgress(0);
    setDuration(0);

    if (autoPlayRef.current) {
      autoPlayRef.current = false;
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
    audio.playbackRate = speed;
  }, [volume, muted, speed, track?.id]);

  const goTo = useCallback(
    (index: number, shouldPlay: boolean) => {
      if (!playable.length) return;
      const nextIndex = (index + playable.length) % playable.length;
      autoPlayRef.current = shouldPlay;
      setCurrentId(playable[nextIndex].id);
      setPlaying(shouldPlay);
    },
    [playable]
  );

  const nextTrack = useCallback(
    (shouldPlay = playing) => {
      if (shuffle && playable.length > 1) {
        let index = currentIndex;
        while (index === currentIndex) {
          index = Math.floor(Math.random() * playable.length);
        }
        goTo(index, shouldPlay);
        return;
      }
      goTo(currentIndex + 1, shouldPlay);
    },
    [currentIndex, goTo, playing, playable.length, shuffle]
  );

  const previousTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      return;
    }
    goTo(currentIndex - 1, playing);
  }, [currentIndex, goTo, playing]);

  const handleEnded = useCallback(() => {
    const audio = audioRef.current;
    if (repeat === "one") {
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => setPlaying(false));
      }
      setProgress(0);
      return;
    }
    if (repeat === "off" && currentIndex >= playable.length - 1) {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlaying(false);
      setProgress(0);
      return;
    }
    nextTrack(true);
  }, [currentIndex, nextTrack, playable.length, repeat]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setProgress(audio.currentTime || 0);
    const onMeta = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [handleEnded]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [playing, track]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setProgress(0);
    setSleepMinutes(null);
    setSleepRemaining(null);
  }, []);

  const seekTo = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : 0;
    const next = Math.min(Math.max(value, 0), limit || value);
    audio.currentTime = next;
    setProgress(next);
  }, []);

  const seekBy = useCallback(
    (delta: number) => seekTo((audioRef.current?.currentTime || 0) + delta),
    [seekTo]
  );

  useEffect(() => {
    if (sleepRemaining === null) return;
    const timer = window.setInterval(() => {
      setSleepRemaining((value) => (value === null ? null : Math.max(0, value - 1)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sleepRemaining !== null]);

  useEffect(() => {
    if (sleepRemaining !== 0) return;
    audioRef.current?.pause();
    setPlaying(false);
    setSleepMinutes(null);
    setSleepRemaining(null);
  }, [sleepRemaining]);

  const setSleepTimer = (minutes: number | null) => {
    setSleepMinutes(minutes);
    setSleepRemaining(minutes === null ? null : minutes * 60);
  };

  const cycleRepeat = () =>
    setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off"));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowRight") {
        seekBy(10);
      } else if (event.key === "ArrowLeft") {
        seekBy(-10);
      } else if (event.key.toLowerCase() === "n") {
        nextTrack();
      } else if (event.key.toLowerCase() === "p") {
        previousTrack();
      } else if (event.key.toLowerCase() === "m") {
        setMuted((value) => !value);
      } else if (event.key.toLowerCase() === "r") {
        cycleRepeat();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, seekBy, nextTrack, previousTrack]);

  const showCollectionCards = groups.some((group) => group.id !== "all");
  const timerLabel =
    sleepRemaining !== null ? fmt(sleepRemaining) : sleepMinutes ? `${sleepMinutes}m` : "Timer";

  if (!groups.length || !playable.length) {
    return <div className="card p-8 text-center text-slate-600">No audio tracks available.</div>;
  }

  return (
    <div className="space-y-6 pb-56 md:pb-44">
      {showCollectionCards && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-maroon md:text-xl">
            Singers & albums
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const active = group.id === activeGroupId;
              return (
                <motion.button
                  key={group.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setActiveGroupId(group.id)}
                  className={`card flex h-full items-center gap-3 p-4 text-left transition ${
                    active
                      ? "border-amber-300/80 shadow-md ring-1 ring-amber-200/60"
                      : "hover:border-amber-300/70 hover:shadow-sm"
                  }`}
                >
                  <span className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl ${active ? "bg-saffron text-white" : "bg-maroon/10 text-maroon"}`}>
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
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-maroon md:text-xl">
            <Music2 size={18} /> {activeGroup?.name || "Songs"}
          </h2>
          <span className="text-sm text-slate-500">
            {playable.length} {playable.length === 1 ? "track" : "tracks"}
          </span>
        </div>

        <ul className="space-y-2">
          {playable.map((item, index) => {
            const active = item.id === track?.id;
            const cover = covers[item.id];
            return (
              <li key={item.id}>
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    autoPlayRef.current = true;
                    setCurrentId(item.id);
                    setPlaying(true);
                  }}
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
                        className={`h-9 w-9 flex-none rounded-xl border object-cover ${active ? "border-saffron/60" : "border-amber-900/10"}`}
                      />
                    ) : (
                      <span className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl text-sm font-semibold ${active ? "bg-saffron text-white" : "bg-maroon/10 text-maroon"}`}>
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
                  {active && <Equalizer playing={playing} />}
                </motion.button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Floating player above the mobile bottom navigation */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed inset-x-3 bottom-[4.5rem] z-40 md:inset-x-auto md:right-6 md:left-6 md:bottom-4"
      >
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-amber-200/40 bg-maroon/95 text-ivory shadow-xl backdrop-blur-xl">
          <audio ref={audioRef} preload="none" />
          <div className="px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="hidden h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-xl bg-white/10 text-saffron-light sm:flex">
                  {track && covers[track.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getPhotoUrl(covers[track.id])} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Music2 size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">
                      {track ? track.name.replace(/\.[^/.]+$/, "") : ""}
                    </p>
                    <Equalizer playing={playing} />
                  </div>
                  {track?.collectionLabel && (
                    <p className="truncate text-[11px] text-ivory/60">{track.collectionLabel}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ivory/75">
                    <span className="w-9 tabular-nums">{fmt(progress)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={1}
                      value={Math.min(progress, duration || progress)}
                      onChange={(event) => seekTo(Number(event.target.value))}
                      className="h-2 flex-1 cursor-pointer accent-saffron"
                      aria-label="Seek audio"
                    />
                    <span className="w-9 text-right tabular-nums">{fmt(duration)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => setShuffle((value) => !value)}
                  aria-label="Shuffle"
                  aria-pressed={shuffle}
                  title="Shuffle"
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/15 ${shuffle ? "text-saffron-light" : "text-ivory/80"}`}
                >
                  <Shuffle size={17} />
                </button>
                <button
                  type="button"
                  onClick={previousTrack}
                  aria-label="Previous track"
                  title="Previous track"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ivory/90 hover:bg-white/10 active:bg-white/15"
                >
                  <SkipBack size={19} />
                </button>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={playing ? "Pause" : "Play"}
                  title={playing ? "Pause" : "Play"}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-saffron text-white shadow-md transition hover:bg-saffron-dark active:scale-95"
                >
                  {playing ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => nextTrack()}
                  aria-label="Next track"
                  title="Next track"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ivory/90 hover:bg-white/10 active:bg-white/15"
                >
                  <SkipForward size={19} />
                </button>
                <button
                  type="button"
                  onClick={cycleRepeat}
                  aria-label={`Repeat: ${repeat}`}
                  title={`Repeat: ${repeat}`}
                  aria-pressed={repeat !== "off"}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/15 ${repeat !== "off" ? "text-saffron-light" : "text-ivory/80"}`}
                >
                  {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((value) => !value)}
                  aria-label="Player options"
                  aria-expanded={showAdvanced}
                  title="Timer and player options"
                  className={`inline-flex h-10 min-w-[3.25rem] items-center justify-center gap-1 rounded-full px-2 text-[11px] hover:bg-white/10 active:bg-white/15 ${
                    sleepRemaining !== null ? "text-saffron-light" : "text-ivory/80"
                  }`}
                >
                  <Timer size={17} />
                  <span className="tabular-nums">{timerLabel}</span>
                </button>
              </div>
            </div>

            {showAdvanced && (
              <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] text-ivory/70" htmlFor="sleep-timer">
                    Sleep timer
                  </label>
                  <select
                    id="sleep-timer"
                    value={sleepMinutes ?? ""}
                    onChange={(event) =>
                      setSleepTimer(event.target.value ? Number(event.target.value) : null)
                    }
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-xs text-white outline-none"
                  >
                    <option value="">Off</option>
                    {SLEEP_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                  {sleepRemaining !== null && (
                    <p className="mt-1 text-[11px] tabular-nums text-saffron-light">
                      Stops in {fmt(sleepRemaining)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-ivory/70" htmlFor="playback-speed">
                    Playback speed
                  </label>
                  <select
                    id="playback-speed"
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-xs text-white outline-none"
                  >
                    {SPEED_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}×
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] text-ivory/70">Volume</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMuted((value) => !value)}
                      aria-label={muted ? "Unmute" : "Mute"}
                      className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg hover:bg-white/10"
                    >
                      {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(event) => {
                        setVolume(Number(event.target.value));
                        setMuted(false);
                      }}
                      className="h-2 flex-1 cursor-pointer accent-saffron"
                      aria-label="Volume"
                    />
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] text-ivory/70">Shortcuts</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => seekBy(-10)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-white/10 px-2 text-xs hover:bg-white/15"
                    >
                      <RotateCcw size={14} /> 10s
                    </button>
                    <button
                      type="button"
                      onClick={() => seekBy(10)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-white/10 px-2 text-xs hover:bg-white/15"
                    >
                      <RotateCw size={14} /> 10s
                    </button>
                    <button
                      type="button"
                      onClick={stop}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-white/10 px-2 text-xs hover:bg-white/15"
                    >
                      <Square size={13} /> Stop
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
