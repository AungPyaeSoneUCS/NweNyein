"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getAudioUrl } from "@/lib/driveUrls";
import type { AudioTrack, RepeatMode, SongGroup } from "@/lib/player";

interface PlayerContextValue {
  groups: SongGroup[];
  covers: Record<string, string>;
  activeGroupId: string | null;
  currentId: string | null;
  track: AudioTrack | null;
  upNext: AudioTrack | null;
  playing: boolean;
  buffering: boolean;
  error: string | null;
  progress: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;
  volume: number;
  muted: boolean;
  speed: number;
  sleepChoice: string;
  sleepMinutes: number | null;
  sleepRemaining: number | null;
  fmt: (seconds: number) => string;
  setQueue: (
    groups: SongGroup[],
    covers: Record<string, string>,
    playId?: string
  ) => void;
  setActiveGroup: (id: string) => void;
  playTrack: (
    id: string,
    nextGroups?: SongGroup[],
    nextCovers?: Record<string, string>
  ) => void;
  toggle: () => void;
  stop: () => void;
  seekTo: (value: number) => void;
  seekBy: (delta: number) => void;
  nextTrack: (shouldPlay?: boolean) => void;
  previousTrack: () => void;
  cycleRepeat: () => void;
  setShuffle: (value: boolean) => void;
  setVolume: (value: number) => void;
  setMuted: (value: boolean) => void;
  setSpeed: (value: number) => void;
  chooseSleep: (value: string) => void;
  applyCustomSleep: (minutes: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside PlayerProvider");
  return value;
}

export default function PlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayRef = useRef(false);
  const groupsRef = useRef<SongGroup[]>([]);
  const activeGroupIdRef = useRef<string | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const coversRef = useRef<Record<string, string>>({});

