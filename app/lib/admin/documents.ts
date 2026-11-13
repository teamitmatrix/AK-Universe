import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Federated documents view — three existing sources, read where they live, nothing copied:
 *   1. Shared resource library → storage bucket "documents", folder library/<category>/
 *   2. Quotes & invoices       → video_projects (quotes) and payments (invoices) tables
 *   3. Video project files      → same bucket, folder projects/<project id>/
 */

export const BUCKET = "documents";
export const LIBRARY_CATEGORIES = ["brochures", "cgv", "presentations", "contrats", "supports"] as const;
export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type StoredFile = { path: string; name: string; size: number; mime: string; updatedAt: string };
type ListItem = { name: string; id: string | null; updated_at?: string | null; created_at?: string | null; metadata?: { size?: number; mimetype?: string } | null };

const toFile = (folder: string, f: ListItem): StoredFile => ({
  path: `${folder}/${f.name}`,
  name: f.name,
  size: f.metadata?.size ?? 0,
  mime: f.metadata?.mimetype ?? "",
  updatedAt: f.updated_at ?? f.created_at ?? "",
});

export async function loadDocuments() {
  const supabase = await createClient();
  const storage = supabase.storage.from(BUCKET);

  // 1. Library (one listing per category folder).
  const library: (StoredFile & { category: LibraryCategory })[] = [];
  let storageReady = true;
  const lists = await Promise.all(LIBRARY_CATEGORIES.map((c) => storage.list(`library/${c}`, { limit: 200, sortBy: { column: "updated_at", order: "desc" } })));
  lists.forEach((res, i) => {
    if (res.error) storageReady = false;
    for (const f of (res.data ?? []) as ListItem[]) if (f.id && f.name !== ".emptyFolderPlaceholder") library.push({ ...toFile(`library/${LIBRARY_CATEGORIES[i]}`, f), category: LIBRARY_CATEGORIES[i]! });
  });

  // 3. Project files: one folder per project id.
  const projectFiles: (StoredFile & { projectId: string; reference: string; client: string })[] = [];
  const folders = storageReady ? await storage.list("projects", { limit: 100, sortBy: { column: "updated_at", order: "desc" } }) : { data: [], error: null };
  const projectIds = ((folders.data ?? []) as ListItem[]).filter((f) => !f.id && /^[0-9a-f-]{36}$/i.test(f.name)).map((f) => f.name);
  const [{ data: projects }, ...fileLists] = await Promise.all([
    projectIds.length
      ? supabase.from("video_projects").select("id, reference, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom").in("id", projectIds)
      : Promise.resolve({ data: [] as { id: string; reference: string; company: string | null; first_name: string | null; last_name: string | null }[] }),
    ...projectIds.slice(0, 40).map((id) => storage.list(`projects/${id}`, { limit: 100, sortBy: { column: "updated_at", order: "desc" } })),
  ]);
  const byId = new Map((projects ?? []).map((p) => [p.id, p]));
  projectIds.slice(0, 40).forEach((id, i) => {
    const p = byId.get(id);
    for (const f of (fileLists[i]?.data ?? []) as ListItem[]) {
      if (!f.id || f.name === ".emptyFolderPlaceholder") continue;
      projectFiles.push({
        ...toFile(`projects/${id}`, f),
        projectId: id,
        reference: p?.reference ?? id.slice(0, 8),
        client: p ? p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || "—" : "—",
      });
    }
  });
  projectFiles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // 2. Quotes & invoices, straight from the tables.
  const [{ data: quotes }, { data: invoices }, { data: projectChoices }] = await Promise.all([
    supabase
      .from("video_projects")
      .select("id, reference, kind, status, total_cents, created_at, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("payments").select("id, kind, amount_cents, status, created_at, project_id, stripe_object_id").eq("status", "paid").order("created_at", { ascending: false }).limit(8),
    supabase.from("video_projects").select("id, reference, company:contact->>entreprise").neq("status", "annule").order("created_at", { ascending: false }).limit(200),
  ]);
  const { count: quoteCount } = await supabase.from("video_projects").select("id", { count: "exact", head: true });
  const { count: invoiceCount } = await supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "paid");

  return {
    storageReady,
    library,
    projectFiles,
    quotes: (quotes ?? []).map((q) => ({ ...q, client: q.company || [q.first_name, q.last_name].filter(Boolean).join(" ") || "—" })),
    invoices: invoices ?? [],
    projectChoices: (projectChoices ?? []).map((p) => ({ id: p.id, label: `${p.reference}${p.company ? ` — ${p.company}` : ""}` })),
    kpis: { library: library.length, quotesInvoices: (quoteCount ?? 0) + (invoiceCount ?? 0), projectFiles: projectFiles.length },
  };
}
