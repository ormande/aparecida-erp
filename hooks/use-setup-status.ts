"use client";

import { useEffect, useState } from "react";

export function useSetupStatus() {
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/setup/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active) {
          setHasUsers(Boolean(data.hasUsers));
        }
      })
      .catch(() => {
        if (active) {
          setHasUsers(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    hasUsers,
    isLoading: hasUsers === null,
  };
}
