import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BUCKET, LIBRARY_CATEGORIES, type LibraryCategory } from "@/lib/admin/documents";

/*
 * Shared resource library of the sales space (handoff page 08): the files the admin uploads in /admin/documents,
 * stored in the private "documents" bucket under library/<category>/. Read with the rep's session: the storage policy
 * "documents: staff read" (migration 008) only lets ACTIVE staff list / download library files.
 * Files are never public: downloads go through a short-lived signed URL created on the server (resource-actions.ts).
 */

export type Resource = { path: string; name: string; category: LibraryCategory; size: number; format: string; updatedAt: string };

export const isLibraryPath = (path: unknown): path is string =>
  typeof path === "string" && new RegExp(`^library/(${LIBRARY_CATEGORIES.join("|")})/[^/]+$`).test(path) && !path.includes("..");

export async function loadResources() {
  const supabase = await createClient();
  const storage = supabase.storage.from(BUCKET);
  const lists = await Promise.all(LIBRARY_CATEGORIES.map((c) => storage.list(`library/${c}`, { limit: 200, sortBy: { column: "updated_at", order: "desc" } })));
  const resources: Resource[] = [];
  let ready = true;
  lists.forEach((res, i) => {
    if (res.error) ready = false;
    for (const f of res.data ?? []) {
      if (!f.id || f.name === ".emptyFolderPlaceholder") continue;
      const meta = (f.metadata ?? {}) as { size?: number };
      resources.push({
        path: `library/${LIBRARY_CATEGORIES[i]}/${f.name}`,
        name: f.name,
        category: LIBRARY_CATEGORIES[i]!,
        size: meta.size ?? 0,
        format: (f.name.split(".").pop() ?? "").toUpperCase().slice(0, 5),
        updatedAt: f.updated_at ?? f.created_at ?? "",
      });
    }
  });
  return { ready, resources };
}
