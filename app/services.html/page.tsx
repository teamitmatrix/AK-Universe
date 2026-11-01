import LegacyPage, { legacyMetadata } from "@/components/legacy/LegacyPage";

export const metadata = legacyMetadata("services.html");

export default function Page() {
  return <LegacyPage source="services.html" />;
}
