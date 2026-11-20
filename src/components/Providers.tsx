"use client";

import { SessionProvider } from "next-auth/react";
import AudioPlayer from "./AudioPlayer";
import PlayerProvider from "./PlayerProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PlayerProvider>
        {children}
        <AudioPlayer />
      </PlayerProvider>
    </SessionProvider>
  );
}
