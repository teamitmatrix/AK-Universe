import type { AgentCategory, AgentTask } from "@/config/agents";

/** site_settings key for admin-created Agents IA services. */
export const AGENTS_CATALOG_KEY = "agents_catalog";

export type CatalogAgent = {
  id: string;
  published: boolean;
  name: string;
  role: string;
  headline: string;
  description: string;
  example: string;
  category: AgentCategory;
  icon: string;
  portrait: string;
  heroPortrait: string;
  tasks: AgentTask[];
  action: string;
  integrations: string[];
  demo: { from: "client" | "agent"; text: string }[];
  /** Optional display prices on catalogue / commercial lines (EUR HT). */
  priceMonthly: number | null;
  setupFrom: number | null;
  createdAt: string;
  updatedAt: string;
};

export const AGENT_ICON_CHOICES = [
  "phone",
  "chat",
  "headset",
  "chart",
  "megaphone",
  "users",
  "briefcase",
  "gear",
  "sparkle",
  "file-text",
  "calendar",
  "mail",
  "bulb",
  "rocket",
  "target",
] as const;
