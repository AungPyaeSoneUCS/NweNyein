"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Music2 } from "lucide-react";
import { motion } from "framer-motion";
import { getAudioUrl, type DriveFile } from "@/lib/driveUrls";

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

export default function AudioPlayer({ tracks }: { tracks: DriveFile[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const playable = useMemo(
    () => tracks.filter((t) => t.mimeType?.startsWith("audio/") || /\.(mp3|m4a|wav|ogg)$/i.test(t.name)),
    [tracks]
  );

  const track = playable[current];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setCurrent((c) => (c + 1) % Math.max(playable.length, 1));
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [playable.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.src = getAudioUrl(track.id);
    audio.load();
    setProgress(0);
    setDuration(0);
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const val = Number(e.target.value);
    audio.currentTime = val;
    setProgress(val);
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (!playable.length) {
    return <div className="card p-8 text-center text-slate-600">No audio tracks available.</div>;
  }

  return (
    <div className="space-y-6 pb-40 md:pb-32">
      <ul className="space-y-2">
        {playable.map((t, i) => {
          const active = i === current;
          return (
            <li key={t.id}>
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setCurrent(i);
                  setPlaying(true);
                  setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
                }}
                className={`flex w-full min-h-[56px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                  active
                    ? "border-amber-200/70 bg-white/90 shadow-sm ring-1 ring-amber-200/50"
                    : "border-amber-900/10 bg-white/70 hover:bg-white hover:shadow-sm"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl text-sm font-semibold ${active ? "bg-saffron text-white" : "bg-maroon/10 text-maroon"}`}>
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-charcoal">{t.name.replace(/\.[^/.]+$/, "")}</span>
                    <span className="block text-xs text-slate-500">Dhamma audio</span>
                  </span>
                </span>
                {active && <Equalizer playing={playing} />}
              </motion.button>
            </li>
          );
        })}
      </ul>

      {/* Floating mini-player above mobile bottom nav */}
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
                <div className="hidden sm:flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/10 text-saffron-light">
                  <Music2 size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">{track ? track.name.replace(/\.[^/.]+$/, "") : ""}</p>
                    <Equalizer playing={playing} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ivory/75">
                    <span className="w-8 tabular-nums">{fmt(progress)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={1}
                      value={progress}
                      onChange={seek}
                      className="h-2 flex-1 cursor-pointer accent-saffron"
                      aria-label="Seek audio"
                    />
                    <span className="w-8 text-right tabular-nums">{fmt(duration)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <button className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/15" onClick={() => setCurrent((c) => (c - 1 + playable.length) % playable.length)} aria-label="Previous track">
                  <SkipBack size={20} />
                </button>
                <button className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-saffron text-white shadow-md hover:bg-saffron-dark active:scale-95 transition" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
                  {playing ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
                </button>
                <button className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 active:bg-white/15" onClick={() => setCurrent((c) => (c + 1) % playable.length)} aria-label="Next track">
                  <SkipForward size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
