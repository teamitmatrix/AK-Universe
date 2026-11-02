import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-entreprise");

export default function Page() {
  return <ServiceRoute slug="video-entreprise" />;
}
