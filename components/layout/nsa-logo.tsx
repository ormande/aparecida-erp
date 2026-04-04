"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function NsaLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const size = compact ? 40 : 48;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {imageError ? (
        <div
          className="flex items-center justify-center rounded-full border border-[rgba(201,168,76,0.35)] bg-[var(--color-navy)] shadow-lg"
          style={{ width: size + 8, height: size + 8 }}
        >
          <span className="font-serif text-[18px] tracking-[0.18em] text-[var(--color-gold)]">NSA</span>
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-full border border-[rgba(201,168,76,0.35)] bg-white p-1 shadow-lg"
          style={{ width: size + 8, height: size + 8 }}
        >
          <Image
            src="/brand/logo.png?v=2"
            alt="Logo da Borracharia Nossa Senhora Aparecida"
            width={size}
            height={size}
            className="rounded-full object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {!compact ? <div className="space-y-0.5" /> : null}
    </div>
  );
}
