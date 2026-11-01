import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/auth/LoginScreen";

export const metadata: Metadata = {
  title: { absolute: "Se connecter — AK Universe" },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
