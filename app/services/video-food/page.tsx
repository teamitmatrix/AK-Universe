import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-food");

export default function Page() {
  return <ServiceRoute slug="video-food" />;
}
