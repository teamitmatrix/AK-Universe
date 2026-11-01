import LegacyPage, { legacyMetadata } from "@/components/legacy/LegacyPage";

export const metadata = legacyMetadata("projet.html");

export default function Page() {
  return <LegacyPage source="projet.html" />;
}
