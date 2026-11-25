import "server-only";
import { after } from "next/server";
import { sendTeamNotice } from "@/lib/notify-mail";
import { createAdminClient } from "@/lib/supabase/server";
import { isShareToken } from "./document-share";

const MAX_SIGNATURE_CHARS = 180_000;
const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

export type SignQuoteResult =
  | { success: true }
  | { success: false; error: "invalid" | "not_found" | "not_quote" | "not_open" | "already_signed" | "empty" | "too_large" | "failed" };

/** Public accept+sign of a shared devis (token from /d/<token>). Uses service role. */
export async function signQuoteByToken(input: {
  token: string;
  signerName: string;
  signatureDataUrl: string;
}): Promise<SignQuoteResult> {
  const token = String(input.token ?? "").trim();
  const signerName = String(input.signerName ?? "").trim().slice(0, 120);
  const signature = String(input.signatureDataUrl ?? "").trim();

  if (!isShareToken(token) || signerName.length < 2) return { success: false, error: "invalid" };
  if (!PNG_DATA_URL.test(signature)) return { success: false, error: "invalid" };
  if (signature.length < 800) return { success: false, error: "empty" };
  if (signature.length > MAX_SIGNATURE_CHARS) return { success: false, error: "too_large" };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("sales_documents")
      .select("id, number, kind, status, client_name, total_ht_cents, client_signature, signed_at")
      .eq("share_token", token)
      .maybeSingle();
    if (error || !data) return { success: false, error: "not_found" };
    if (data.kind !== "devis") return { success: false, error: "not_quote" };
    if (data.status === "validee" || data.client_signature || data.signed_at) return { success: false, error: "already_signed" };
    if (data.status !== "en_attente") return { success: false, error: "not_open" };

    const signedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from("sales_documents")
      .update({
        status: "validee",
        client_signature: signature,
        signer_name: signerName,
        signed_at: signedAt,
      })
      .eq("id", data.id)
      .eq("kind", "devis")
      .eq("status", "en_attente")
      .select("id");
    if (updateError || !updated?.length) {
      console.error("signQuoteByToken update failed:", updateError?.message);
      return { success: false, error: "failed" };
    }

    const number = (data.number as string | null) ?? "";
    const clientName = String(data.client_name ?? signerName);
    const amount = `${(Number(data.total_ht_cents ?? 0) / 100).toLocaleString("fr-FR")} € HT`;
    after(() =>
      sendTeamNotice("quote", `Devis accepté (signature) ${number}`.trim(), [
        clientName,
        `Signataire : ${signerName}`,
        amount,
      ]).catch((cause) => console.error("signQuoteByToken notice failed:", cause))
    );

    return { success: true };
  } catch (cause) {
    console.error("signQuoteByToken failed:", cause);
    return { success: false, error: "failed" };
  }
}
