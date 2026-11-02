import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-promotionnelle");

export default function Page() {
  return <ServiceRoute slug="video-promotionnelle" />;
}