  const [groups, setGroups] = useState<SongGroup[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolumeState] = useState(0.85);
  const [muted, setMutedState] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [sleepChoice, setSleepChoice] = useState("");
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);

  const activeGroup = groups.find((group) => group.id === activeGroupId) || groups[0] || null;
  const playable = activeGroup?.tracks || [];
  const currentIndex = Math.max(
    0,
    playable.findIndex((item) => item.id === currentId)
  );
  const track = playable[currentIndex] || null;
  const upNext =
    playable.length > 1 ? playable[(currentIndex + 1) % playable.length] : null;

  const fmt = useCallback((seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }, []);

  const setCurrent = useCallback((id: string | null) => {
    currentIdRef.current = id;
    setCurrentId(id);
  }, []);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    activeGroupIdRef.current = activeGroupId;
  }, [activeGroupId]);

  useEffect(() => {
    currentIdRef.current = currentId;
  }, [currentId]);

  useEffect(() => {
    coversRef.current = covers;
  }, [covers]);

  const playAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentIdRef.current) return;
    setError(null);
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  const setQueue = useCallback(
    (nextGroups: SongGroup[], nextCovers: Record<string, string>, playId?: string) => {
      const list = nextGroups || [];
      groupsRef.current = list;
      coversRef.current = nextCovers || {};
      setGroups(list);
      setCovers(coversRef.current);

      if (!list.length) {
        activeGroupIdRef.current = null;
        setActiveGroupId(null);
        setCurrent(null);
        setPlaying(false);
        return;
      }

      const preferredGroup = playId
        ? list.find((group) => group.tracks.some((item) => item.id === playId))
        : list.find((group) => group.id === activeGroupIdRef.current);
      const group = preferredGroup || list[0];
      activeGroupIdRef.current = group.id;
      setActiveGroupId(group.id);

      const keepsCurrent = group.tracks.some(
        (item) => item.id === currentIdRef.current
      );
      const nextId =
        playId ||
        (keepsCurrent ? currentIdRef.current : group.tracks[0]?.id) ||
        null;

      if (playId) {
        if (playId === currentIdRef.current) {
          playAudio();
        } else {
          autoPlayRef.current = true;
          setPlaying(true);
        }
      } else if (!keepsCurrent) {
        autoPlayRef.current = false;
        setPlaying(false);
      }

      setCurrent(nextId);
    },
    [playAudio, setCurrent]
  );

  const setActiveGroup = useCallback(
    (id: string) => {
      const group = groupsRef.current.find((candidate) => candidate.id === id);
      if (!group) return;

      activeGroupIdRef.current = id;
      setActiveGroupId(id);

      const keepsCurrent = group.tracks.some(
        (item) => item.id === currentIdRef.current
      );
      if (!keepsCurrent) {
        autoPlayRef.current = false;
        setPlaying(false);
        setProgress(0);
        setDuration(0);
        setCurrent(group.tracks[0]?.id || null);
      }
    },
    [setCurrent]
  );

  const playTrack = useCallback(
    (
      id: string,
      nextGroups?: SongGroup[],
      nextCovers?: Record<string, string>
    ) => {
      if (nextGroups && nextGroups !== groupsRef.current) {
        setQueue(nextGroups, nextCovers || coversRef.current, id);
        return;
      }
      if (id === currentIdRef.current) {
        playAudio();
        return;
      }
      autoPlayRef.current = true;
      setPlaying(true);
      setCurrent(id);
    },
    [playAudio, setCurrent, setQueue]
  );

  const goTo = useCallback(
    (index: number, shouldPlay: boolean) => {
      const list =
        groupsRef.current.find((group) => group.id === activeGroupIdRef.current)
          ?.tracks || [];
      if (!list.length) return;
      const nextId = list[(index + list.length) % list.length].id;

      if (nextId === currentIdRef.current) {
        if (shouldPlay) playAudio();
        else audioRef.current?.pause();
        setPlaying(shouldPlay);
        return;
      }

      autoPlayRef.current = shouldPlay;
      setPlaying(shouldPlay);
      setCurrent(nextId);
    },
    [playAudio, setCurrent]
  );

  const nextTrack = useCallback(
    (shouldPlay = playing) => {
      const list =
        groupsRef.current.find((group) => group.id === activeGroupIdRef.current)
          ?.tracks || [];
      const index = Math.max(
        0,
        list.findIndex((item) => item.id === currentIdRef.current)
      );
      if (shuffle && list.length > 1) {
        let random = index;
        while (random === index) random = Math.floor(Math.random() * list.length);
        goTo(random, shouldPlay);
        return;
      }
      goTo(index + 1, shouldPlay);
    },
    [goTo, playing, shuffle]
  );

  const previousTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      return;
    }
    const list =
      groupsRef.current.find((group) => group.id === activeGroupIdRef.current)
        ?.tracks || [];
    const index = Math.max(
      0,
      list.findIndex((item) => item.id === currentIdRef.current)
    );
    goTo(index - 1, playing);
  }, [goTo, playing]);

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
  }, [volume, muted, speed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => {
      setPlaying(true);
      setBuffering(false);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onTime = () => setProgress(audio.currentTime || 0);
    const onMeta = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
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

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentIdRef.current) {
      const first = groupsRef.current[0]?.tracks[0]?.id;
      if (first) playTrack(first);
      return;
    }
    if (playing) audio.pause();
    else playAudio();
  }, [playAudio, playTrack, playing]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setBuffering(false);
    setProgress(0);
    setError(null);
    setSleepChoice("");
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

  const cycleRepeat = useCallback(
    () =>
      setRepeat((mode) =>
        mode === "off" ? "all" : mode === "all" ? "one" : "off"
      ),
    []
  );

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    if (value > 0) setMutedState(false);
  }, []);

  const setMuted = useCallback((value: boolean) => setMutedState(value), []);

  const setSpeed = useCallback((value: number) => setSpeedState(value), []);

  const chooseSleep = useCallback((value: string) => {
    if (value === "custom") {
      setSleepChoice("custom");
      setSleepMinutes(null);
      setSleepRemaining(null);
      return;
    }
    if (!value) {
      setSleepChoice("");
      setSleepMinutes(null);
      setSleepRemaining(null);
      return;
    }
    const minutes = Number(value);
    setSleepChoice(value);
    setSleepMinutes(minutes);
    setSleepRemaining(minutes * 60);
  }, []);

  const applyCustomSleep = useCallback((minutes: number) => {
    const safe = Math.min(480, Math.max(1, Math.round(minutes)));
    setSleepChoice("custom");
    setSleepMinutes(safe);
    setSleepRemaining(safe * 60);
  }, []);

  useEffect(() => {
    if (sleepRemaining === null) return;
    const timer = window.setInterval(() => {
      setSleepRemaining((value) =>
        value === null ? null : Math.max(0, value - 1)
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sleepRemaining !== null]);

  useEffect(() => {
    if (sleepRemaining !== 0) return;
    audioRef.current?.pause();
    setPlaying(false);
    setSleepChoice("");
    setSleepMinutes(null);
    setSleepRemaining(null);
  }, [sleepRemaining]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName) ||
          target.isContentEditable)
      ) {
        return;
      }
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
        setMuted(!muted);
      } else if (event.key.toLowerCase() === "r") {
        cycleRepeat();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, seekBy, nextTrack, previousTrack, muted, setMuted, cycleRepeat]);

  const value: PlayerContextValue = {
    groups,
    covers,
    activeGroupId,
    currentId,
    track,
    upNext,
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
    sleepMinutes,
    sleepRemaining,
    fmt,
    setQueue,
    setActiveGroup,
    playTrack,
    toggle,
    stop,
    seekTo,
    seekBy,
    nextTrack,
    previousTrack,
    cycleRepeat,
    setShuffle,
    setVolume,
    setMuted,
    setSpeed,
    chooseSleep,
    applyCustomSleep,
  };

  return (
    <PlayerContext.Provider value={value}>
      <audio ref={audioRef} preload="none" />
      {children}
    </PlayerContext.Provider>
  );
}
