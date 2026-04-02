"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main>
          <h2>Algo deu errado. Nossa equipe foi notificada automaticamente.</h2>
          <button onClick={() => reset()}>Tentar novamente</button>
        </main>
      </body>
    </html>
  );
}
