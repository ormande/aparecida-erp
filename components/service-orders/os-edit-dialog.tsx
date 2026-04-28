"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { ProductCombobox } from "@/components/products/product-combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmployees } from "@/hooks/use-employees";
import type { OrderDetails, OsEditableData, OsEditableProductLine, OsEditableServiceLine } from "@/hooks/use-os-page";
import { currency, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

type Option = { value: string; label: string };
const UNIT_OPTIONS = ["UN", "PAR", "KIT", "L", "ML", "KG", "G", "CX"] as const;

const PAYMENT_METHOD_OPTIONS: Option[] = [
  { value: "Pix", label: "PIX" },
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
  editableProducts,
  setEditableProducts,
  customerOptions,
  unitOptions,
  onClose,
  onSave,
}: {
  order: OrderDetails | null;
  editableData: OsEditableData;
  setEditableData: Dispatch<SetStateAction<OsEditableData>>;
  editableServices: OsEditableServiceLine[];
  setEditableServices: Dispatch<SetStateAction<OsEditableServiceLine[]>>;
  editableProducts: OsEditableProductLine[];
  setEditableProducts: Dispatch<SetStateAction<OsEditableProductLine[]>>;
  customerOptions: Option[];
  unitOptions: Option[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { employees } = useEmployees();
  const [sameEmployeeForAll, setSameEmployeeForAll] = useState(false);
  const [globalEmployeeId, setGlobalEmployeeId] = useState("");

  const employeeOptions = useMemo(
    () =>
      [
        { value: "__casa__", label: "🏠 Casa (sem comissão)" },
        ...employees
          .filter((emp) => emp.situacao === "Ativo")
          .map((emp) => ({
            value: emp.id,
            label: emp.nomeCompleto,
          })),
      ],
    [employees],
  );
  const paymentMethodOptions = useMemo(
    () =>
      editableData.paymentTerm === "A_PRAZO"
        ? [...PAYMENT_METHOD_OPTIONS, { value: "Mensal", label: "Mensal" }]
        : PAYMENT_METHOD_OPTIONS,
    [editableData.paymentTerm],
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

  useEffect(() => {
    if (editableData.paymentTerm !== "A_PRAZO" || editableData.paymentMethod === "Mensal") {
      return;
    }
    setEditableData((current) => ({ ...current, paymentMethod: "Mensal" }));
  }, [editableData.paymentMethod, editableData.paymentTerm, setEditableData]);

  function addService() {
    setEditableServices((current) => [
      ...current,
      {
        id: `service-new-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        serviceId: "",
        description: "",
        quantity: 1,
        laborPrice: 0,
        laborPriceInput: formatCurrencyInput("0"),
        executedByUserId: sameEmployeeForAll ? globalEmployeeId : "",
      },
    ]);
  }

  function addProduct() {
    setEditableProducts((current) => [
      ...current,
      {
        id: `product-new-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        productId: "",
        description: "",
        unit: "UN",
        quantity: 1,
        unitPrice: 0,
        unitPriceInput: formatCurrencyInput("0"),
      },
    ]);
  }

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{order?.number}</DialogTitle>
          <DialogDescription>Edite a OS sem sair da listagem.</DialogDescription>
        </DialogHeader>
        {order ? (
          <div className="grid flex-1 gap-4 overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label>Unidade</Label>
              <SearchableSelect
                value={editableData.unitId}
                onChange={(value) => setEditableData((current) => ({ ...current, unitId: value }))}
                options={unitOptions}
                placeholder="Selecione a unidade"
              />
            </div>
            <div className="grid gap-2 md:max-w-xs">
              <Label>Número da OS</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={editableData.customOsNumber}
                onChange={(event) =>
                  setEditableData((current) => ({
                    ...current,
                    customOsNumber: event.target.value.replace(/\D/g, "").slice(0, 5),
                  }))
                }
                placeholder="Ex: 11042"
                maxLength={5}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2 md:col-span-2">
                <Label>Cliente</Label>
                <SearchableSelect
                  value={editableData.clientId}
                  onChange={(value) => setEditableData((current) => ({ ...current, clientId: value, vehicleId: "" }))}
                  options={customerOptions}
                  placeholder="Selecione o cliente"
                />
              </div>
              <div className="grid gap-2">
                <Label>Forma de pagamento</Label>
                <SearchableSelect
                  value={editableData.paymentMethod}
                  onChange={(value) => setEditableData((current) => ({ ...current, paymentMethod: value }))}
                  placeholder="Selecione a forma de pagamento"
                  options={paymentMethodOptions}
                  disabled={editableData.paymentTerm === "A_PRAZO"}
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
                onClick={() =>
                  setEditableData((current) => ({
                    ...current,
                    paymentTerm: "A_VISTA",
                    dueDate: "",
                    paymentMethod: current.paymentMethod === "Mensal" ? "Pix" : current.paymentMethod,
                  }))
                }
              >
                À vista
              </Button>
              <Button
                variant={editableData.paymentTerm === "A_PRAZO" ? "default" : "outline"}
                onClick={() => setEditableData((current) => ({ ...current, paymentTerm: "A_PRAZO", paymentMethod: "Mensal" }))}
              >
                À prazo
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
              <div className="flex items-center justify-between">
                <Label className="text-base">Serviços</Label>
                <Button type="button" variant="outline" size="sm" onClick={addService}>
                  <Plus className="mr-1 h-4 w-4" />
                  Incluir serviço
                </Button>
              </div>
              {editableServices.map((service) => (
                <div key={service.id} className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                  <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                    <Label>Descrição</Label>
                    <div />
                    <Input
                      value={service.description}
                      onChange={(event) =>
                        setEditableServices((current) =>
                          current.map((item) => (item.id === service.id ? { ...item, description: event.target.value } : item)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 px-0 text-destructive hover:text-destructive"
                      onClick={() => setEditableServices((current) => current.filter((item) => item.id !== service.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[100px_1fr_1fr]">
                    <div className="grid gap-2">
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={service.quantity}
                        onChange={(event) =>
                          setEditableServices((current) =>
                            current.map((item) =>
                              item.id === service.id
                                ? { ...item, quantity: Math.max(1, Math.floor(Number(event.target.value) || 1)) }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Valor unitário</Label>
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
                    <div className="grid gap-2">
                      <Label>Total</Label>
                      <div className="flex h-9 items-center rounded-2xl bg-muted px-3 text-sm font-medium">
                        {currency(service.quantity * service.laborPrice)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Funcionário executante</Label>
                    <SearchableSelect
                      value={service.executedByUserId}
                      onChange={(value) =>
                        setEditableServices((current) =>
                          current.map((item) => (item.id === service.id ? { ...item, executedByUserId: value } : item)),
                        )
                      }
                      placeholder="Selecione o funcionário (opcional)"
                      options={employeeOptions}
                      disabled={sameEmployeeForAll || !employeeOptions.length}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Produtos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                  <Plus className="mr-1 h-4 w-4" />
                  Incluir produto
                </Button>
              </div>
              {editableProducts.map((product) => (
                <div key={product.id} className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                  <div className="grid gap-2">
                    <Label>Produto do catálogo</Label>
                    <ProductCombobox
                      value={product.productId}
                      onChange={(selected) =>
                        setEditableProducts((current) =>
                          current.map((item) =>
                            item.id === product.id
                              ? {
                                  ...item,
                                  productId: selected.id,
                                  description: selected.name,
                                  unit: selected.unit,
                                  unitPrice: selected.salePrice,
                                  unitPriceInput: formatCurrencyInput(String(Math.round(selected.salePrice * 100))),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                    <Label>Descrição</Label>
                    <div />
                    <Input
                      value={product.description}
                      onChange={(event) =>
                        setEditableProducts((current) =>
                          current.map((item) => (item.id === product.id ? { ...item, description: event.target.value } : item)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 px-0 text-destructive hover:text-destructive"
                      onClick={() => setEditableProducts((current) => current.filter((item) => item.id !== product.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="grid gap-2">
                      <Label>Unidade</Label>
                      <Select
                        value={product.unit}
                        onValueChange={(value) =>
                          setEditableProducts((current) =>
                            current.map((item) => (item.id === product.id ? { ...item, unit: value ?? "UN" } : item)),
                          )
                        }
                      >
                        <SelectTrigger className="w-full rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Quantidade</Label>
                      <Input
                        inputMode="decimal"
                        value={String(product.quantity)}
                        onChange={(event) =>
                          setEditableProducts((current) =>
                            current.map((item) =>
                              item.id === product.id ? { ...item, quantity: Number(event.target.value) || 0 } : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Valor unitário</Label>
                      <Input
                        inputMode="decimal"
                        value={product.unitPriceInput}
                        onChange={(event) =>
                          setEditableProducts((current) =>
                            current.map((item) =>
                              item.id === product.id
                                ? {
                                    ...item,
                                    unitPriceInput: formatCurrencyInput(event.target.value),
                                    unitPrice: parseCurrencyInput(formatCurrencyInput(event.target.value)),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Total</Label>
                      <div className="flex h-9 items-center rounded-2xl bg-muted px-3 text-sm font-medium">
                        {currency(product.quantity * product.unitPrice)}
                      </div>
                    </div>
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
            <div className="sticky bottom-0 flex justify-end border-t bg-popover/95 pt-3 backdrop-blur-sm">
              <Button onClick={onSave}>Salvar alterações</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
