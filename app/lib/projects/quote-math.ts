import type { OptionDef, Service, VideoConfig } from "@/lib/video-config";

/*
 * Price rules shared by the project pages and POST /api/projects.
 * Same results as the former public/assets/js/projet.js calculator.
 */

export type VideoDraft = { qty: number; dur: number; opts: string[] };

export type ResolvedOption = { id: string; per: string } & OptionDef;

export function euro(n: number) {
  const body = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${body} €`;
}

export function resolvedOptions(config: VideoConfig, service: Service): ResolvedOption[] {
  return (service.options ?? [])
    .map((option) => {
      const ref = typeof option === "string" ? { id: option } : option;
      const base = config.options[ref.id] ?? ({} as OptionDef);
      return { ...base, ...ref, per: ref.per ?? base.per ?? "projet" };
    })
    .filter((option): option is ResolvedOption => Boolean(option.label));
}

export function durationsOf(config: VideoConfig, service: Service) {
  return service.durations ?? config.defaultDurations;
}

export function qtyChoicesOf(config: VideoConfig, service: Service) {
  if (service.qtyChoices) return service.qtyChoices;
  return Object.keys(service.qtyDiscounts ?? config.qtyDiscounts).map(Number);
}

export function discountOf(config: VideoConfig, service: Service, qty: number) {
  const table = service.qtyDiscounts ?? config.qtyDiscounts;
  return table[String(qty)] ?? 0;
}

export function qtyWord(service: Service, n: number) {
  const plural = (service.qtyLabel || "Nombre de vidéos").replace(/^Nombre de /, "");
  if (n > 1) return `${n} ${plural}`;
  const parts = plural.split(" ");
  parts[0] = parts[0].replace(/s$/, "");
  return `${n} ${parts.join(" ")}`;
}

export function videoPrice(config: VideoConfig, service: Service, item: VideoDraft) {
  const durations = durationsOf(config, service);
  const duration = durations[item.dur] ?? durations[0];
  const options = resolvedOptions(config, service).filter((option) => item.opts.includes(option.id));
  const perVideo = options.filter((option) => option.per === "video").reduce((sum, option) => sum + option.price, 0);
  const perProject = options.filter((option) => option.per !== "video").reduce((sum, option) => sum + option.price, 0);
  const videos =
    (service.price + (duration?.extra || 0) + perVideo) * item.qty * (1 - discountOf(config, service, item.qty) / 100);
  return Math.round(videos + perProject);
}

export function videoSummary(config: VideoConfig, service: Service, item: VideoDraft) {
  const durations = durationsOf(config, service);
  const duration = durations[item.dur] ?? durations[0];
  const parts = [qtyWord(service, item.qty), duration?.label].filter((part): part is string => Boolean(part));
  for (const option of resolvedOptions(config, service)) {
    if (item.opts.includes(option.id)) parts.push(option.label.replace(/ \(.*\)$/, ""));
  }
  return parts.join(" • ");
}
