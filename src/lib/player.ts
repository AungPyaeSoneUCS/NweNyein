import type { DriveFile } from "./driveUrls";

export type AudioTrack = DriveFile & { collectionLabel?: string | null };

export interface SongGroup {
  id: string;
  name: string;
  tracks: AudioTrack[];
}

export type RepeatMode = "off" | "all" | "one";

export const SLEEP_OPTIONS = [5, 10, 15, 30, 45, 60];
export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
