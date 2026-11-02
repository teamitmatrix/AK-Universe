import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-produit-e-commerce");

export default function Page() {
  return <ServiceRoute slug="video-produit-e-commerce" />;
}
