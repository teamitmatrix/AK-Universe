import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-reseaux-sociaux");

export default function Page() {
  return <ServiceRoute slug="video-reseaux-sociaux" />;
}
