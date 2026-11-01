import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { Metadata } from "next";
import LegacyPageClient from "./LegacyPageClient";

/*
 * Temporary bridge for pages not yet rebuilt in React: renders the original
 * static HTML from legacy-source/ (server-side, so content is in the HTML) and
 * runs its original scripts from public/assets/js.
 *
 * Legacy scripts build relative links ("projet.html") that assume the site root
 * as base URL (the static pages under services/ used <base href="../">), so the
 * client sets <base href="/"> while a legacy page is mounted.
 */

const LEGACY_ROOT = path.join(process.cwd(), "legacy-source");

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`\\b${name}=(["'])(.*?)\\1`, "i"))?.[2];
}

/** Resolve a relative URL from the static site to an absolute site path. */
function toAbsolute(value: string, baseDir: string) {
  if (!value || /^(https?:|mailto:|tel:|data:|javascript:|#|\/)/i.test(value)) {
    return value;
  }
  const resolved = path.posix.normalize(path.posix.join("/", baseDir, value));
  return resolved === "/index.html" ? "/" : resolved;
}

const parseLegacyHtml = cache((source: string) => {
  let raw = fs.readFileSync(path.join(LEGACY_ROOT, ...source.split("/")), "utf8");

  // Some exports were wrapped in a preview shell: keep only the real document.
  const inner = raw.lastIndexOf("<!DOCTYPE html>");
  if (inner > 0) raw = raw.slice(inner);

  const sourceDir = path.posix.dirname(source);
  const base = raw.match(/<base\b[^>]*>/i)?.[0];
  const baseDir = base
    ? path.posix.normalize(path.posix.join(sourceDir, attr(base, "href") ?? ""))
    : sourceDir;

  const bodyTag = raw.match(/<body\b[^>]*>/i)?.[0] ?? "<body>";
  const body = raw.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";

  const scripts: string[] = [];
  for (const match of body.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/gi)) {
    const src = attr(match[1], "src");
    if (src) scripts.push(toAbsolute(src, baseDir));
  }

  const html = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\b(src|href)=(["'])([^"']*)\2/gi, (_m, name, q, value) =>
      `${name}=${q}${toAbsolute(value, baseDir)}${q}`
    );

  const head = raw.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const description = head.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1];

  return {
    html,
    scripts,
    bodyClass: attr(bodyTag, "class") ?? "",
    service: attr(bodyTag, "data-service"),
    title: head.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "AK Universe",
    description,
    noindex: /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(head),
  };
});

export function legacyMetadata(source: string): Metadata {
  const page = parseLegacyHtml(source);
  return {
    title: { absolute: page.title },
    description: page.description,
    robots: page.noindex ? { index: false, follow: false } : undefined,
  };
}

export default function LegacyPage({ source }: { source: string }) {
  const { html, scripts, bodyClass, service } = parseLegacyHtml(source);
  return (
    <LegacyPageClient
      html={html}
      scripts={scripts}
      light={bodyClass.split(/\s+/).includes("light")}
      service={service}
    />
  );
}
