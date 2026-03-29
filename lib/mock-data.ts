export type ServiceOrderStatus =
  | "Aberta"
  | "Em andamento"
  | "Aguardando peça"
  | "Concluída"
  | "Cancelada";

export type FinancialStatus = "Pago" | "Pendente" | "Vencido";
export type ClientType = "pf" | "pj";
export type ClientSituation = "Ativo" | "Inativo";
export type SupplierCategory = "Pneus" | "Peças" | "Insumos" | "Serviços" | "Outros";

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

export type Vehicle = {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  color: string;
  clientId: string;
  notes: string;
};

export type ServiceItem = {
  id: string;
  description: string;
  laborPrice: number;
};

export type ServiceOrder = {
  id: string;
  number: string;
  clientId: string;
  vehicleId: string;
  services: ServiceItem[];
  status: ServiceOrderStatus;
  total: number;
  openedAt: string;
  mileage: number;
  paymentMethod: string;
  notes: string;
};

export type Receivable = {
  id: string;
  description: string;
  clientId: string;
  value: number;
  dueDate: string;
  status: FinancialStatus;
};

export type Payable = {
  id: string;
  description: string;
  category: "Aluguel" | "Fornecedores" | "Água/Luz" | "Funcionários" | "Outros";
  value: number;
  dueDate: string;
  status: FinancialStatus;
};

export type CashFlowDay = {
  date: string;
  entries: number;
  exits: number;
};

export const clients: Client[] = [
  {
    id: "c1",
    tipo: "pf",
    situacao: "Ativo",
    nomeCompleto: "João Carlos Mendes",
    cpf: "247.519.880-16",
    dataNascimento: "1988-04-12",
    celular: "(67) 99112-0145",
    whatsapp: "(67) 99112-0145",
    email: "joaomendes@email.com",
    observacoes: "Cliente antigo, prefere atendimento pela manhã.",
    veiculosCount: 1,
  },
  {
    id: "c2",
    tipo: "pf",
    situacao: "Ativo",
    nomeCompleto: "Ana Paula Ribeiro",
    cpf: "851.203.170-09",
    dataNascimento: "1992-09-18",
    celular: "(67) 99234-1170",
    whatsapp: "(67) 99234-1170",
    email: "anapaula@email.com",
    observacoes: "Frota familiar com dois veículos.",
    veiculosCount: 1,
  },
  {
    id: "c3",
    tipo: "pj",
    situacao: "Ativo",
    nomeFantasia: "Lima Entregas",
    razaoSocial: "Carlos Eduardo Lima Transportes Ltda",
    cnpj: "11.237.098/0001-54",
    celular: "(67) 99910-8812",
    whatsapp: "(67) 99910-8812",
    email: "contato@limaentregas.com.br",
    observacoes: "Cliente PJ com demanda de frota.",
    veiculosCount: 1,
  },
  {
    id: "c4",
    tipo: "pf",
    situacao: "Ativo",
    nomeCompleto: "Fernanda Souza Martins",
    cpf: "319.004.150-80",
    dataNascimento: "1985-01-26",
    celular: "(67) 98177-3201",
    whatsapp: "(67) 98177-3201",
    email: "fernandamartins@email.com",
    observacoes: "Sempre pede revisão completa antes de viagens.",
    veiculosCount: 1,
  },
  {
    id: "c5",
    tipo: "pf",
    situacao: "Inativo",
    nomeCompleto: "Marcos Vinícius Alves",
    cpf: "483.210.640-61",
    dataNascimento: "1990-06-03",
    celular: "(67) 99321-7230",
    whatsapp: "(67) 99321-7230",
    email: "marcos.alves@email.com",
    observacoes: "Pagamento via Pix.",
    veiculosCount: 0,
  },
  {
    id: "c6",
    tipo: "pf",
    situacao: "Ativo",
    nomeCompleto: "Patrícia Helena Gomes",
    cpf: "913.008.200-52",
    dataNascimento: "1987-11-11",
    celular: "(67) 99945-7731",
    whatsapp: "(67) 99945-7731",
    email: "patricia.gomes@email.com",
    observacoes: "Contato preferencial por WhatsApp.",
    veiculosCount: 1,
  },
  {
    id: "c7",
    tipo: "pj",
    situacao: "Ativo",
    nomeFantasia: "Nunes Agro",
    razaoSocial: "Ricardo Batista Nunes Comércio Rural ME",
    cnpj: "67.332.950/0001-00",
    celular: "(67) 98111-6612",
    whatsapp: "(67) 98111-6612",
    email: "compras@nunesagro.com.br",
    observacoes: "Cliente corporativo eventual.",
    veiculosCount: 0,
  },
  {
    id: "c8",
    tipo: "pf",
    situacao: "Ativo",
    nomeCompleto: "Luciana Ferreira Costa",
    cpf: "529.882.710-34",
    dataNascimento: "1995-08-24",
    celular: "(67) 99288-1919",
    whatsapp: "(67) 99288-1919",
    email: "luciana.costa@email.com",
    observacoes: "Veículo usado em estrada de chão.",
    veiculosCount: 1,
  },
];

