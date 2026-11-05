import { permanentRedirect } from "next/navigation";

/** Former standalone page. The offers now live on the agents page. */
export default function Page() {
  permanentRedirect("/agents-ia#tarifs");
}
