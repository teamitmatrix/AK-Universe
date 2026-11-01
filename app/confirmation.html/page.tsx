import LegacyPage, { legacyMetadata } from "@/components/legacy/LegacyPage";

export const metadata = legacyMetadata("confirmation.html");

export default function Page() {
  return <LegacyPage source="confirmation.html" />;
}
