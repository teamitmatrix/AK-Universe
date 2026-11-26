/** Detect Agents IA lines in a priced project (cart / video_projects.items). */
export function isAgentProjectItems(items: { service?: string | null }[] | null | undefined) {
  const list = items ?? [];
  if (!list.length) return false;
  return list.every((item) => /^Agent IA\b/i.test(String(item.service ?? "")) || /^Add-on\b/i.test(String(item.service ?? "")));
}
