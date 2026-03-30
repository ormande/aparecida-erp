"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ServiceForm } from "@/components/services/service-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function NovoServicoPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Novo servico"
        subtitle="Cadastre um servico para reutilizar na abertura das ordens de servico."
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Cadastro de servico</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm
            submitLabel="Salvar servico"
            onSubmit={async (values) => {
              const response = await fetch("/api/services", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });

              const data = await response.json();

              if (!response.ok) {
                toast.error(data.message ?? "Nao foi possivel cadastrar o servico.");
                return;
              }

              toast.success("Servico cadastrado com sucesso!");
              router.push("/servicos");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
