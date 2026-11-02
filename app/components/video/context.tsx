"use client";

import { createContext, useContext } from "react";
import type { VideoConfig } from "@/lib/video-config";

type VideoContextValue = {
  config: VideoConfig;
  openConfig: (slug: string, opts?: { editId?: string; mode?: "add" | "quote" }) => void;
  toast: (message: string) => void;
};

const VideoContext = createContext<VideoContextValue | null>(null);

export function VideoProvider({ value, children }: { value: VideoContextValue; children: React.ReactNode }) {
  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
}

export function useVideo() {
  const value = useContext(VideoContext);
  if (!value) throw new Error("useVideo must be used inside VideoShell");
  return value;
}
