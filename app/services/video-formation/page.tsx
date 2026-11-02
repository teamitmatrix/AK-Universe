import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-formation");

export default function Page() {
  return <ServiceRoute slug="video-formation" />;
}
