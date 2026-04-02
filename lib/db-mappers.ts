import type {
  AccountPayable,
  AccountReceivable,
  Customer,
  FinancialStatus,
  ReceivableOriginType,
  ServiceCatalog,
  ServiceOrderStatus,
  Supplier,
  SupplierCategory,
  User,
  Vehicle,
} from "@prisma/client";

import type { Client, Employee, Payable, Receivable, Supplier as AppSupplier } from "@/lib/app-types";

function mapRecordStatus(status: "ATIVO" | "INATIVO") {
  return status === "ATIVO" ? "Ativo" : "Inativo";
}

function mapUserAccessLevel(level: "PROPRIETARIO" | "GESTOR" | "FUNCIONARIO") {
  if (level === "PROPRIETARIO") {
    return "Proprietário";
  }
  if (level === "GESTOR") {
    return "Gestor";
  }
  return "Funcionário";
}

function formatPhone(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function mapPersonType(type: "PF" | "PJ") {
  return type === "PF" ? "pf" : "pj";
}

export function mapUserToEmployee(
  user: Pick<User, "id" | "name" | "email" | "phone" | "accessLevel" | "status"> & {
    monthlyGoal?: User["monthlyGoal"] | null;
  },
): Employee {
  return {
    id: user.id,
    nomeCompleto: user.name,
    email: user.email,
    telefone: formatPhone(user.phone),
    nivelAcesso: mapUserAccessLevel(user.accessLevel),
    situacao: mapRecordStatus(user.status),
    monthlyGoal:
      user.monthlyGoal === undefined || user.monthlyGoal === null ? null : Number(user.monthlyGoal),
  };
}

export function mapCustomerToClient(
  customer: Pick<
    Customer,
    | "id"
    | "type"
    | "status"
    | "phone"
    | "whatsapp"
    | "email"
    | "notes"
    | "fullName"
    | "cpf"
    | "birthDate"
    | "tradeName"
    | "legalName"
    | "cnpj"
  > & {
    _count?: {
      vehicles?: number;
    };
  },
): Client {
  return {
    id: customer.id,
    tipo: mapPersonType(customer.type),
    situacao: mapRecordStatus(customer.status),
    celular: customer.phone,
    whatsapp: customer.whatsapp ?? customer.phone,
    email: customer.email ?? "",
    observacoes: customer.notes ?? "",
    veiculosCount: customer._count?.vehicles ?? 0,
    nomeCompleto: customer.fullName ?? undefined,
    cpf: customer.cpf ?? undefined,
    dataNascimento: customer.birthDate ? customer.birthDate.toISOString().slice(0, 10) : undefined,
    nomeFantasia: customer.tradeName ?? undefined,
    razaoSocial: customer.legalName ?? undefined,
    cnpj: customer.cnpj ?? undefined,
  };
}

function mapSupplierCategory(category: SupplierCategory): AppSupplier["categoria"] {
  switch (category) {
    case "PNEUS":
      return "Pneus";
    case "PECAS":
      return "Peças";
    case "INSUMOS":
      return "Insumos";
    case "SERVICOS":
      return "Serviços";
    case "OUTROS":
    default:
      return "Outros";
  }
}

function mapFinancialStatus(status: FinancialStatus): Receivable["status"] {
  switch (status) {
    case "PAGO":
      return "Pago";
    case "VENCIDO":
      return "Vencido";
    case "PENDENTE":
    default:
      return "Pendente";
  }
}

export function mapSupplierToAppSupplier(
  supplier: Pick<
    Supplier,
    | "id"
    | "type"
    | "status"
    | "category"
    | "phone"
    | "whatsapp"
    | "email"
    | "notes"
    | "fullName"
    | "cpf"
    | "birthDate"
    | "tradeName"
    | "legalName"
    | "cnpj"
  >,
): AppSupplier {
  return {
    id: supplier.id,
    tipo: mapPersonType(supplier.type),
    situacao: mapRecordStatus(supplier.status),
    categoria: mapSupplierCategory(supplier.category),
    celular: supplier.phone,
    whatsapp: supplier.whatsapp ?? supplier.phone,
    email: supplier.email ?? "",
    observacoes: supplier.notes ?? "",
    nomeCompleto: supplier.fullName ?? undefined,
    cpf: supplier.cpf ?? undefined,
    dataNascimento: supplier.birthDate ? supplier.birthDate.toISOString().slice(0, 10) : undefined,
    nomeFantasia: supplier.tradeName ?? undefined,
    razaoSocial: supplier.legalName ?? undefined,
    cnpj: supplier.cnpj ?? undefined,
  };
}

export type AppVehicle = {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  color: string;
  clientId: string;
  notes: string;
};

export function mapVehicleToAppVehicle(
  vehicle: Pick<Vehicle, "id" | "plate" | "model" | "brand" | "year" | "color" | "customerId" | "notes">,
): AppVehicle {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    model: vehicle.model,
    brand: vehicle.brand,
    year: vehicle.year,
    color: vehicle.color ?? "",
    clientId: vehicle.customerId,
    notes: vehicle.notes ?? "",
  };
}

