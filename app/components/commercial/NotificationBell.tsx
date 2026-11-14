"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { localeOf } from "@/config/languages";
import { useLang } from "@/components/ui/LangSwitch";
import { getMyNotifications as commercialFeed, markNotificationsRead as commercialMarkRead } from "@/lib/commercial/actions";
import type { Feed, FeedItem } from "@/lib/commercial/notifications";
import { createClient } from "@/lib/supabase/client";
import { comTextFor } from "./comText";

const POLL_MS = 60_000;

function timeAgo(iso: string, locale: string) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(s, "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

/**
 * Notification center of the Commercial header. The feed always comes from the server action, which returns only
 * the signed-in rep's own rows (RLS + filter). Updates arrive live through Supabase Realtime (a ping that triggers
 * a re-fetch, subject to the same RLS policy), with a 60-second poll as a fallback.
 */
export function NotificationBell({
  userId,
  load = commercialFeed,
  markReadAction = commercialMarkRead,
}: {
  userId: string;
  /** Server actions of the space using the bell (each re-checks its own role). Default: the Commercial space. */
  load?: () => Promise<{ success: true; feed: Feed } | { success: false; error: string }>;
  markReadAction?: (ids: string[] | null) => Promise<unknown>;
}) {
  const router = useRouter();
  const [lang] = useLang();
  const t = comTextFor(lang).notif;
  const locale = localeOf(lang);
  const money = (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "EUR" });
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      if (res.success) {
        setFeed(res.feed);
        setFailed(false);
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, [load]);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => document.visibilityState === "visible" && void refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);

    // Live ping on a new notification for this user (RLS: Realtime only delivers rows the user may read).
    // The channel must join with the user's access token — joined anonymously, RLS delivers nothing.
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let closed = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (closed || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`notifications:${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void refresh())
        .subscribe();
    })();
    // Keep the Realtime token fresh when Supabase refreshes the session.
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      closed = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      auth.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function markRead(ids: string[] | null) {
    // Optimistic, then re-read from the server (source of truth).
    setFeed((f) => f && { ...f, unread: ids ? Math.max(0, f.unread - ids.length) : 0, items: f.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)) });
    await markReadAction(ids);
    void refresh();
  }

  function openItem(n: FeedItem) {
    if (!n.read) void markRead([n.id]);
    if (n.link && n.link !== window.location.pathname) {
      setOpen(false);
      router.push(n.link);
    }
  }

  const unread = feed?.unread ?? 0;
  return (
    <div className="com-bell" ref={box}>
      <button
        type="button"
        className="adm-icon-btn com-bell-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t.open(unread)}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void refresh();
        }}
      >
        <Bell size={17} aria-hidden="true" />
        {unread > 0 && <span className="com-bell-count">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="com-pop com-bell-pop" role="dialog" aria-label={t.label}>
          <header>
            <h3>{t.label}</h3>
            {feed?.ready && unread > 0 && (
              <button type="button" className="adm-link" onClick={() => void markRead(null)}>
                <CheckCheck size={14} aria-hidden="true" /> {t.markAll}
              </button>
            )}
          </header>
          {failed && <p className="com-pop-note">{t.failed}</p>}
          {feed && !feed.ready && <p className="com-pop-note">{t.notReady}</p>}
          {feed?.ready && feed.items.length === 0 && <p className="com-pop-note">{t.empty}</p>}
          {feed?.ready && feed.items.length > 0 && (
            <ul>
              {feed.items.map((n) => {
                const text = t.types[n.type]?.(n.data, money) ?? { title: n.type, body: "" };
                return (
                  <li key={n.id}>
                    <button type="button" className={n.read ? "is-read" : "is-unread"} onClick={() => openItem(n)}>
                      <span className="com-dot" aria-hidden="true" />
                      <span>
                        <strong>{text.title}</strong>
                        {text.body && <small>{text.body}</small>}
                        <time dateTime={n.createdAt}>{timeAgo(n.createdAt, locale)}</time>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
