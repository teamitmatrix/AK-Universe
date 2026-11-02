import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-mariage");

export default function Page() {
  return <ServiceRoute slug="video-mariage" />;
}
