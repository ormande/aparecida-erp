"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCustomers } from "@/hooks/use-customers";
import { useReceivables } from "@/hooks/use-receivables";
import { useUnits } from "@/hooks/use-units";
import { currency, date } from "@/lib/formatters";
import { getPersonName } from "@/lib/person-helpers";

export type OrderPreview = {
  id: string;
  number: string;
  clientName: string;
  vehicleLabel: string;
  openedAt: string;
  dueDate: string;
  paymentTerm: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod: string;
  notes: string;
  services: Array<{ id: string; description: string; laborPrice: number }>;
  total: number;
};

export type ReceivablePageRow = {
  id: string;
  description: string;
  clientId: string;
  value: number;
  dueDate: string;
  status: "Pago" | "Pendente" | "Vencido";
  unitId?: string;
  serviceOrderId?: string;
  originType: "SERVICE_ORDER" | "MANUAL";
  installmentNumber?: number;
  installmentCount?: number;
  clientName: string;
  unitName: string;
  originLabel: string;
  installmentLabel: string;
};

export function useReceivablesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [unitId, setUnitId] = useState("general");
  const [installments, setInstallments] = useState("1");
  const [editingReceivableId, setEditingReceivableId] = useState<string | null>(null);
  const [orderPreview, setOrderPreview] = useState<OrderPreview | null>(null);

  const { units } = useUnits();
  const { customers } = useCustomers({ limit: 200 });
  const { receivables, hydrated, setReceivables } = useReceivables({
    status: statusFilter,
    period: periodFilter,
    unitId: unitFilter,
  });

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: getPersonName(customer, "-"),
      })),
    [customers],
  );

  const unitOptions = useMemo(
    () => [{ value: "general", label: "Geral" }, ...units.map((unit) => ({ value: unit.id, label: unit.name }))],
    [units],
  );

  const totalPendente = useMemo(
    () => receivables.filter((item) => item.status === "Pendente").reduce((sum, item) => sum + item.value, 0),
    [receivables],
  );
  const totalVencido = useMemo(
    () => receivables.filter((item) => item.status === "Vencido").reduce((sum, item) => sum + item.value, 0),
    [receivables],
  );
  const totalRecebidoMes = useMemo(
    () => receivables.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.value, 0),
    [receivables],
  );

  const data = useMemo<ReceivablePageRow[]>(
    () =>
      receivables.map((item) => ({
        ...item,
        originLabel: item.originType === "SERVICE_ORDER" ? "OS" : "Avulso",
        installmentLabel:
          item.installmentNumber && item.installmentCount
            ? `${item.installmentNumber}/${item.installmentCount}`
            : "-",
      })),
    [receivables],
  );

  const searchKeys = useMemo<Array<(row: ReceivablePageRow) => string>>(
    () => [(row) => row.description, (row) => row.clientName],
    [],
  );

  const editingReceivable = useMemo(
    () => data.find((item) => item.id === editingReceivableId) ?? null,
    [data, editingReceivableId],
  );

  const handleCreateReceivable = useCallback(async () => {
    const response = await fetch("/api/receivables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        customerId,
        amount: Number(amount),
        dueDate,
        unitId: unitId === "general" ? null : unitId,
        installments: Number(installments),
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      toast.error(json.message ?? "Não foi possível criar o recebível.");
      return;
    }

    setReceivables((current) => [...current, ...(json.receivables ?? [])]);
    setOpen(false);
    setDescription("");
    setCustomerId("");
    setAmount("");
    setDueDate("");
    setUnitId("general");
    setInstallments("1");
    toast.success("Recebível cadastrado com sucesso!");
  }, [amount, customerId, description, dueDate, installments, setReceivables, unitId]);

  const handleUpdateReceivable = useCallback(async () => {
    if (!editingReceivable) {
      return;
    }

    const response = await fetch(`/api/receivables/${editingReceivable.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "edit",
        description,
        customerId,
        amount: Number(amount),
        dueDate,
        unitId: unitId === "general" ? null : unitId,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      toast.error(json.message ?? "Não foi possível atualizar o recebível.");
      return;
    }

    setReceivables((current) => current.map((item) => (item.id === editingReceivable.id ? json.receivable : item)));
    setEditingReceivableId(null);
    setOpen(false);
    toast.success("Recebível atualizado com sucesso!");
  }, [amount, customerId, description, dueDate, editingReceivable, setReceivables, unitId]);

  const handleStatusChange = useCallback(
    async (id: string, mode: "settle" | "reopen") => {
      const response = await fetch(`/api/receivables/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error(json.message ?? "Não foi possível alterar o status.");
        return;
      }

      setReceivables((current) => current.map((item) => (item.id === id ? json.receivable : item)));
      toast.success(mode === "settle" ? "Recebível baixado com sucesso!" : "Recebível reaberto com sucesso!");
    },
    [setReceivables],
  );

  const openOrderPreview = useCallback(async (orderId: string) => {
    const response = await fetch(`/api/service-orders/${orderId}`, { cache: "no-store" });
    const json = await response.json();

    if (!response.ok) {
      toast.error(json.message ?? "Não foi possível carregar a OS.");
      return;
    }

    setOrderPreview(json.order);
  }, []);

  const openCreateDialog = useCallback(() => {
    setEditingReceivableId(null);
    setDescription("");
    setCustomerId("");
    setAmount("");
    setDueDate("");
    setUnitId("general");
    setInstallments("1");
    setOpen(true);
  }, []);

  const openEditDialog = useCallback(
    (id: string) => {
      const target = data.find((item) => item.id === id);
      if (!target || target.originType === "SERVICE_ORDER") {
        return;
      }

      setEditingReceivableId(id);
      setDescription(target.description);
      setCustomerId(target.clientId);
      setAmount(String(target.value));
      setDueDate(target.dueDate);
      setUnitId(target.unitId ?? "general");
      setInstallments(String(target.installmentCount ?? 1));
      setOpen(true);
    },
    [data],
  );

  const onSaveReceivable = useCallback(() => {
    if (editingReceivable) {
      void handleUpdateReceivable();
    } else {
      void handleCreateReceivable();
    }
  }, [editingReceivable, handleCreateReceivable, handleUpdateReceivable]);

  const tableColumns = useMemo(
    () => [
      { key: "description", header: "Descrição", render: (row: ReceivablePageRow) => <span className="font-medium">{row.description}</span> },
      { key: "client", header: "Cliente", render: (row: ReceivablePageRow) => row.clientName },
      { key: "unit", header: "Unidade", render: (row: ReceivablePageRow) => row.unitName },
      { key: "origin", header: "Origem", render: (row: ReceivablePageRow) => row.originLabel },
      { key: "installment", header: "Parcela", render: (row: ReceivablePageRow) => row.installmentLabel },
      { key: "value", header: "Valor", render: (row: ReceivablePageRow) => currency(row.value) },
      { key: "dueDate", header: "Vencimento", render: (row: ReceivablePageRow) => date(row.dueDate) },
      { key: "status", header: "Status", render: (row: ReceivablePageRow) => <StatusBadge status={row.status} /> },
      {
        key: "actions",
        header: "Ações",
        render: (row: ReceivablePageRow) => (
          <div className="flex gap-2">
            {row.originType === "MANUAL" ? (
              <Button variant="outline" size="sm" onClick={() => openEditDialog(row.id)}>
                Editar
              </Button>
            ) : row.serviceOrderId ? (
              <Button variant="outline" size="sm" onClick={() => openOrderPreview(row.serviceOrderId!)}>
                Ver OS
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(row.id, row.status === "Pago" ? "reopen" : "settle")}
            >
              {row.status === "Pago" ? "Reabrir" : "Baixar"}
            </Button>
          </div>
        ),
      },
    ],
    [handleStatusChange, openEditDialog, openOrderPreview],
  );

  const closeOrderPreview = useCallback(() => setOrderPreview(null), []);

  return {
    statusFilter,
    setStatusFilter,
    periodFilter,
    setPeriodFilter,
    unitFilter,
    setUnitFilter,
    units,
    open,
    setOpen,
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
    orderPreview,
    customerOptions,
    unitOptions,
    totalPendente,
    totalVencido,
    totalRecebidoMes,
    data,
    searchKeys,
    hydrated,
    editingReceivable,
    openCreateDialog,
    onSaveReceivable,
    closeOrderPreview,
    refreshOrderPreview: openOrderPreview,
    tableColumns,
  };
}
