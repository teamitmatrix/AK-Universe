import { ServiceRoute, serviceMetadata } from "@/components/video/ServiceRoute";

export const generateMetadata = () => serviceMetadata("video-ugc-publicite-ads");

export default function Page() {
  return <ServiceRoute slug="video-ugc-publicite-ads" />;
}
