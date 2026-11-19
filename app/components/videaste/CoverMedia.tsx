"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { PROVIDERS, type Provider } from "@/lib/videaste/storage";

/** Real cover image when a Drive/Dropbox preview exists; otherwise a provider-branded play fallback. */
export function CoverMedia({ thumbUrl, coverProvider }: { thumbUrl: string | null; coverProvider: Provider | null }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(thumbUrl) && !broken;

  return (
    <>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- external storage previews; domains vary per provider
        <img className="vid-thumb-img" src={thumbUrl!} alt="" onError={() => setBroken(true)} />
      ) : (
        <span className="vid-play" title={coverProvider ? PROVIDERS[coverProvider] : undefined}>
          <Play size={16} />
        </span>
      )}
      {coverProvider && !showImg && <span className="vid-provider">{PROVIDERS[coverProvider]}</span>}
    </>
  );
}
