"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Gauge,
  ListMusic,
  Loader2,
  Maximize2,
  Minimize2,
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
  Volume2,
  VolumeX,
} from "lucide-react";
import { getPhotoUrl } from "@/lib/driveUrls";
import { SLEEP_OPTIONS, SPEED_OPTIONS } from "@/lib/player";
import { usePlayer } from "./PlayerProvider";
import SelectMenu from "./SelectMenu";

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

export default function AudioPlayer() {
  const pathname = usePathname();
  const player = usePlayer();
  const [expanded, setExpanded] = useState(pathname === "/songs");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("15");

  useEffect(() => {
    setExpanded(pathname === "/songs");
    setShowAdvanced(false);
  }, [pathname]);

  const sleepOptions = useMemo(
    () => [
      { value: "", label: "Off" },
      ...SLEEP_OPTIONS.map((minutes) => ({
        value: String(minutes),
        label: `${minutes} minutes`,
      })),
      {
        value: "custom",
        label:
          player.sleepChoice === "custom" && player.sleepMinutes
            ? `${player.sleepMinutes} min (custom)`
            : "Custom...",
      },
    ],
    [player.sleepChoice, player.sleepMinutes]
  );

  const speedOptions = useMemo(
    () =>
      SPEED_OPTIONS.map((value) => ({
        value: String(value),
        label: `${value}×`,
      })),
    []
  );

  if (!player.track) return null;

  const {
    track,
    covers,
    playing,
    buffering,
    error,
    progress,
    duration,
    repeat,
    shuffle,
    volume,
    muted,
    speed,
    sleepChoice,
    sleepRemaining,
    fmt,
  } = player;

  const progressPercent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  const timerLabel =
    sleepRemaining !== null
      ? fmt(sleepRemaining)
      : sleepChoice === "custom" && player.sleepMinutes
        ? `${player.sleepMinutes}m`
        : sleepChoice
          ? `${sleepChoice}m`
          : "Timer";

  const secondaryButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent transition hover:border-white/15 hover:bg-white/10 active:bg-white/15 sm:h-10 sm:w-10";

  const cover =
    track && covers[track.id] ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={getPhotoUrl(covers[track.id])} alt="" className="h-full w-full object-cover" />
    ) : (
      <span className="flex h-full w-full items-center justify-center">
        <Music2 size={18} />
      </span>
    );

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-3 bottom-[4.5rem] z-[58] md:inset-x-auto md:right-6 md:left-6 md:bottom-4"
    >
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-amber-200/40 bg-gradient-to-br from-maroon via-maroon-light to-maroon-dark/95 text-ivory shadow-2xl">
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

        {!expanded ? (
          <div className="relative flex items-center gap-2.5 px-3 py-2.5 sm:px-4">
            <div className="h-9 w-9 flex-none overflow-hidden rounded-xl border border-white/15 bg-white/10 text-saffron-light sm:h-10 sm:w-10">
              {cover}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-xs font-semibold text-white" aria-live="polite">
                  {track.name.replace(/\.[^/.]+$/, "")}
                </p>
                <Equalizer playing={playing} />
              </div>
              <p className="truncate text-[10px] text-ivory/60">
                {track.collectionLabel || "Dhamma audio"}
              </p>
            </div>
            <button
              type="button"
              onClick={player.toggle}
              aria-label={playing ? "Pause" : "Play"}
              title={playing ? "Pause" : "Play"}
              className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-saffron text-white shadow-md transition hover:brightness-110 active:scale-95"
            >
              {buffering ? (
                <Loader2 size={17} className="animate-spin" />
              ) : playing ? (
                <Pause size={17} />
              ) : (
                <Play size={17} className="ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="Open player controls"
              title="Open player controls"
              className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/15 text-ivory/85 transition hover:bg-white/10"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        ) : (
          <div className="relative px-3.5 py-3 sm:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-10 w-10 flex-none overflow-hidden rounded-xl border border-white/15 bg-white/10 text-saffron-light sm:h-11 sm:w-11">
                  {cover}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-saffron-light">
                      Now playing
                    </span>
                    <Equalizer playing={playing} />
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold text-white" aria-live="polite">
                    {track.name.replace(/\.[^/.]+$/, "")}
                  </p>
                  {track.collectionLabel && (
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
                      onChange={(event) => player.seekTo(Number(event.target.value))}
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
                  onClick={() => player.setShuffle(!shuffle)}
                  aria-label="Shuffle"
                  aria-pressed={shuffle}
                  title="Shuffle"
                  className={`${secondaryButton} ${shuffle ? "border-saffron/30 bg-saffron/20 text-saffron-light" : "text-ivory/75"}`}
                >
                  <Shuffle size={17} />
                </button>
                <button
                  type="button"
                  onClick={player.previousTrack}
                  aria-label="Previous track"
                  title="Previous track"
                  className={`${secondaryButton} text-ivory/90`}
                >
                  <SkipBack size={18} />
                </button>
                <button
                  type="button"
                  onClick={player.toggle}
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
                  onClick={() => player.nextTrack()}
                  aria-label="Next track"
                  title="Next track"
                  className={`${secondaryButton} text-ivory/90`}
                >
                  <SkipForward size={18} />
                </button>
                <button
                  type="button"
                  onClick={player.cycleRepeat}
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
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvanced(false);
                    setExpanded(false);
                  }}
                  aria-label="Minimize player"
                  title="Minimize player"
                  className={secondaryButton}
                >
                  <Minimize2 size={16} />
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
                    <div>
                      <SelectMenu
                        label="Sleep timer"
                        value={sleepChoice}
                        options={sleepOptions}
                        onChange={player.chooseSleep}
                        icon={Timer}
                      />
                      {sleepChoice === "custom" && (
                        <div className="mt-2 rounded-xl border border-saffron/30 bg-saffron/10 p-2">
                          <label
                            htmlFor="custom-sleep-minutes"
                            className="block text-[10px] font-medium uppercase tracking-wide text-ivory/65"
                          >
                            Custom minutes
                          </label>
                          <div className="mt-1.5 flex gap-1.5">
                            <input
                              id="custom-sleep-minutes"
                              type="number"
                              min={1}
                              max={480}
                              inputMode="numeric"
                              value={customMinutes}
                              onChange={(event) => setCustomMinutes(event.target.value)}
                              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-saffron/50"
                              aria-label="Custom sleep minutes"
                            />
                            <button
                              type="button"
                              onClick={() => player.applyCustomSleep(Number(customMinutes))}
                              className="inline-flex h-8 flex-none items-center gap-1 rounded-lg bg-saffron px-2 text-[11px] font-semibold text-white hover:bg-saffron-dark"
                              aria-label="Apply custom sleep timer"
                            >
                              <Check size={13} /> Set
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <SelectMenu
                      label="Playback speed"
                      value={String(speed)}
                      options={speedOptions}
                      onChange={(value) => player.setSpeed(Number(value))}
                      icon={Gauge}
                    />

                    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-ivory/55">
                        Volume
                      </span>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => player.setMuted(!muted)}
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
                          onChange={(event) => player.setVolume(Number(event.target.value))}
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
                          onClick={() => player.seekBy(-10)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] hover:bg-white/15"
                        >
                          <RotateCcw size={13} /> 10s
                        </button>
                        <button
                          type="button"
                          onClick={() => player.seekBy(10)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] hover:bg-white/15"
                        >
                          <RotateCw size={13} /> 10s
                        </button>
                        <button
                          type="button"
                          onClick={player.stop}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] hover:bg-white/15"
                        >
                          <Square size={12} /> Stop
                        </button>
                      </div>
                    </div>
                  </div>

                  {(player.upNext || sleepRemaining !== null) && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px]">
                      {player.upNext ? (
                        <span className="flex min-w-0 items-center gap-2 text-ivory/75">
                          <ListMusic size={13} className="flex-none text-saffron-light" />
                          <span className="text-ivory/55">Up next</span>
                          <span className="truncate text-white">
                            {player.upNext.name.replace(/\.[^/.]+$/, "")}
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
        )}
      </div>
    </motion.div>
  );
}
