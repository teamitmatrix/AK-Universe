import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Federated documents view — three existing sources, read where they live, nothing copied:
 *   1. Shared resource library → storage bucket "documents", folder library/<category>/
 *   2. Quotes & invoices       → sales_documents (the pieces the sales reps write)
 *   3. Video project files      → the same bucket (projects/<id>/), plus the links a videographer
 *      attaches (project_files) and the versions they have sent (project_versions)
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

const clientOf = (p?: { company: string | null; first_name: string | null; last_name: string | null } | null) =>
  p ? p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || "—" : "—";

export type SalesPiece = {
  id: string;
  number: string;
  kind: "devis" | "facture";
  status: string;
  client: string;
  amountCents: number;
  date: string;
};

export type ProjectAsset = {
  key: string;
  name: string;
  reference: string;
  client: string;
  updatedAt: string;
  source: "storage" | "link" | "version";
  path: string | null;
  url: string | null;
};

const SENT = ["envoyee", "validee", "modifications"];

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

  const [folders, linksRes, versionsRes, piecesRes, projectChoicesRes] = await Promise.all([
    storageReady ? storage.list("projects", { limit: 100, sortBy: { column: "updated_at", order: "desc" } }) : Promise.resolve({ data: [] as ListItem[], error: null }),
    supabase.from("project_files").select("id, project_id, name, external_url, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(80),
    supabase.from("project_versions").select("id, project_id, number, label, external_url, sent_at", { count: "exact" }).in("status", SENT).order("sent_at", { ascending: false }).limit(80),
    supabase
      .from("sales_documents")
      .select("id, number, kind, status, client_name, total_ht_cents, issue_date", { count: "exact" })
      .order("issue_date", { ascending: false })
      .limit(12),
    supabase.from("video_projects").select("id, reference, company:contact->>entreprise").neq("status", "annule").order("created_at", { ascending: false }).limit(200),
  ]);

  const folderIds = ((folders.data ?? []) as ListItem[]).filter((f) => !f.id && /^[0-9a-f-]{36}$/i.test(f.name)).map((f) => f.name).slice(0, 40);
  const links = linksRes.error ? [] : (linksRes.data ?? []);
  const versions = versionsRes.error ? [] : (versionsRes.data ?? []);
  const projectIds = [...new Set([...folderIds, ...links.map((l) => l.project_id as string), ...versions.map((v) => v.project_id as string)])];

  const [{ data: projects }, ...fileLists] = await Promise.all([
    projectIds.length
      ? supabase.from("video_projects").select("id, reference, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom").in("id", projectIds)
      : Promise.resolve({ data: [] as { id: string; reference: string; company: string | null; first_name: string | null; last_name: string | null }[] }),
    ...folderIds.map((id) => storage.list(`projects/${id}`, { limit: 100, sortBy: { column: "updated_at", order: "desc" } })),
  ]);
  const byId = new Map((projects ?? []).map((p) => [p.id, p]));

  const assets: ProjectAsset[] = [];
  folderIds.forEach((id, i) => {
    const p = byId.get(id);
    for (const f of (fileLists[i]?.data ?? []) as ListItem[]) {
      if (!f.id || f.name === ".emptyFolderPlaceholder") continue;
      const file = toFile(`projects/${id}`, f);
      assets.push({ key: file.path, name: file.name, reference: p?.reference ?? id.slice(0, 8), client: clientOf(p), updatedAt: file.updatedAt, source: "storage", path: file.path, url: null });
    }
  });
  for (const l of links) {
    const p = byId.get(l.project_id as string);
    assets.push({
      key: `link:${l.id}`,
      name: l.name as string,
      reference: p?.reference ?? String(l.project_id).slice(0, 8),
      client: clientOf(p),
      updatedAt: (l.created_at as string) ?? "",
      source: "link",
      path: null,
      url: l.external_url as string,
    });
  }
  for (const v of versions) {
    const p = byId.get(v.project_id as string);
    const label = (v.label as string | null) ?? "";
    assets.push({
      key: `ver:${v.id}`,
      name: `V${v.number}${label ? ` — ${label}` : ""}`,
      reference: p?.reference ?? String(v.project_id).slice(0, 8),
      client: clientOf(p),
      updatedAt: (v.sent_at as string | null) ?? "",
      source: "version",
      path: null,
      url: v.external_url as string,
    });
  }
  assets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const pieces: SalesPiece[] = piecesRes.error
    ? []
    : (piecesRes.data ?? []).map((d) => ({
        id: d.id as string,
        number: (d.number as string | null) ?? "—",
        kind: d.kind as "devis" | "facture",
        status: d.status as string,
        client: (d.client_name as string) || "—",
        amountCents: Number(d.total_ht_cents ?? 0),
        date: d.issue_date as string,
        }));

  const storageCount = assets.filter((a) => a.source === "storage").length;

  return {
    storageReady,
    docsReady: !piecesRes.error,
    library,
    pieces,
    assets,
    projectChoices: (projectChoicesRes.data ?? []).map((p) => ({ id: p.id, label: `${p.reference}${p.company ? ` — ${p.company}` : ""}` })),
    kpis: {
      library: library.length,
      quotesInvoices: piecesRes.error ? 0 : (piecesRes.count ?? pieces.length),
      projectFiles: storageCount + (linksRes.error ? 0 : (linksRes.count ?? links.length)) + (versionsRes.error ? 0 : (versionsRes.count ?? versions.length)),
    },
  };
}
