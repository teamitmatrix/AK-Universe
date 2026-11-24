import { redirect } from "next/navigation";

/** Former public account page. Customers now use the client portal. */
export default function ComptePage() {
  redirect("/client/dashboard");
}
