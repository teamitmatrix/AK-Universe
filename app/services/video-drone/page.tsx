import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-drone");

export default function Page() {
  return <ServiceRoute slug="video-drone" />;
}
