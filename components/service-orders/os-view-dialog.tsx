"use client";

import { FileDown } from "lucide-react";
import { createElement, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OrderDetails } from "@/hooks/use-os-page";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { currency } from "@/lib/formatters";

export function OsViewDialog({ order, onClose }: { order: OrderDetails | null; onClose: () => void }) {
  const { download: downloadPdf, isGenerating } = usePdfDownload();
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!order) return;
    fetch("/api/company/public")
      .then((r) => r.json() as Promise<{ company?: { name?: string } }>)
      .then((data) => setCompanyName(data.company?.name ?? ""))
      .catch(() => undefined);
  }, [order]);

  const handlePdfDownload = useCallback(async () => {
    if (!order) return;
    const isFec = order.number.startsWith("FEC-");
    if (isFec) {
      const { FechamentoPdf } = await import("@/components/pdf/fechamento-pdf");
      await downloadPdf(
        createElement(FechamentoPdf, { order, companyName, unitName: order.unitName ?? "" }),
        `Fechamento-${order.number}`,
      );
    } else {
      const { OsPdf } = await import("@/components/pdf/os-pdf");
      const filename = order.number.startsWith("OS-") ? order.number : `OS-${order.number}`;
      await downloadPdf(
        createElement(OsPdf, { order, companyName, unitName: order.unitName ?? "" }),
        filename,
      );
    }
  }, [order, companyName, downloadPdf]);

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{order?.number}</DialogTitle>
          <DialogDescription>{"Visualiza\u00e7\u00e3o da OS preenchida."}</DialogDescription>
        </DialogHeader>
        {order ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">Unidade</span>
                <p>{order.unitName ?? "-"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Cliente</span>
                <p>{order.clientName}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{"Ve\u00edculo"}</span>
                <p>{order.vehicleLabel}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Pagamento</span>
                <p>{order.paymentTerm === "A_PRAZO" ? "A prazo" : "A vista"}</p>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="font-medium">{"Servi\u00e7os"}</p>
              <div className="mt-3 space-y-2">
                {order.services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between text-sm">
                    <span>{service.description}</span>
                    <span>{currency(service.laborPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="font-medium">{"Observa\u00e7\u00f5es"}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {order.notes || "Sem observa\u00e7\u00f5es."}
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" disabled={isGenerating} onClick={() => void handlePdfDownload()}>
                <FileDown className="mr-2 h-4 w-4" />
                {isGenerating ? "Gerando PDF..." : "Baixar PDF"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
