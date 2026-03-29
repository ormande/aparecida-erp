"use client";

import { Info, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WORKSPACES } from "@/lib/config";
import { appUsers, companyProfile } from "@/lib/mock-data";

export default function ConfiguracoesPage() {
  const [stockEnabled, setStockEnabled] = useState(false);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        subtitle="Ajuste dados da empresa, usuários, unidades e módulos disponíveis."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="surface-card border-none">
          <CardHeader><CardTitle>Empresa</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input defaultValue={companyProfile.name} />
            </div>
            <div className="grid gap-2">
              <Label>Endereço</Label>
              <Input defaultValue={companyProfile.address} />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input defaultValue={companyProfile.phone} />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-none">
          <CardHeader><CardTitle>Usuários</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {appUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.role}</p>
                </div>
                <Badge>{user.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-card border-none">
          <CardHeader><CardTitle>Áreas de trabalho</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {WORKSPACES.map((workspace) => (
              <div key={workspace.id} className="rounded-2xl border bg-muted/30 p-4">
                <p className="font-medium">{workspace.name}</p>
              </div>
            ))}
            <Button variant="outline" onClick={() => toast.success("Fluxo mockado: unidade adicionada.")}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar unidade
            </Button>
          </CardContent>
        </Card>

        <Card className="surface-card border-none">
          <CardHeader><CardTitle>Integrações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
              <div>
                <p className="font-medium">Login com Google</p>
                <p className="text-sm text-muted-foreground">Status: Não configurado</p>
              </div>
              <Dialog>
                <DialogTrigger render={<Button variant="outline">Como configurar</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Como configurar o Google Login</DialogTitle>
                    <DialogDescription>Preencha as variáveis abaixo no seu `.env.local`.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 rounded-2xl bg-muted p-4 text-sm">
                    <p>`NEXTAUTH_SECRET`</p>
                    <p>`NEXTAUTH_URL`</p>
                    <p>`GOOGLE_CLIENT_ID`</p>
                    <p>`GOOGLE_CLIENT_SECRET`</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-none xl:col-span-2">
          <CardHeader><CardTitle>Módulos</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-2xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">Módulo de Estoque</p>
                  <Tooltip>
                    <TooltipTrigger render={<Info className="h-4 w-4 text-muted-foreground" />} />
                    <TooltipContent>
                      <p>Ative quando quiser começar a usar o controle de estoque.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Neste protótipo, o toggle é ilustrativo. A flag real está em `lib/config.ts`.
                </p>
              </div>
              <Switch checked={stockEnabled} onCheckedChange={setStockEnabled} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