export type AppService = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  isActive: boolean;
};

export function mapReceivableToAppReceivable(
  receivable: Pick<
    AccountReceivable,
    | "id"
    | "description"
    | "amount"
    | "dueDate"
    | "status"
    | "customerId"
    | "unitId"
    | "serviceOrderId"
    | "originType"
    | "installmentNumber"
    | "installmentCount"
  >,
): Receivable & {
  unitId?: string;
  serviceOrderId?: string;
  originType: ReceivableOriginType;
  installmentNumber?: number;
  installmentCount?: number;
} {
  return {
    id: receivable.id,
    description: receivable.description,
    clientId: receivable.customerId ?? "",
    value: Number(receivable.amount),
    dueDate: receivable.dueDate.toISOString().slice(0, 10),
    status: mapFinancialStatus(receivable.status),
    unitId: receivable.unitId ?? undefined,
    serviceOrderId: receivable.serviceOrderId ?? undefined,
    originType: receivable.originType,
    installmentNumber: receivable.installmentNumber ?? undefined,
    installmentCount: receivable.installmentCount ?? undefined,
  };
}

function mapPayableCategory(category: AccountPayable["category"]): Payable["category"] {
  switch (category) {
    case "ALUGUEL":
      return "Aluguel";
    case "FORNECEDORES":
      return "Fornecedores";
    case "AGUA_LUZ":
      return "Água/Luz";
    case "FUNCIONARIOS":
      return "Funcionários";
    case "OUTROS":
    default:
      return "Outros";
  }
}

export function mapPayableToAppPayable(
  payable: Pick<
    AccountPayable,
    | "id"
    | "description"
    | "category"
    | "amount"
    | "dueDate"
    | "status"
    | "unitId"
    | "supplierId"
    | "installmentNumber"
    | "installmentCount"
  >,
): Payable & {
  unitId?: string;
  supplierId?: string;
  installmentNumber?: number;
  installmentCount?: number;
} {
  return {
    id: payable.id,
    description: payable.description,
    category: mapPayableCategory(payable.category),
    value: Number(payable.amount),
    dueDate: payable.dueDate.toISOString().slice(0, 10),
    status: mapFinancialStatus(payable.status),
    unitId: payable.unitId ?? undefined,
    supplierId: payable.supplierId ?? undefined,
    installmentNumber: payable.installmentNumber ?? undefined,
    installmentCount: payable.installmentCount ?? undefined,
  };
}

export function mapServiceToAppService(
  service: Pick<ServiceCatalog, "id" | "name" | "description" | "basePrice" | "isActive">,
): AppService {
  return {
    id: service.id,
    name: service.name,
    description: service.description ?? "",
    basePrice: Number(service.basePrice),
    isActive: service.isActive,
  };
}

export function mapServiceOrderStatus(status: ServiceOrderStatus): ServiceOrderStatusLabel {
  switch (status) {
    case "ABERTA":
      return "Aberta";
    case "EM_ANDAMENTO":
      return "Em andamento";
    case "AGUARDANDO_PECA":
      return "Aguardando peça";
    case "CONCLUIDA":
      return "Concluída";
    case "CANCELADA":
      return "Cancelada";
    default:
      return "Aberta";
  }
}

export type ServiceOrderStatusLabel =
  | "Aberta"
  | "Em andamento"
  | "Aguardando peça"
  | "Concluída"
  | "Cancelada";
