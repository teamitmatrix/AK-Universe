import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-temoignage-client");

export default function Page() {
  return <ServiceRoute slug="video-temoignage-client" />;
}
