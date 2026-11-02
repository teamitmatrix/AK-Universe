import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-motion-design");

export default function Page() {
  return <ServiceRoute slug="video-motion-design" />;
}
