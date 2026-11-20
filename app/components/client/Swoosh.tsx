/** Decorative orange light ribbons of the Client space mockup (sidebar, offer card, page header). */
export function Swoosh({ className, id }: { className: string; id: string }) {
  return (
    <svg className={className} viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ff7a1a" stopOpacity="0" />
          <stop offset="0.45" stopColor="#ff7a1a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffb36b" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ff5a00" stopOpacity="0" />
          <stop offset="0.6" stopColor="#ff8a3d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd2a8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 360 C 120 330, 170 230, 240 170 S 360 70, 400 40 L 400 90 C 350 120, 300 170, 250 230 S 120 370, 0 400 Z" fill={`url(#${id}-a)`} />
      <path d="M0 330 C 110 300, 180 190, 260 130 S 370 50, 400 20" fill="none" stroke={`url(#${id}-b)`} strokeWidth="3" />
      <path d="M0 385 C 140 360, 200 270, 270 210 S 370 120, 400 100" fill="none" stroke={`url(#${id}-b)`} strokeWidth="2" />
    </svg>
  );
}
