"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const MIN_GAP_MS = 30_000;

/**
 * Re-renders the server data when the customer comes back to the tab (e.g. after paying an invoice or changing
 * the plan in the Stripe tab), at most every 30 s. The page reads Stripe + the database on every render.
 */
export function RefreshOnFocus() {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < MIN_GAP_MS) return;
      last = Date.now();
      router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);
  return null;
}
