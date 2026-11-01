"use client";

import { useEffect, type MouseEvent } from "react";

type Props = {
  html: string;
  scripts: string[];
  light: boolean;
  service?: string;
};

type LegacyWindow = Window & { __akLegacyPath?: string };

function loadScript(src: string) {
  return new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => {
      console.error(`AK Universe script failed: ${src}`);
      resolve();
    };
    document.body.appendChild(script);
  });
}

export default function LegacyPageClient({ html, scripts, light, service }: Props) {
  useEffect(() => {
    const win = window as LegacyWindow;
    const path = window.location.pathname;

    // Legacy scripts declare globals and bind once per document: a second legacy
    // page reached through client-side navigation needs a fresh document.
    if (win.__akLegacyPath && win.__akLegacyPath !== path) {
      window.location.reload();
      return;
    }
    if (win.__akLegacyPath === path) return; // React Strict Mode re-run
    win.__akLegacyPath = path;

    const base = document.createElement("base");
    base.href = "/";
    document.head.prepend(base);
    if (light) document.body.classList.add("light");
    if (service) document.body.dataset.service = service;

    void (async () => {
      for (const src of scripts) await loadScript(src);
      // main.js / projet.js initialise on DOMContentLoaded, which has already fired.
      document.dispatchEvent(new Event("DOMContentLoaded"));
    })();
  }, [scripts, light, service]);

  // With <base href="/">, "#section" links would point at the home page.
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as Element).closest?.("a[href^='#']");
    if (!anchor) return;
    const id = anchor.getAttribute("href")!.slice(1);
    event.preventDefault();
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <div
      className={light ? "theme-light" : undefined}
      onClick={handleClick}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
