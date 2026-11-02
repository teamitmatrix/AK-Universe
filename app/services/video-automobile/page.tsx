import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-automobile");

export default function Page() {
  return <ServiceRoute slug="video-automobile" />;
}