export const suppliers: Supplier[] = [
  {
    id: "f1",
    tipo: "pj",
    situacao: "Ativo",
    categoria: "Pneus",
    nomeFantasia: "Pneu Forte Distribuidora",
    razaoSocial: "Pneu Forte Comércio de Pneus Ltda",
    cnpj: "12.845.901/0001-30",
    celular: "(67) 99811-4500",
    whatsapp: "(67) 99811-4500",
    email: "vendas@pneuforte.com.br",
    observacoes: "Entrega quinzenal para pneus de passeio.",
  },
  {
    id: "f2",
    tipo: "pj",
    situacao: "Ativo",
    categoria: "Peças",
    nomeFantasia: "Auto Peças Campo Grande",
    razaoSocial: "AP Campo Grande Distribuição Automotiva Ltda",
    cnpj: "48.220.117/0001-92",
    celular: "(67) 99140-2201",
    whatsapp: "(67) 99140-2201",
    email: "comercial@apcg.com.br",
    observacoes: "Fornecedor principal de válvulas e bicos.",
  },
  {
    id: "f3",
    tipo: "pj",
    situacao: "Inativo",
    categoria: "Insumos",
    nomeFantasia: "Borrachas Brasil",
    razaoSocial: "Borrachas Brasil Insumos Ltda",
    cnpj: "07.551.864/0001-08",
    celular: "(67) 98422-9910",
    whatsapp: "(67) 98422-9910",
    email: "atendimento@borrachasbrasil.com.br",
    observacoes: "Parceria pausada por reajuste de preços.",
  },
  {
    id: "f4",
    tipo: "pj",
    situacao: "Ativo",
    categoria: "Serviços",
    nomeFantasia: "Express Coletas",
    razaoSocial: "Express Coletas e Fretes Ltda",
    cnpj: "55.104.663/0001-41",
    celular: "(67) 99633-1020",
    whatsapp: "(67) 99633-1020",
    email: "operacao@expresscoletas.com.br",
    observacoes: "Apoio logístico para retirada de mercadorias.",
  },
];

export const vehicles: Vehicle[] = [
  { id: "v1", plate: "QAB-1234", brand: "Fiat", model: "Strada", year: 2021, color: "Branco", clientId: "c1", notes: "Pneu traseiro direito troca recente." },
  { id: "v2", plate: "HJK1D23", brand: "Volkswagen", model: "Gol", year: 2018, color: "Prata", clientId: "c2", notes: "Alinhamento recorrente." },
  { id: "v3", plate: "BRA-9087", brand: "Chevrolet", model: "Onix", year: 2020, color: "Preto", clientId: "c4", notes: "Uso urbano." },
  { id: "v4", plate: "RTA-3321", brand: "Toyota", model: "Hilux", year: 2022, color: "Cinza", clientId: "c3", notes: "Veículo de frota." },
  { id: "v5", plate: "MSQ6A45", brand: "Hyundai", model: "HB20", year: 2019, color: "Vermelho", clientId: "c6", notes: "Cliente cuida bem do veículo." },
  { id: "v6", plate: "QCX-7701", brand: "Ford", model: "Ranger", year: 2017, color: "Azul", clientId: "c8", notes: "Uso em zona rural." },
];

