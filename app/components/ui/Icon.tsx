import { ICONS } from "./icons";

interface IconProps {
  name: string;
  className?: string;
}

/** Same markup as renderIcons() in main.js: <svg class="ic …">. */
export function Icon({ name, className = "" }: IconProps) {
  const body = ICONS[name];
  if (!body) return null;
  return (
    <svg
      className={`ic ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
