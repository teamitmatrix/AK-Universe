import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-interview");

export default function Page() {
  return <ServiceRoute slug="video-interview" />;
}
