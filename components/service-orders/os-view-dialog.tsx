"use client";

import { FileDown } from "lucide-react";
import { createElement, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OrderDetails } from "@/hooks/use-os-page";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { currency, date } from "@/lib/formatters";

function paymentSummary(order: OrderDetails) {
  const term = order.paymentTerm === "A_PRAZO" ? "A prazo" : "À vista";
  const method = order.paymentMethod?.trim();
  return method ? `${term} · ${method}` : term;
}

function executorLabels(order: OrderDetails) {
  const names = order.services
    .map((s) => s.executedByName?.trim())
    .filter((n): n is string => typeof n === "string" && n.length > 0 && n.toLowerCase() !== "casa");
  return Array.from(new Set(names));
}

function OsViewDialogBody({
  order,
  onDownloadPdf,
  isGenerating,
}: {
  order: OrderDetails;
  onDownloadPdf: () => void;
  isGenerating: boolean;
}) {
  const executors = executorLabels(order);
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <span className="text-sm text-muted-foreground">Unidade</span>
          <p>{order.unitName ?? "—"}</p>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Cliente</span>
          <p>{order.clientName}</p>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Pagamento</span>
          <p>{paymentSummary(order)}</p>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Vencimento</span>
          <p>{order.paymentTerm === "A_PRAZO" && order.dueDate ? date(order.dueDate) : "À vista"}</p>
        </div>
      </div>
      {order.services.length > 0 ? (
        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="font-medium">Serviços</p>
          <div className="mt-3 space-y-2">
            {order.services.map((service) => {
              const qty = service.quantity ?? 1;
              const lineTotal = qty * service.laborPrice;
              return (
                <div key={service.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {service.description}
                    {qty > 1 ? <span className="text-muted-foreground"> ×{qty}</span> : null}
                  </span>
                  <span className="shrink-0">{currency(lineTotal)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {order.products && order.products.length > 0 ? (
        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="font-medium">Produtos</p>
          <div className="mt-3 space-y-2">
            {order.products.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {product.description}
                  <span className="text-muted-foreground">
                    {" "}
                    · {product.quantity} {product.unit}
                  </span>
                </span>
                <span className="shrink-0">{currency(product.totalPrice)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {executors.length > 0 ? (
        <div>
          <span className="text-sm text-muted-foreground">Funcionário</span>
          <p>{executors.join(", ")}</p>
        </div>
      ) : null}
      <div>
        <span className="text-sm text-muted-foreground">Data de emissão</span>
        <p>{order.openedAt ? date(order.openedAt) : "—"}</p>
      </div>
      {order.notes?.trim() ? (
        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="font-medium">Observações</p>
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{order.notes.trim()}</p>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled={isGenerating} onClick={() => void onDownloadPdf()}>
          <FileDown className="mr-2 h-4 w-4" />
          {isGenerating ? "Gerando PDF..." : "Baixar PDF"}
        </Button>
      </div>
    </div>
  );
}

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
          <OsViewDialogBody order={order} onDownloadPdf={handlePdfDownload} isGenerating={isGenerating} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
