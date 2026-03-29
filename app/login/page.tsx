import { Suspense } from "react";

import { LoginScreen } from "@/components/login/login-screen";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="navy-pattern min-h-screen" />}>
      <LoginScreen />
    </Suspense>
  );
}
