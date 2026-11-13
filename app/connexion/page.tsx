import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { Suspense } from "react";
import { LoginScreen } from "@/components/auth/LoginScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Se connecter — AK Universe") },
  };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
