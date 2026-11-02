import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-evenementielle");

export default function Page() {
  return <ServiceRoute slug="video-evenementielle" />;
}
