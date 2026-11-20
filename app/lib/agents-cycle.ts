import type { Cycle } from "@/config/pricing";

const KEY = "aku-agents-cycle";

/** Remember Mensuel / Annuel across pricing → inscription → abonnement. */
export function readAgentsCycle(): Cycle {
  if (typeof window === "undefined") return "mensuel";
  try {
    return sessionStorage.getItem(KEY) === "annuel" ? "annuel" : "mensuel";
  } catch {
    return "mensuel";
  }
}

export function writeAgentsCycle(cycle: Cycle) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, cycle);
  } catch {
    /* ignore blocked storage */
  }
}

export function parseAgentsCycle(value: string | null | undefined): Cycle | null {
  return value === "annuel" || value === "mensuel" ? value : null;
}
