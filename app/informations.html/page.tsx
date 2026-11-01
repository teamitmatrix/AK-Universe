import LegacyPage, { legacyMetadata } from "@/components/legacy/LegacyPage";

export const metadata = legacyMetadata("informations.html");

export default function Page() {
  return <LegacyPage source="informations.html" />;
}
