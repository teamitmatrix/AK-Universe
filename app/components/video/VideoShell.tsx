"use client";

import { useCallback, useMemo, useState } from "react";
import type { VideoConfig } from "@/lib/video-config";
import { useToast } from "@/components/ui/Toast";
import { Configurator } from "./Configurator";
import { VideoProvider } from "./context";
import { VideoFooter } from "./VideoFooter";
import { VideoHeader, type VideoNav } from "./VideoHeader";

type Draft = { slug: string; editId?: string; mode: "add" | "quote" };

export function VideoShell({
  config,
  active = "",
  currentSlug,
  bare = false,
  header = true,
  children,
}: {
  config: VideoConfig;
  active?: VideoNav;
  currentSlug?: string;
  /** Page supplies the main site header and footer (marketing section). */
  bare?: boolean;
  /** The video catalogue bar. The information step does not show it. */
  header?: boolean;
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toast, toastNode] = useToast();
  const openConfig = useCallback((slug: string, opts?: { editId?: string; mode?: "add" | "quote" }) => {
    setDraft({ slug, editId: opts?.editId, mode: opts?.mode ?? "add" });
  }, []);
  const closeConfig = useCallback(() => setDraft(null), []);
  const value = useMemo(() => ({ config, openConfig, toast }), [config, openConfig, toast]);

  return (
    <VideoProvider value={value}>
      {bare || !header ? null : <VideoHeader active={active} currentSlug={currentSlug} />}
      {children}
      {bare ? null : <VideoFooter />}
      {draft && (
        <Configurator
          slug={draft.slug}
          editId={draft.editId}
          mode={draft.mode}
          onClose={closeConfig}
        />
      )}
      {toastNode}
    </VideoProvider>
  );
}
