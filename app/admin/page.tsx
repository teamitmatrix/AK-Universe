import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminChatbot } from "@/components/admin/AdminChatbot";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPricing } from "@/components/admin/AdminPricing";
import { AdminProjects, type AdminProject } from "@/components/admin/AdminProjects";
import { isAdmin } from "@/lib/auth/session";
import { getChatbotSettings, MAX_KNOWLEDGE_CHARS } from "@/lib/chatbot/knowledge";
import { createClient } from "@/lib/supabase/server";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Admin — AK Universe" },
  robots: { index: false, follow: false },
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  // The proxy already requires a session; only admins may see this page.
  if (!(await isAdmin())) notFound();
  const vue = (await searchParams).vue;
  const tab = vue === "demandes" || vue === "chatbot" ? vue : "prix";

  if (tab === "prix") {
    return (
      <>
        <AdminNav tab={tab} />
        <AdminPricing initial={await getVideoConfig()} />
      </>
    );
  }

  if (tab === "chatbot") {
    return (
      <>
        <AdminNav tab={tab} />
        <AdminChatbot
          initial={await getChatbotSettings()}
          maxChars={MAX_KNOWLEDGE_CHARS}
          hasKey={Boolean(process.env.OPENAI_API_KEY)}
        />
      </>
    );
  }

  // RLS ("video_projects: read own" includes admins) returns every request to an admin.
  const supabase = await createClient();
  const { data } = await supabase
    .from("video_projects")
    .select("id, reference, kind, status, contact, items, total_cents, deposit_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <>
      <AdminNav tab={tab} />
      <AdminProjects projects={(data ?? []) as AdminProject[]} />
    </>
  );
}
