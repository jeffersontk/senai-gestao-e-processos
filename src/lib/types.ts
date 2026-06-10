export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const OTHER_ACTIVITY_CATEGORIES = [
  "Apoio à venda",
  "Apoio institucional",
  "Execução sem contrato",
  "Gestão / atividade básica",
  "Treinamento",
] as const;

export type Role = "ADMIN" | "COLABORADOR";
export type EntityStatus = "ativo" | "inativo";
export type ProjectStatus = "ativo" | "pausado" | "encerrado";
export type ProjectTypeStatus = "ativo" | "inativo";
export type MonthlyEntryStatus =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "rejeitado"
  | "reaberto";
export type TimeRecordStatus = "aberto" | "finalizado" | "ajustado";
export type OtherActivityCategory = (typeof OTHER_ACTIVITY_CATEGORIES)[number];

export type DailyProjectAllocation = {
  projectId: string;
  hours: string;
  observation: string;
};

export type DailyOtherActivityAllocation = {
  category: OtherActivityCategory;
  hours: string;
  observation: string;
};

export type User = {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  status: EntityStatus;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type ProjectType = {
  id: string;
  nome: string;
  descricao?: string;
  status: ProjectTypeStatus;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  nome: string;
  identificador: string;
  typeId: string;
  status: ProjectStatus;
  descricao?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAllocation = {
  id: string;
  projectId: string;
  colaboradorId: string;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyEntry = {
  id: string;
  colaboradorId: string;
  referenceMonth: number;
  referenceYear: number;
  projectId: string;
  hours: string;
  observation: string;
  status: MonthlyEntryStatus;
  createdAt: string;
  updatedAt: string;
};

export type OtherActivityEntry = {
  id: string;
  colaboradorId: string;
  referenceMonth: number;
  referenceYear: number;
  category: OtherActivityCategory;
  hours: string;
  observation: string;
  createdAt: string;
  updatedAt: string;
};

export type TimeRecord = {
  id: string;
  colaboradorId: string;
  date: string;
  projectId: string;
  entryAt: string;
  breakStartAt?: string;
  breakEndAt?: string;
  exitAt?: string;
  totalHours: string;
  observation: string;
  status: TimeRecordStatus;
  createdAt: string;
  updatedAt: string;
};

export type DailyWorkLog = {
  id: string;
  colaboradorId: string;
  date: string;
  projectAllocations: DailyProjectAllocation[];
  otherActivityAllocations: DailyOtherActivityAllocation[];
  totalProjectHours: string;
  totalOtherActivityHours: string;
  totalHours: string;
  observation: string;
  createdAt: string;
  updatedAt: string;
};

export type MmpMovementType =
  | "Transferência"
  | "Empréstimo"
  | "Cessão"
  | "Utilização fora das Dependências da Entidade"
  | "Disponibilidade";

export type MmpStatus = "rascunho" | "gerado" | "enviado_assinatura" | "assinado";

export type MmpItem = {
  id: string;
  item: number;
  numeroPatrimonial: string;
  descricao: string;
  valor: number;
};

export type MmpRecord = {
  id: string;
  numero: string;
  unidadeOrigem: string;
  unidadeDestino: string;
  dataEmissao: string;
  tipoMovimentacao: MmpMovementType;
  observacoes: string;
  dataRecebimento: string;
  responsavelRecebimento: string;
  responsavelGuarda: string;
  gestor: string;
  items: MmpItem[];
  status: MmpStatus;
  sentToSignatureAt?: string;
  signedFileName?: string;
  signedFileOriginalName?: string;
  signedFilePath?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreData = {
  users: User[];
  projectTypes: ProjectType[];
  projects: Project[];
  projectAllocations: ProjectAllocation[];
  monthlyEntries: MonthlyEntry[];
  otherActivityEntries: OtherActivityEntry[];
  timeRecords: TimeRecord[];
  dailyWorkLogs: DailyWorkLog[];
  mmpRecords: MmpRecord[];
};
