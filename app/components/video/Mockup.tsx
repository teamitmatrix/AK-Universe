import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";

const REGIONS = {
  poster: { x: 862, y: 118, w: 688, h: 328 },
  side: { x: 185, y: 639, w: 431, h: 236 },
  thumb: { x: 290, y: 639, w: 236, h: 236 },
} as const;

type Region = keyof typeof REGIONS;

/** Crop of a maquette, same boxes the static service pages used. */
export function Mockup({
  mockup,
  region,
  className = "",
  emptyIcon = "clapper",
}: {
  mockup?: number | null;
  region: Region;
  className?: string;
  emptyIcon?: string;
}) {
  const box = REGIONS[region];
  const size = { "--w": String(box.w), "--h": String(box.h) } as CSSProperties;
  if (!mockup) {
    return (
      <div className={`ph ph-empty ${className}`.trim()} style={size} aria-hidden="true">
        <Icon name={emptyIcon} />
      </div>
    );
  }
  return (
    <div
      className={`ph ${className}`.trim()}
      aria-hidden="true"
      style={
        {
          ...size,
          backgroundImage: `url(/assets/img/maquettes/${mockup}.webp)`,
          "--iw": "1672",
          "--ih": "941",
          "--x": String(box.x),
          "--y": String(box.y),
        } as CSSProperties
      }
    />
  );
}