export const serviceOrders: ServiceOrder[] = [
  {
    id: "os1",
    number: "OS-2025-001",
    clientId: "c1",
    vehicleId: "v1",
    services: [
      { id: "s1", description: "Troca de pneu dianteiro", laborPrice: 120 },
      { id: "s2", description: "Balanceamento", laborPrice: 60 },
    ],
    status: "Aberta",
    total: 180,
    openedAt: "2025-03-28",
    mileage: 68420,
    paymentMethod: "Pix",
    notes: "Cliente aguarda orçamento final.",
  },
  {
    id: "os2",
    number: "OS-2025-002",
    clientId: "c2",
    vehicleId: "v2",
    services: [{ id: "s3", description: "Alinhamento completo", laborPrice: 95 }],
    status: "Em andamento",
    total: 95,
    openedAt: "2025-03-27",
    mileage: 91210,
    paymentMethod: "Cartão de crédito",
    notes: "Liberar até o final da tarde.",
  },
  {
    id: "os3",
    number: "OS-2025-003",
    clientId: "c4",
    vehicleId: "v3",
    services: [{ id: "s4", description: "Reparo de furo", laborPrice: 45 }],
    status: "Concluída",
    total: 45,
    openedAt: "2025-03-26",
    mileage: 43190,
    paymentMethod: "Dinheiro",
    notes: "Entrega realizada.",
  },
  {
    id: "os4",
    number: "OS-2025-004",
    clientId: "c3",
    vehicleId: "v4",
    services: [
      { id: "s5", description: "Troca de válvula", laborPrice: 80 },
      { id: "s6", description: "Rodízio de pneus", laborPrice: 90 },
    ],
    status: "Aguardando peça",
    total: 170,
    openedAt: "2025-03-25",
    mileage: 122550,
    paymentMethod: "Boleto",
    notes: "Aguardando peça do fornecedor.",
  },
  {
    id: "os5",
    number: "OS-2025-005",
    clientId: "c6",
    vehicleId: "v5",
    services: [{ id: "s7", description: "Troca de bico", laborPrice: 70 }],
    status: "Cancelada",
    total: 70,
    openedAt: "2025-03-24",
    mileage: 58740,
    paymentMethod: "Pix",
    notes: "Cliente desistiu do serviço.",
  },
  {
    id: "os6",
    number: "OS-2025-006",
    clientId: "c8",
    vehicleId: "v6",
    services: [
      { id: "s8", description: "Revisão de pneus", laborPrice: 110 },
      { id: "s9", description: "Calibragem premium", laborPrice: 30 },
    ],
    status: "Concluída",
    total: 140,
    openedAt: "2025-03-28",
    mileage: 100220,
    paymentMethod: "Pix",
    notes: "Veículo liberado para estrada.",
  },
];

export const receivables: Receivable[] = [
  { id: "r1", description: "OS-2025-001", clientId: "c1", value: 180, dueDate: "2025-03-28", status: "Pendente" },
  { id: "r2", description: "OS-2025-002", clientId: "c2", value: 95, dueDate: "2025-03-29", status: "Pendente" },
  { id: "r3", description: "OS-2025-003", clientId: "c4", value: 45, dueDate: "2025-03-26", status: "Pago" },
  { id: "r4", description: "OS-2025-004", clientId: "c3", value: 170, dueDate: "2025-03-27", status: "Vencido" },
  { id: "r5", description: "OS-2025-006", clientId: "c8", value: 140, dueDate: "2025-03-28", status: "Pago" },
  { id: "r6", description: "Serviço avulso balanceamento", clientId: "c5", value: 65, dueDate: "2025-03-30", status: "Pendente" },
  { id: "r7", description: "Parcelamento frota", clientId: "c3", value: 420, dueDate: "2025-03-31", status: "Pendente" },
  { id: "r8", description: "Ajuste de roda", clientId: "c7", value: 88, dueDate: "2025-03-25", status: "Vencido" },
];

