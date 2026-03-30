import { Suspense } from "react";

import { FirstAccessScreen } from "@/components/login/first-access-screen";

export default function PrimeiroAcessoPage() {
  return (
    <Suspense fallback={<div className="navy-pattern min-h-screen" />}>
      <FirstAccessScreen />
    </Suspense>
  );
}
