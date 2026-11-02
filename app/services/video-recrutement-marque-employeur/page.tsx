import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-recrutement-marque-employeur");

export default function Page() {
  return <ServiceRoute slug="video-recrutement-marque-employeur" />;
}
