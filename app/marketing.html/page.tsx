import LegacyPage, { legacyMetadata } from "@/components/legacy/LegacyPage";

export const metadata = legacyMetadata("marketing.html");

export default function Page() {
  return <LegacyPage source="marketing.html" />;
}
