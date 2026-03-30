"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Employee } from "@/lib/app-types";

export function EmployeePreviewDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Funcionário</DialogTitle>
          <DialogDescription>Visualização rápida do cadastro.</DialogDescription>
        </DialogHeader>

        {employee ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome completo</Label>
              <Input value={employee.nomeCompleto} disabled />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>E-mail</Label>
                <Input value={employee.email} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input value={employee.telefone} disabled />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Nível de acesso</Label>
                <Input value={employee.nivelAcesso} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Situação</Label>
                <Input value={employee.situacao} disabled />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
