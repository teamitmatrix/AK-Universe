"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { PROJECT_STATUS } from "@/config/projects";
import { isAdmin } from "@/lib/auth/session";
import { CHATBOT_KEY, MAX_KNOWLEDGE_CHARS, type ChatbotSettings } from "@/lib/chatbot/knowledge";
import { ensureIndex } from "@/lib/chatbot/rag";
import { createClient } from "@/lib/supabase/server";
import { PRICING_KEY, applyOverrides, loadDefaultConfig, type PricingOverrides } from "@/lib/video-config";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
};

/** New prices or knowledge reach the chatbot right away instead of at its next periodic sync. */
const reindexChatbot = () =>
  after(() => ensureIndex(true).catch((cause) => console.error("Chatbot reindex failed:", cause)));

/** Keeps only known keys and valid numbers, so the stored JSON can never break the catalogue. */
function sanitize(input: PricingOverrides): PricingOverrides {
  const defaults = loadDefaultConfig();
  const out: Required<PricingOverrides> = { depositPercent: defaults.depositPercent, qtyDiscounts: {}, options: {}, services: {} };

  const deposit = num(input.depositPercent);
  if (deposit !== undefined) out.depositPercent = Math.min(100, deposit);
  for (const qty of Object.keys(defaults.qtyDiscounts)) {
    const v = num(input.qtyDiscounts?.[qty]);
    if (v !== undefined) out.qtyDiscounts[qty] = Math.min(90, v);
  }
  for (const id of Object.keys(defaults.options)) {
    const v = num(input.options?.[id]);
    if (v !== undefined) out.options[id] = v;
  }
  for (const s of defaults.services) {
    const so = input.services?.[s.slug];
    if (!so) continue;
    out.services[s.slug] = {
      price: num(so.price),
      durations: s.durations ? s.durations.map((d, i) => num(so.durations?.[i]) ?? d.extra) : undefined,
    };
  }
  return out;
}

export async function savePricing(input: PricingOverrides) {
  if (!(await isAdmin())) return { success: false as const, error: "forbidden" as const };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const value = sanitize(input);

  // RLS (site_settings: admin insert/update) re-checks the admin role in the database.
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: PRICING_KEY, value, updated_at: new Date().toISOString(), updated_by: auth.user?.id });
  if (error) {
    console.error("savePricing failed:", error.message);
    return { success: false as const, error: "failed" as const };
  }

  reindexChatbot();
  revalidatePath("/admin");
  return { success: true as const, config: applyOverrides(loadDefaultConfig(), value) };
}

export async function resetPricing() {
  if (!(await isAdmin())) return { success: false as const, error: "forbidden" as const };
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").delete().eq("key", PRICING_KEY);
  if (error) return { success: false as const, error: "resetFailed" as const };
  reindexChatbot();
  revalidatePath("/admin");
  return { success: true as const, config: loadDefaultConfig() };
}

/** "Demandes vidéo" tab: moves a quote/booking through its statuses. */
export async function updateProjectStatus(id: string, status: string) {
  if (!(await isAdmin())) return { success: false as const, error: "forbidden" as const };
  if (!(status in PROJECT_STATUS)) return { success: false as const, error: "unknownStatus" as const };
  const supabase = await createClient();
  // RLS (video_projects: admin updates) re-checks the admin role in the database.
  const { error } = await supabase.from("video_projects").update({ status }).eq("id", id);
  if (error) {
    console.error("updateProjectStatus failed:", error.message);
    return { success: false as const, error: "updateFailed" as const };
  }
  revalidatePath("/admin");
  return { success: true as const };
}

/** "Chatbot" tab: on/off switch and the knowledge text the site assistant answers from. */
export async function saveChatbot(input: ChatbotSettings) {
  if (!(await isAdmin())) return { success: false as const, error: "forbidden" as const };
  const knowledge = String(input.knowledge ?? "");
  if (knowledge.length > MAX_KNOWLEDGE_CHARS) return { success: false as const, error: "tooLong" as const };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  // RLS (private_settings: admin insert/update) re-checks the admin role in the database.
  const { error } = await supabase.from("private_settings").upsert({
    key: CHATBOT_KEY,
    value: { enabled: input.enabled === true, knowledge },
    updated_at: new Date().toISOString(),
    updated_by: auth.user?.id,
  });
  if (error) {
    console.error("saveChatbot failed:", error.message);
    return { success: false as const, error: "failed" as const };
  }
  reindexChatbot();
  revalidatePath("/admin");
  return { success: true as const };
}
