import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-tutoriels");

export default function Page() {
  return <ServiceRoute slug="video-tutoriels" />;
}
