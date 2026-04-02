"use client";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ReceivablePageRow } from "@/hooks/use-receivables-page";

type UnitOption = { value: string; label: string };
type CustomerOption = { value: string; label: string };

export function ReceivableFormDialog({
  editingReceivable,
  customerOptions,
  unitOptions,
  description,
  setDescription,
  customerId,
  setCustomerId,
  amount,
  setAmount,
  dueDate,
  setDueDate,
  unitId,
  setUnitId,
  installments,
  setInstallments,
  onSave,
}: {
  editingReceivable: ReceivablePageRow | null;
  customerOptions: CustomerOption[];
  unitOptions: UnitOption[];
  description: string;
  setDescription: (value: string) => void;
  customerId: string;
  setCustomerId: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  unitId: string;
  setUnitId: (value: string) => void;
  installments: string;
  setInstallments: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingReceivable ? "Editar recebível" : "Novo recebível avulso"}</DialogTitle>
          <DialogDescription>
            {editingReceivable
              ? "Atualize os dados do lançamento manual."
              : "Use este lançamento quando a entrada não vier diretamente de uma OS."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Cliente</Label>
            <SearchableSelect
              value={customerId}
              onChange={setCustomerId}
              placeholder="Selecione o cliente"
              options={customerOptions}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor</Label>
              <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Vencimento</Label>
              <DatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Unidade</Label>
              <SearchableSelect value={unitId} onChange={setUnitId} placeholder="Selecione a unidade" options={unitOptions} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="installments">Parcelas</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                max="24"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                disabled={Boolean(editingReceivable)}
              />
            </div>
          </div>
          <Button onClick={onSave}>{editingReceivable ? "Salvar alterações" : "Salvar recebível"}</Button>
        </div>
    </DialogContent>
  );
}
