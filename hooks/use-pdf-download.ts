"use client";

import { useState } from "react";
import type { ReactElement } from "react";

export function usePdfDownload() {
  const [isGenerating, setIsGenerating] = useState(false);

  async function download(element: ReactElement, filename: string) {
    setIsGenerating(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  }

  return { download, isGenerating };
}
