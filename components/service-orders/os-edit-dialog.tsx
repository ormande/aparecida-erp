"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { useEmployees } from "@/hooks/use-employees";
import type { OrderDetails, OsEditableData, OsEditableServiceLine } from "@/hooks/use-os-page";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

type Option = { value: string; label: string };

const PAYMENT_METHOD_OPTIONS: Option[] = [
  { value: "Pix", label: "Pix" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Débito", label: "Débito" },
  { value: "Crédito", label: "Crédito" },
];

export function OsEditDialog({
  order,
  editableData,
  setEditableData,
  editableServices,
  setEditableServices,
  customerOptions,
  unitOptions,
  vehicleOptions,
  onClose,
  onSave,
}: {
  order: OrderDetails | null;
  editableData: OsEditableData;
  setEditableData: Dispatch<SetStateAction<OsEditableData>>;
  editableServices: OsEditableServiceLine[];
  setEditableServices: Dispatch<SetStateAction<OsEditableServiceLine[]>>;
  customerOptions: Option[];
  unitOptions: Option[];
  vehicleOptions: Option[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { employees } = useEmployees();
  const [sameEmployeeForAll, setSameEmployeeForAll] = useState(false);
  const [globalEmployeeId, setGlobalEmployeeId] = useState("");

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((emp) => emp.situacao === "Ativo")
        .map((emp) => ({
          value: emp.id,
          label: emp.nomeCompleto,
        })),
    [employees],
  );

  useEffect(() => {
    if (!order?.id) {
      setSameEmployeeForAll(false);
      setGlobalEmployeeId("");
      return;
    }
    if (!order.services.length) {
      setSameEmployeeForAll(false);
      setGlobalEmployeeId("");
      return;
    }
    const ids = order.services.map((s) => s.executedByUserId).filter(Boolean) as string[];
    if (ids.length === order.services.length && new Set(ids).size === 1) {
      setSameEmployeeForAll(true);
      setGlobalEmployeeId(ids[0] ?? "");
    } else {
      setSameEmployeeForAll(false);
      setGlobalEmployeeId("");
    }
  }, [order]);

  useEffect(() => {
    if (!sameEmployeeForAll || !globalEmployeeId) {
      return;
    }
    setEditableServices((current) => current.map((line) => ({ ...line, executedByUserId: globalEmployeeId })));
  }, [sameEmployeeForAll, globalEmployeeId, setEditableServices]);

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{order?.number}</DialogTitle>
          <DialogDescription>Edite a OS sem sair da listagem.</DialogDescription>
        </DialogHeader>
        {order ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Unidade</Label>
              <SearchableSelect
                value={editableData.unitId}
                onChange={(value) => setEditableData((current) => ({ ...current, unitId: value }))}
                options={unitOptions}
                placeholder="Selecione a unidade"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <SearchableSelect
                  value={editableData.clientId}
                  onChange={(value) => setEditableData((current) => ({ ...current, clientId: value, vehicleId: "" }))}
                  options={customerOptions}
                  placeholder="Selecione o cliente"
                />
              </div>
              <div className="grid gap-2">
                <Label>Veículo</Label>
                <SearchableSelect
                  value={editableData.vehicleId}
                  onChange={(value) => setEditableData((current) => ({ ...current, vehicleId: value }))}
                  options={vehicleOptions}
                  placeholder="Selecione o veículo"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Quilometragem</Label>
                <Input
                  value={editableData.mileage}
                  onChange={(event) => setEditableData((current) => ({ ...current, mileage: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Forma de pagamento</Label>
                <SearchableSelect
                  value={editableData.paymentMethod}
                  onChange={(value) => setEditableData((current) => ({ ...current, paymentMethod: value }))}
                  placeholder="Selecione a forma de pagamento"
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </div>
              <div className="grid gap-2">
                <Label>Vencimento</Label>
                <DatePicker
                  disabled={editableData.paymentTerm !== "A_PRAZO"}
                  value={editableData.dueDate}
                  onChange={(v) => setEditableData((current) => ({ ...current, dueDate: v }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={editableData.paymentTerm === "A_VISTA" ? "default" : "outline"}
                onClick={() => setEditableData((current) => ({ ...current, paymentTerm: "A_VISTA", dueDate: "" }))}
              >
                A vista
              </Button>
              <Button
                variant={editableData.paymentTerm === "A_PRAZO" ? "default" : "outline"}
                onClick={() => setEditableData((current) => ({ ...current, paymentTerm: "A_PRAZO" }))}
              >
                A prazo
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={sameEmployeeForAll}
                  onCheckedChange={(checked) => setSameEmployeeForAll(checked === true)}
                />
                Mesmo funcionário para todos os serviços
              </label>
              {sameEmployeeForAll ? (
                <div className="min-w-[220px] flex-1 sm:max-w-sm">
                  <SearchableSelect
                    value={globalEmployeeId}
                    onChange={setGlobalEmployeeId}
                    placeholder="Funcionário para todos"
                    options={employeeOptions}
                    disabled={!employeeOptions.length}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {editableServices.map((service) => (
                <div key={service.id} className="grid gap-3 rounded-2xl border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="grid gap-2">
                    <Label>Descrição</Label>
                    <Input
                      value={service.description}
                      onChange={(event) =>
                        setEditableServices((current) =>
                          current.map((item) => (item.id === service.id ? { ...item, description: event.target.value } : item)),
                        )
                      }
                    />
                    <Label>Funcionário executante</Label>
                    <SearchableSelect
                      value={service.executedByUserId}
                      onChange={(value) =>
                        setEditableServices((current) =>
                          current.map((item) => (item.id === service.id ? { ...item, executedByUserId: value } : item)),
                        )
                      }
                      placeholder="Selecione o funcionário"
                      options={employeeOptions}
                      disabled={sameEmployeeForAll || !employeeOptions.length}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor</Label>
                    <Input
                      value={service.laborPriceInput}
                      onChange={(event) =>
                        setEditableServices((current) =>
                          current.map((item) =>
                            item.id === service.id
                              ? {
                                  ...item,
                                  laborPriceInput: formatCurrencyInput(event.target.value),
                                  laborPrice: parseCurrencyInput(formatCurrencyInput(event.target.value)),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea
                rows={5}
                value={editableData.notes}
                onChange={(event) => setEditableData((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={onSave}>Salvar alterações</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
