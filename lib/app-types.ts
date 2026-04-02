export type ServiceOrderStatusLabel =
  | "Aberta"
  | "Em andamento"
  | "Aguardando peça"
  | "Concluída"
  | "Cancelada";

export type FinancialStatusLabel = "Pago" | "Pendente" | "Vencido";
export type ClientType = "pf" | "pj";
export type ClientSituation = "Ativo" | "Inativo";
export type SupplierCategory = "Pneus" | "Peças" | "Insumos" | "Serviços" | "Outros";
export type EmployeeAccessLevel = "Proprietário" | "Gestor" | "Funcionário";

type BasePerson = {
  id: string;
  tipo: ClientType;
  situacao: ClientSituation;
  celular: string;
  whatsapp: string;
  email: string;
  observacoes: string;
  nomeCompleto?: string;
  cpf?: string;
  dataNascimento?: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
};

export type Client = BasePerson & {
  veiculosCount: number;
};

export type Supplier = BasePerson & {
  categoria: SupplierCategory;
};

export type Employee = {
  id: string;
  nomeCompleto: string;
  email: string;
  telefone: string;
  nivelAcesso: EmployeeAccessLevel;
  situacao: ClientSituation;
  monthlyGoal: number | null;
};

export type Receivable = {
  id: string;
  description: string;
  clientId: string;
  value: number;
  dueDate: string;
  status: FinancialStatusLabel;
};

export type Payable = {
  id: string;
  description: string;
  category: "Aluguel" | "Fornecedores" | "Água/Luz" | "Funcionários" | "Outros";
  value: number;
  dueDate: string;
  status: FinancialStatusLabel;
};
