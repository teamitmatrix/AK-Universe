import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-immobilier");

export default function Page() {
  return <ServiceRoute slug="video-immobilier" />;
}
