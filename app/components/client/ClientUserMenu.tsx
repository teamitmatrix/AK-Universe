"use client";

import Link from "next/link";
import { ChevronDown, Headphones, LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Avatar + name in the header, with a small account menu. */
export function ClientUserMenu({ name, initials }: { name: string; initials: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="cs-user" ref={box}>
      <button type="button" className="cs-user-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="cs-avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="cs-user-name">{name}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="cs-menu" role="menu">
          <Link href="/client/dashboard/mon-compte" role="menuitem" onClick={() => setOpen(false)}>
            <User size={16} aria-hidden="true" /> Mon compte
          </Link>
          <Link href="/client/dashboard/support" role="menuitem" onClick={() => setOpen(false)}>
            <Headphones size={16} aria-hidden="true" /> Support
          </Link>
          <form action="/auth/signout" method="post">
            <input type="hidden" name="redirectTo" value="/connexion" />
            <button type="submit" role="menuitem">
              <LogOut size={16} aria-hidden="true" /> Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