export const payables: Payable[] = [
  { id: "p1", description: "Aluguel da unidade", category: "Aluguel", value: 3200, dueDate: "2025-03-30", status: "Pendente" },
  { id: "p2", description: "Compra fornecedor pneus", category: "Fornecedores", value: 4800, dueDate: "2025-03-27", status: "Vencido" },
  { id: "p3", description: "Conta de energia", category: "Água/Luz", value: 690, dueDate: "2025-03-28", status: "Pendente" },
  { id: "p4", description: "Folha funcionário oficina", category: "Funcionários", value: 2400, dueDate: "2025-03-25", status: "Pago" },
  { id: "p5", description: "Internet e sistema fiscal", category: "Outros", value: 310, dueDate: "2025-03-29", status: "Pendente" },
  { id: "p6", description: "Compra EPIs", category: "Outros", value: 220, dueDate: "2025-03-26", status: "Pago" },
];

export const cashFlow: CashFlowDay[] = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const date = `2025-03-${String(day).padStart(2, "0")}`;

  return {
    date,
    entries: 380 + ((index * 73) % 520),
    exits: 170 + ((index * 51) % 390),
  };
});

export const dashboardRevenue = [
  { day: "Sáb", revenue: 420 },
  { day: "Dom", revenue: 180 },
  { day: "Seg", revenue: 610 },
  { day: "Ter", revenue: 540 },
  { day: "Qua", revenue: 720 },
  { day: "Qui", revenue: 680 },
  { day: "Sex", revenue: 790 },
];

export const appUsers = [
  { id: "u1", name: "Maria Aparecida", role: "Proprietária", status: "Ativo" },
  { id: "u2", name: "José Roberto", role: "Borracheiro", status: "Ativo" },
];

export const companyProfile = {
  name: "Borracharia Nossa Senhora Aparecida",
  address: "Av. dos Pneus, 1450, Jardim Centro, Campo Grande - MS",
  phone: "(67) 3345-2200",
};

function getPersonDisplayName(person?: BasePerson) {
  if (!person) {
    return "-";
  }

  return person.tipo === "pf" ? person.nomeCompleto ?? "-" : person.nomeFantasia ?? "-";
}

function getPersonDocument(person?: BasePerson) {
  if (!person) {
    return "-";
  }

  return person.tipo === "pf" ? person.cpf || "-" : person.cnpj || "-";
}

export function getClientById(id: string) {
  return clients.find((client) => client.id === id);
}

export function getSupplierById(id: string) {
  return suppliers.find((supplier) => supplier.id === id);
}

export function getVehicleById(id: string) {
  return vehicles.find((vehicle) => vehicle.id === id);
}

export function getClientDisplayName(client?: Client) {
  return getPersonDisplayName(client);
}

export function getSupplierDisplayName(supplier?: Supplier) {
  return getPersonDisplayName(supplier);
}

export function getClientDocument(client?: Client) {
  return getPersonDocument(client);
}

export function getSupplierDocument(supplier?: Supplier) {
  return getPersonDocument(supplier);
}

export function getClientEmail(client?: Client) {
  return client?.email || "-";
}

export function getSupplierEmail(supplier?: Supplier) {
  return supplier?.email || "-";
}

export function getVehiclesByClientId(clientId: string) {
  return vehicles.filter((vehicle) => vehicle.clientId === clientId);
}

export function getServiceOrdersByClientId(clientId: string) {
  return serviceOrders.filter((order) => order.clientId === clientId);
}

export function getServiceOrdersByVehicleId(vehicleId: string) {
  return serviceOrders.filter((order) => order.vehicleId === vehicleId);
}

export function normalizeWhatsApp(value: string) {
  return value.replace(/\D/g, "");
}

export function getWhatsAppUrl(value: string) {
  return `https://wa.me/55${normalizeWhatsApp(value)}`;
}

export function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}
