"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Gauge,
  ListMusic,
  Loader2,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
  Timer,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getAudioUrl, getPhotoUrl, type DriveFile } from "@/lib/driveUrls";
import SelectMenu from "./SelectMenu";

export type AudioTrack = DriveFile & { collectionLabel?: string | null };

export interface SongGroup {
  id: string;
  name: string;
  tracks: AudioTrack[];
}

type RepeatMode = "off" | "all" | "one";
const SLEEP_OPTIONS = [5, 10, 15, 30, 45, 60];
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_SELECT_OPTIONS = [
  { value: "", label: "Off" },
  ...SLEEP_OPTIONS.map((minutes) => ({
    value: String(minutes),
    label: `${minutes} minutes`,
  })),
];
const SPEED_SELECT_OPTIONS = SPEED_OPTIONS.map((value) => ({
  value: String(value),
  label: `${value}×`,
}));

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
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const upNext = playable.length > 1 ? playable[(currentIndex + 1) % playable.length] : null;

  const fmt = useCallback((seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }, []);

  const playAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    setError(null);
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [track]);

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
    setError(null);
    setBuffering(false);

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
    const onPlay = () => { setPlaying(true); setBuffering(false); };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onTime = () => setProgress(audio.currentTime || 0);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onError = () => {
      setBuffering(false);
      setPlaying(false);
      setError("This audio could not be loaded. Please try another track.");
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", onError);
    };
  }, [handleEnded]);

  const selectTrack = useCallback(
    (id: string) => {
      setShowAdvanced(false);
      if (id === currentId) {
        playAudio();
        return;
      }
      autoPlayRef.current = true;
      setCurrentId(id);
      setPlaying(true);
    },
    [currentId, playAudio]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.pause();
    } else {
      playAudio();
    }
  }, [playing, playAudio, track]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setBuffering(false);
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
  const progressPercent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  if (!groups.length || !playable.length) {
    return <div className="card p-8 text-center text-slate-600">No audio tracks available.</div>;
  }

  const secondaryButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent transition hover:border-white/15 hover:bg-white/10 active:bg-white/15 sm:h-10 sm:w-10";

  return (
    <div className="space-y-6 pb-56 md:pb-44">
      {showCollectionCards && (
        <section aria-label="Singers and albums">
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
        <ul className="space-y-2">
          {playable.map((item, index) => {
            const active = item.id === track?.id;
            const cover = covers[item.id];
            return (
              <li key={item.id}>
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => selectTrack(item.id)}
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
        className="fixed inset-x-3 bottom-[4.5rem] z-50 md:inset-x-auto md:right-6 md:left-6 md:bottom-4"
      >
        <div className="relative mx-auto max-w-4xl rounded-2xl border border-amber-200/40 bg-gradient-to-br from-maroon via-maroon-light to-maroon-dark/95 text-ivory shadow-2xl">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute -top-16 -left-8 h-40 w-40 rounded-full bg-saffron/20 blur-2xl" />
            <div className="absolute -right-10 -bottom-16 h-48 w-48 rounded-full bg-amber-200/10 blur-2xl" />
          </div>
          <div className="absolute inset-x-0 top-0 h-0.5 bg-white/10" aria-hidden>
            <div
              className="h-full bg-gradient-to-r from-saffron to-amber-200 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <audio ref={audioRef} preload="none" />
          <div className="relative px-3.5 py-3 sm:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-10 w-10 flex-none overflow-hidden rounded-xl border border-white/15 bg-white/10 text-saffron-light sm:h-11 sm:w-11">
                  {track && covers[track.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getPhotoUrl(covers[track.id])} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Music2 size={19} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-saffron-light">
                      Now playing
                    </span>
                    <Equalizer playing={playing} />
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold text-white" aria-live="polite">
                    {track ? track.name.replace(/\.[^/.]+$/, "") : ""}
                  </p>
                  {track?.collectionLabel && (
                    <p className="truncate text-[11px] text-ivory/60">{track.collectionLabel}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-ivory/75">
                    <span className="w-9 tabular-nums">{fmt(progress)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={1}
                      value={Math.min(progress, duration || progress)}
                      onChange={(event) => seekTo(Number(event.target.value))}
                      className="h-1.5 flex-1 cursor-pointer accent-saffron"
                      aria-label="Seek audio"
                    />
                    <span className="w-9 text-right tabular-nums">{fmt(duration)}</span>
                  </div>
                  {error && <p className="mt-1 text-[11px] text-amber-200">{error}</p>}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => setShuffle((value) => !value)}
                  aria-label="Shuffle"
                  aria-pressed={shuffle}
                  title="Shuffle"
                  className={`${secondaryButton} ${shuffle ? "border-saffron/30 bg-saffron/20 text-saffron-light" : "text-ivory/75"}`}
                >
                  <Shuffle size={17} />
                </button>
                <button
                  type="button"
                  onClick={previousTrack}
                  aria-label="Previous track"
                  title="Previous track"
                  className={`${secondaryButton} text-ivory/90`}
                >
                  <SkipBack size={18} />
                </button>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={playing ? "Pause" : "Play"}
                  title={playing ? "Pause" : "Play"}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-dark text-white shadow-lg transition hover:brightness-110 active:scale-95 sm:h-12 sm:w-12"
                >
                  {buffering ? (
                    <Loader2 size={21} className="animate-spin" />
                  ) : playing ? (
                    <Pause size={21} />
                  ) : (
                    <Play size={21} className="ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => nextTrack()}
                  aria-label="Next track"
                  title="Next track"
                  className={`${secondaryButton} text-ivory/90`}
                >
                  <SkipForward size={18} />
                </button>
                <button
                  type="button"
                  onClick={cycleRepeat}
                  aria-label={`Repeat: ${repeat}`}
                  title={`Repeat: ${repeat}`}
                  aria-pressed={repeat !== "off"}
                  className={`${secondaryButton} ${repeat !== "off" ? "border-saffron/30 bg-saffron/20 text-saffron-light" : "text-ivory/75"}`}
                >
                  {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((value) => !value)}
                  aria-label="Player options"
                  aria-expanded={showAdvanced}
                  title="Timer and player options"
                  className={`inline-flex h-9 min-w-[3.25rem] items-center justify-center gap-1 rounded-full border px-2 text-[11px] transition hover:bg-white/10 sm:h-10 ${
                    sleepRemaining !== null
                      ? "border-saffron/40 bg-saffron/15 text-saffron-light"
                      : "border-white/15 text-ivory/80"
                  }`}
                >
                  <Timer size={16} />
                  <span className="tabular-nums">{timerLabel}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="relative z-[55] mt-3 border-t border-white/10 pt-3"
                >
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    <SelectMenu
                      label="Sleep timer"
                      value={sleepMinutes === null ? "" : String(sleepMinutes)}
                      options={SLEEP_SELECT_OPTIONS}
                      onChange={(value) => {
                        const minutes = value ? Number(value) : null;
                        setSleepMinutes(minutes);
                        setSleepRemaining(minutes === null ? null : minutes * 60);
                      }}
                      icon={Timer}
                    />

                    <SelectMenu
                      label="Playback speed"
                      value={String(speed)}
                      options={SPEED_SELECT_OPTIONS}
                      onChange={(value) => setSpeed(Number(value))}
                      icon={Gauge}
                    />

                    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-ivory/55">
                        Volume
                      </span>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMuted((value) => !value)}
                          aria-label={muted ? "Unmute" : "Mute"}
                          className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg hover:bg-white/10"
                        >
                          {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
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
                          className="h-1.5 flex-1 cursor-pointer accent-saffron"
                          aria-label="Volume"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-ivory/55">
                        Quick actions
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => seekBy(-10)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] hover:bg-white/15"
                        >
                          <RotateCcw size={13} /> 10s
                        </button>
                        <button
                          type="button"
                          onClick={() => seekBy(10)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] hover:bg-white/15"
                        >
                          <RotateCw size={13} /> 10s
                        </button>
                        <button
                          type="button"
                          onClick={stop}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] hover:bg-white/15"
                        >
                          <Square size={12} /> Stop
                        </button>
                      </div>
                    </div>
                  </div>

                  {(upNext || sleepRemaining !== null) && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px]">
                      {upNext ? (
                        <span className="flex min-w-0 items-center gap-2 text-ivory/75">
                          <ListMusic size={13} className="flex-none text-saffron-light" />
                          <span className="text-ivory/55">Up next</span>
                          <span className="truncate text-white">
                            {upNext.name.replace(/\.[^/.]+$/, "")}
                          </span>
                        </span>
                      ) : (
                        <span />
                      )}
                      {sleepRemaining !== null && (
                        <span className="tabular-nums text-saffron-light">
                          Stops in {fmt(sleepRemaining)}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
