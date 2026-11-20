"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Responsive wrapper of the Client space: fixed sidebar on desktop, off-canvas drawer (burger in the header) on
 * tablet / mobile. The sidebar and header themselves are server-rendered and passed in.
 */
export function ClientShell({ sidebar, header, children }: { sidebar: React.ReactNode; header: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={open ? "cs is-menu-open" : "cs"}>
      <aside
        id="cs-sidebar"
        className="cs-side"
        // Following a menu link closes the drawer.
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
      >
        <button type="button" className="cs-side-close" aria-label="Fermer le menu" onClick={() => setOpen(false)}>
          <X size={20} aria-hidden="true" />
        </button>
        {sidebar}
      </aside>
      {open && <div className="cs-scrim" aria-hidden="true" onClick={() => setOpen(false)} />}
      <div className="cs-main">
        <header className="cs-head">
          <button type="button" className="cs-burger" aria-label="Ouvrir le menu" aria-controls="cs-sidebar" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu size={22} aria-hidden="true" />
          </button>
          {header}
        </header>
        {children}
      </div>
    </div>
  );
}
