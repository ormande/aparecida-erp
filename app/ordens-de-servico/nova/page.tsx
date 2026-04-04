"use client";

import Link from "next/link";

import { OsNovaMainForm } from "@/components/service-orders/os-nova-main-form";
import { OsSummaryCard } from "@/components/service-orders/os-summary-card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useNovaOs } from "@/hooks/use-nova-os";

export default function NovaOsPage() {
  const os = useNovaOs();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nova Ordem de Serviço"
        subtitle="Abra uma nova OS com cliente cadastrado ou avulso."
        actions={
          <Link href="/ordens-de-servico" className="inline-flex">
            <Button variant="outline">Voltar para a lista</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <OsNovaMainForm os={os} />
        <OsSummaryCard
          total={os.total}
          laborTotal={os.laborTotal}
          productsTotal={os.productsTotal}
          unitName={os.summaryUnitName}
          clientName={os.summaryClientName}
          vehiclePlate={os.summaryVehiclePlate}
          paymentTerm={os.paymentTerm}
          dueDate={os.dueDate}
          isLoading={os.isLoading}
          disabled={!os.selectedUnitId}
          onSubmit={os.handleSubmit}
          onSubmitAndContinue={os.handleSubmitAndContinue}
        />
      </div>
    </div>
  );
}
