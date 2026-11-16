import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminChatbot } from "@/components/admin/AdminChatbot";
import { AdminPricing } from "@/components/admin/AdminPricing";
import { AdminProjects, type AdminProject } from "@/components/admin/AdminProjects";
import { loadAssignableStaff } from "@/lib/admin/team";
import { AdmShell } from "@/components/admin/space/AdmShell";
import { dashTextFor } from "@/components/admin/space/dashText";
import { getAdminIdentity } from "@/lib/admin/identity";
import { getAdminLang } from "@/i18n/server";
import { getChatbotSettings, MAX_KNOWLEDGE_CHARS } from "@/lib/chatbot/knowledge";
import { createClient } from "@/lib/supabase/server";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Admin — AK Universe" },
  robots: { index: false, follow: false },
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  // The proxy already requires a session; only admins may see this page (checked on the server).
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const t = dashTextFor(await getAdminLang());
  // Same admin-space frame (sidebar + header) as every other admin screen; the tab is the sidebar item.
  const frame = (active: "prixVideo" | "demandes" | "chatbot", children: React.ReactNode) => (
    <AdmShell t={t} active={active} admin={admin}>
      <div className="adm-content adm-legacy">{children}</div>
    </AdmShell>
  );
  const vue = (await searchParams).vue;
  const tab = vue === "demandes" || vue === "chatbot" ? vue : "prix";

  if (tab === "prix") {
    return frame("prixVideo", <AdminPricing initial={await getVideoConfig()} />);
  }

  if (tab === "chatbot") {
    return frame(
      "chatbot",
      <AdminChatbot initial={await getChatbotSettings()} maxChars={MAX_KNOWLEDGE_CHARS} hasKey={Boolean(process.env.OPENAI_API_KEY)} />,
    );
  }

  // RLS ("video_projects: read own" includes admins) returns every request to an admin.
  const supabase = await createClient();
  const base = "id, reference, kind, status, contact, items, total_cents, deposit_cents, created_at";
  // Assignment columns exist after migration 005 (revision rounds after 006): try the richest select first.
  let data: unknown[] | null = null;
  let assignable = false;
  for (const [columns, withAssignment] of [
    [`${base}, commercial_id, videaste_id, deadline, revision_rounds`, true],
    [`${base}, commercial_id, videaste_id, deadline`, true],
    [base, false],
  ] as const) {
    const res = await supabase.from("video_projects").select(columns).order("created_at", { ascending: false }).limit(300);
    if (!res.error) {
      data = res.data;
      assignable = withAssignment;
      break;
    }
  }
  const staff = assignable ? await loadAssignableStaff() : null;

  return frame("demandes", <AdminProjects projects={(data ?? []) as AdminProject[]} staff={staff} />);
}
