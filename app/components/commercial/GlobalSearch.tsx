"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { localeOf } from "@/config/languages";
import { useLang } from "@/components/ui/LangSwitch";
import { searchCommercial } from "@/lib/commercial/actions";
import type { SearchHit } from "@/lib/commercial/search";
import { DOC_STATUS_LABELS, type DocKind, type DocStatus } from "@/lib/commercial/commission-rules";
import { comTextFor } from "./comText";

/** Server answer for one query; the shown status is derived from it and the current input. */
type Result = { query: string; hits: SearchHit[] | null };

/**
 * Global search of the Commercial header. Each keystroke (debounced) asks the server, which searches only the
 * signed-in rep's own records — nothing is filtered in the browser.
 */
export function GlobalSearch() {
  const [lang] = useLang();
  const t = comTextFor(lang).search;
  const statuses = comTextFor(lang).statuses;
  const stages = comTextFor(lang).pipeline.stages;
  // Prospect hits carry "stage:<stage>", project / task hits their status.
  const statusLabel = (s: string) => {
    if (s.startsWith("stage:")) return stages[s.slice(6)] ?? s.slice(6);
    if (s.startsWith("doc:")) {
      const [, kind, status] = s.split(":") as [string, DocKind, DocStatus];
      return `${kind === "devis" ? "Devis" : "Facture"} · ${DOC_STATUS_LABELS[kind]?.[status] ?? status}`;
    }
    return statuses[s] ?? s;
  };
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const value = q.trim();
  const state =
    value.length < 2
      ? { status: value ? ("short" as const) : ("idle" as const) }
      : result?.query !== value
        ? { status: "loading" as const }
        : result.hits === null
          ? { status: "error" as const }
          : { status: "done" as const, hits: result.hits };

  useEffect(() => {
    if (value.length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      let hits: SearchHit[] | null = null;
      try {
        const res = await searchCommercial(value);
        if (res.success) hits = res.hits;
      } catch {
        // shown as "search unavailable"
      }
      // Ignore answers to an older keystroke.
      if (!stale) setResult({ query: value, hits });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(localeOf(lang)) : "");
  const groups = (["prospects", "documents", "quotes", "sales", "tasks"] as const)
    .map((g) => ({ g, hits: state.status === "done" ? state.hits.filter((h) => h.group === g) : [] }))
    .filter((x) => x.hits.length);

  return (
    <div className="com-search" ref={box}>
      <div className="adm-search adm-global-search" role="search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={q}
          placeholder={t.placeholder}
          aria-label={t.label}
          aria-controls={listId}
          maxLength={60}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        />
      </div>
      {open && q.trim() && (
        <div className="com-pop com-search-pop" id={listId} role="region" aria-live="polite" aria-label={t.label}>
          {state.status === "short" && <p className="com-pop-note">{t.tooShort}</p>}
          {state.status === "loading" && <p className="com-pop-note">{t.searching}</p>}
          {state.status === "error" && <p className="com-pop-note">{t.failed}</p>}
          {state.status === "done" && groups.length === 0 && <p className="com-pop-note">{t.empty}</p>}
          {groups.map(({ g, hits }) => (
            <section key={g}>
              <h3>{t.groups[g]}</h3>
              <ul>
                {hits.map((h) => {
                  const body = (
                    <>
                      <strong>{h.title}</strong>
                      <small>{[h.status ? statusLabel(h.status) : "", date(h.at), h.subtitle].filter(Boolean).join(" · ")}</small>
                    </>
                  );
                  return (
                    <li key={`${g}:${h.id}`}>
                      {h.href ? (
                        <Link href={h.href} onClick={() => setOpen(false)}>
                          {body}
                        </Link>
                      ) : (
                        <div>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="com-pop-foot">{t.scope}</p>
        </div>
      )}
    </div>
  );
}
