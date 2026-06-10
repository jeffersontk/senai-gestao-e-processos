"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  Send,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import CollaboratorCalendarHome from "@/components/collaborator-calendar-home";
import MmpAdminModule from "@/components/mmp-admin-module";
import {
  MONTHS,
  OTHER_ACTIVITY_CATEGORIES,
  MonthlyEntry,
  MonthlyEntryStatus,
  OtherActivityCategory,
  OtherActivityEntry,
  Project,
  ProjectStatus,
  ProjectType,
  Role,
  StoreData,
  User,
} from "@/lib/types";

type View = "dashboard" | "clock" | "monthly" | "projects" | "users" | "reports" | "mmp" | "password";
type Notice = { type: "success" | "error"; message: string } | null;
type AdminFilters = {
  referenceMonth: number;
  referenceYear: number;
  colaboradorId: string;
  typeId: string;
  projectId: string;
};
type ReportFiltersState = AdminFilters & { period: "mensal" | "anual" };
type MutationOptions = {
  method?: "POST" | "PUT";
  successMessage?: string;
  silent?: boolean;
};

const emptyStore: StoreData = {
  users: [],
  projectTypes: [],
  projects: [],
  monthlyEntries: [],
  otherActivityEntries: [],
  timeRecords: [],
  dailyWorkLogs: [],
  mmpRecords: [],
};

const inputClass =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const textareaClass =
  "min-h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-zinc-500";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getCurrentReference() {
  const date = new Date();
  return {
    referenceMonth: date.getMonth() + 1,
    referenceYear: date.getFullYear(),
  };
}

function formatHours(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}h`;
}

function sumHours<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + pick(item), 0);
}

function collaboratorUsers(store: StoreData) {
  return store.users.filter((user) => user.role === "COLABORADOR");
}

function findUser(store: StoreData, id: string) {
  return store.users.find((user) => user.id === id);
}

function findProject(store: StoreData, id: string) {
  return store.projects.find((project) => project.id === id);
}

function findProjectType(store: StoreData, id: string) {
  return store.projectTypes.find((type) => type.id === id);
}

function scopedProjects(store: StoreData, filters: Pick<AdminFilters, "projectId" | "typeId">) {
  return store.projects.filter((project) => {
    if (filters.projectId !== "all" && project.id !== filters.projectId) return false;
    if (filters.typeId !== "all" && project.typeId !== filters.typeId) return false;
    return true;
  });
}

function scopedProjectEntries(store: StoreData, filters: AdminFilters | ReportFiltersState) {
  const projectIds = new Set(scopedProjects(store, filters).map((project) => project.id));

  return store.monthlyEntries.filter((entry) => {
    if (entry.referenceMonth !== filters.referenceMonth) return false;
    if (entry.referenceYear !== filters.referenceYear) return false;
    if (filters.colaboradorId !== "all" && entry.colaboradorId !== filters.colaboradorId) {
      return false;
    }
    return projectIds.has(entry.projectId);
  });
}

function scopedOtherEntries(store: StoreData, filters: AdminFilters | ReportFiltersState) {
  return store.otherActivityEntries.filter((entry) => {
    if (entry.referenceMonth !== filters.referenceMonth) return false;
    if (entry.referenceYear !== filters.referenceYear) return false;
    if (filters.colaboradorId !== "all" && entry.colaboradorId !== filters.colaboradorId) {
      return false;
    }
    return true;
  });
}

export default function WorkHoursApp() {
  const initialReference = useMemo(() => getCurrentReference(), []);
  const [store, setStore] = useState<StoreData>(emptyStore);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [session, setSession] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [adminFilters, setAdminFilters] = useState<AdminFilters>({
    ...initialReference,
    colaboradorId: "all",
    typeId: "all",
    projectId: "all",
  });
  const [reportFilters, setReportFilters] = useState<ReportFiltersState>({
    ...initialReference,
    colaboradorId: "all",
    typeId: "all",
    projectId: "all",
    period: "mensal",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/bootstrap");
        const data = (await response.json()) as StoreData;
        if (mounted) setStore({ ...emptyStore, ...data });
      } catch {
        if (mounted) {
          setNotice({ type: "error", message: "Não foi possível carregar os dados." });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function login(email: string, password: string) {
    setBusy(true);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { user?: User; message?: string };
      if (!response.ok || !payload.user) {
        throw new Error(payload.message ?? "Credenciais inválidas.");
      }

      setSession(payload.user);
      setActiveView(payload.user.role === "ADMIN" ? "dashboard" : "clock");
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Erro ao entrar.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function mutateStore(path: string, body: unknown, options: MutationOptions = {}) {
    setBusy(true);
    if (!options.silent) setNotice(null);

    try {
      const response = await fetch(path, {
        method: options.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { store?: StoreData; message?: string };

      if (!response.ok || !payload.store) {
        throw new Error(payload.message ?? "Não foi possível salvar.");
      }

      setStore({ ...emptyStore, ...payload.store });
      if (!options.silent) {
        setNotice({ type: "success", message: options.successMessage ?? "Salvo." });
      }
      return payload.store;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível salvar.";
      if (!options.silent) setNotice({ type: "error", message });
      throw error;
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-600">
        Carregando sistema...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen busy={busy} notice={notice} store={store} onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-zinc-950">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar activeView={activeView} role={session.role} onNavigate={setActiveView} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            activeView={activeView}
            busy={busy}
            notice={notice}
            session={session}
            onLogout={() => {
              setSession(null);
              setNotice(null);
            }}
          />
          <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
            {activeView === "dashboard" && session.role === "ADMIN" && (
              <AdminDashboard
                filters={adminFilters}
                store={store}
                onFiltersChange={setAdminFilters}
                onMutate={mutateStore}
              />
            )}
            {activeView === "clock" && (
              <CollaboratorCalendarHome
                session={session}
                store={store}
                onMutate={mutateStore}
              />
            )}
            {activeView === "monthly" && (
              <MonthlyLaunchView session={session} store={store} onMutate={mutateStore} />
            )}
            {activeView === "projects" && session.role === "ADMIN" && (
              <ProjectsView store={store} onMutate={mutateStore} />
            )}
            {activeView === "users" && session.role === "ADMIN" && (
              <UsersView store={store} onMutate={mutateStore} />
            )}
            {activeView === "reports" && session.role === "ADMIN" && (
              <ReportsView
                filters={reportFilters}
                store={store}
                onFiltersChange={setReportFilters}
              />
            )}
            {activeView === "mmp" && session.role === "ADMIN" && (
              <MmpAdminModule
                store={store}
                onMutate={mutateStore}
                onStoreChange={(nextStore) => setStore({ ...emptyStore, ...nextStore })}
              />
            )}
            {activeView === "password" && (
              <PasswordView session={session} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({
  busy,
  notice,
  store,
  onLogin,
}: {
  busy: boolean;
  notice: Notice;
  store: StoreData;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8 text-zinc-950">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
            Gestão interna de horas
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-zinc-950 sm:text-5xl">
            Controle mensal de projetos, atividades e ponto diário
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">
            MVP em Next.js com API interna, calendário do colaborador e dados
            persistidos no backend.
          </p>
        </div>

        <form
          autoComplete="off"
          className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin(email, password);
          }}
        >
          <h2 className="text-xl font-semibold text-zinc-950">Entrar</h2>
          <p className="mt-1 text-sm text-zinc-500">Use um usuario ativo cadastrado no Supabase.</p>
          <div className="mt-5 space-y-4">
            <TextField autoComplete="off" label="Email" type="email" value={email} onChange={setEmail} />
            <TextField
              autoComplete="new-password"
              label="Senha"
              type="password"
              value={password}
              onChange={setPassword}
            />
          </div>
          <div className="mt-5 grid gap-2">
            {store.users
              .filter((user) => user.status === "ativo")
              .slice(0, 4)
              .map((user) => (
                <button
                  className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50"
                  key={user.id}
                  type="button"
                  onClick={() => setEmail(user.email)}
                >
                  <span>
                    <span className="block font-medium text-zinc-900">{user.nome}</span>
                    <span className="text-zinc-500">{user.email}</span>
                  </span>
                  <StatusBadge value={user.role} />
                </button>
              ))}
          </div>
          {notice && <NoticeBox notice={notice} />}
          <button
            className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            disabled={busy}
            type="submit"
          >
            <Play size={16} />
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}

function Sidebar({
  activeView,
  role,
  onNavigate,
}: {
  activeView: View;
  role: Role;
  onNavigate: (view: View) => void;
}) {
  const items: Array<{ view: View; label: string; icon: LucideIcon; roles: Role[] }> = [
    { view: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
    { view: "clock", label: "Calendário", icon: Clock, roles: ["ADMIN", "COLABORADOR"] },
    {
      view: "monthly",
      label: "Lançamentos",
      icon: CalendarClock,
      roles: ["ADMIN", "COLABORADOR"],
    },
    { view: "projects", label: "Projetos", icon: FolderKanban, roles: ["ADMIN"] },
    { view: "users", label: "Colaboradores", icon: Users, roles: ["ADMIN"] },
    { view: "mmp", label: "MMP", icon: FileText, roles: ["ADMIN"] },
    { view: "reports", label: "Relatórios", icon: FileText, roles: ["ADMIN"] },
    { view: "password", label: "Minha senha", icon: KeyRound, roles: ["ADMIN", "COLABORADOR"] },
  ];

  return (
    <aside className="border-b border-zinc-200 bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="border-b border-zinc-200 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white">
            <BriefcaseBusiness size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-950">Horas SENAI</p>
            <p className="text-xs text-zinc-500">Projetos e ponto</p>
          </div>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-3 py-3 md:flex-col md:overflow-visible">
        {items
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const Icon = item.icon;
            const active = activeView === item.view;
            return (
              <button
                className={classNames(
                  "flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                  active
                    ? "bg-blue-50 text-blue-800"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                )}
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
      </nav>
    </aside>
  );
}

function Header({
  activeView,
  busy,
  notice,
  session,
  onLogout,
}: {
  activeView: View;
  busy: boolean;
  notice: Notice;
  session: User;
  onLogout: () => void;
}) {
  const titles: Record<View, string> = {
    dashboard: "Dashboard administrativo",
    clock: "Calendário do colaborador",
    monthly: "Lançamentos mensais",
    projects: "Cadastro de projetos",
    users: "Cadastro de colaboradores",
    mmp: "Movimentação de Material Permanente",
    reports: "Relatórios",
    password: "Minha senha",
  };

  return (
    <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950">{titles[activeView]}</h1>
          <p className="text-sm text-zinc-500">
            {session.nome} · {session.role === "ADMIN" ? "Administrador" : "Colaborador"}
            {busy ? " · Salvando..." : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {notice && <NoticePill notice={notice} />}
          <button
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            type="button"
            onClick={onLogout}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

function AdminDashboard({
  filters,
  store,
  onFiltersChange,
  onMutate,
}: {
  filters: AdminFilters;
  store: StoreData;
  onFiltersChange: (filters: AdminFilters) => void;
  onMutate: (path: string, body: unknown, options?: MutationOptions) => Promise<StoreData>;
}) {
  const collaborators = collaboratorUsers(store).filter((user) =>
    filters.colaboradorId === "all" ? true : user.id === filters.colaboradorId,
  );
  const projects = scopedProjects(store, filters);
  const projectEntries = scopedProjectEntries(store, filters);
  const otherEntries = scopedOtherEntries(store, filters);
  const pendingIds = projectEntries
    .filter((entry) => entry.status === "enviado")
    .map((entry) => entry.id);
  const approvedIds = projectEntries
    .filter((entry) => entry.status === "aprovado")
    .map((entry) => entry.id);
  const totalProjectHours = sumHours(projectEntries, (entry) => entry.hours);
  const totalOtherHours = sumHours(otherEntries, (entry) => entry.hours);

  return (
    <div className="space-y-5">
      <FilterPanel filters={filters} store={store} onFiltersChange={onFiltersChange} />
      <div className="flex flex-wrap gap-2">
        <button
          className="flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          disabled={!pendingIds.length}
          type="button"
          onClick={() =>
            onMutate(
              "/api/monthly-entries",
              { ids: pendingIds, status: "aprovado" satisfies MonthlyEntryStatus },
              { method: "PUT", successMessage: "Lançamentos aprovados." },
            )
          }
        >
          <CheckCircle2 size={16} />
          Aprovar enviados
        </button>
        <button
          className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
          disabled={!approvedIds.length}
          type="button"
          onClick={() =>
            onMutate(
              "/api/monthly-entries",
              { ids: approvedIds, status: "reaberto" satisfies MonthlyEntryStatus },
              { method: "PUT", successMessage: "Lançamentos reabertos." },
            )
          }
        >
          <RotateCcw size={16} />
          Reabrir aprovados
        </button>
      </div>
      <DashboardCards
        activeProjects={store.projects.filter((project) => project.status === "ativo").length}
        activeUsers={store.users.filter((user) => user.status === "ativo").length}
        totalOtherHours={totalOtherHours}
        totalProjectHours={totalProjectHours}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <BarList
          title="Horas por projeto"
          items={projects.map((project) => ({
            label: project.nome,
            value: sumHours(
              projectEntries.filter((entry) => entry.projectId === project.id),
              (entry) => entry.hours,
            ),
          }))}
        />
        <BarList
          title="Horas por colaborador"
          items={collaborators.map((user) => ({
            label: user.nome,
            value:
              sumHours(
                projectEntries.filter((entry) => entry.colaboradorId === user.id),
                (entry) => entry.hours,
              ) +
              sumHours(
                otherEntries.filter((entry) => entry.colaboradorId === user.id),
                (entry) => entry.hours,
              ),
          }))}
        />
      </div>
      <MonthlyActivityMatrix
        collaborators={collaborators}
        entries={projectEntries}
        projects={projects}
        store={store}
      />
      <OtherActivitiesMatrix collaborators={collaborators} entries={otherEntries} />
      <DailyLogsTable store={store} />
    </div>
  );
}

function FilterPanel({
  filters,
  store,
  onFiltersChange,
}: {
  filters: AdminFilters;
  store: StoreData;
  onFiltersChange: (filters: AdminFilters) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <Filter size={16} />
        Filtros
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <MonthYearFilter
          month={filters.referenceMonth}
          year={filters.referenceYear}
          onChange={(next) => onFiltersChange({ ...filters, ...next })}
        />
        <SelectField
          label="Colaborador"
          value={filters.colaboradorId}
          onChange={(value) => onFiltersChange({ ...filters, colaboradorId: value })}
        >
          <option value="all">Todos</option>
          {collaboratorUsers(store).map((user) => (
            <option key={user.id} value={user.id}>
              {user.nome}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Tipo"
          value={filters.typeId}
          onChange={(value) => onFiltersChange({ ...filters, typeId: value })}
        >
          <option value="all">Todos</option>
          {store.projectTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.nome}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Projeto"
          value={filters.projectId}
          onChange={(value) => onFiltersChange({ ...filters, projectId: value })}
        >
          <option value="all">Todos</option>
          {store.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.nome}
            </option>
          ))}
        </SelectField>
      </div>
    </section>
  );
}

function DashboardCards({
  activeProjects,
  activeUsers,
  totalOtherHours,
  totalProjectHours,
}: {
  activeProjects: number;
  activeUsers: number;
  totalOtherHours: number;
  totalProjectHours: number;
}) {
  const cards = [
    ["Total do mês", formatHours(totalProjectHours + totalOtherHours), BarChart3],
    ["Horas em projetos", formatHours(totalProjectHours), FolderKanban],
    ["Demais atividades", formatHours(totalOtherHours), CalendarClock],
    ["Colaboradores ativos", String(activeUsers), Users],
    ["Projetos ativos", String(activeProjects), BriefcaseBusiness],
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(([title, value, Icon]) => (
        <div className="rounded-lg border border-zinc-200 bg-white p-4" key={title}>
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <Icon size={18} />
          </div>
          <p className="text-sm text-zinc-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
      ))}
    </section>
  );
}

function BarList({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div className="grid grid-cols-[minmax(120px,1fr)_2fr_64px] items-center gap-3 text-sm" key={item.label}>
            <span className="truncate text-zinc-600">{item.label}</span>
            <div className="h-2 overflow-hidden rounded-sm bg-zinc-100">
              <div className="h-full rounded-sm bg-blue-600" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
            <span className="text-right font-medium text-zinc-900">{formatHours(item.value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MonthlyActivityMatrix({
  collaborators,
  entries,
  projects,
  store,
}: {
  collaborators: User[];
  entries: MonthlyEntry[];
  projects: Project[];
  store: StoreData;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-zinc-950">Matriz mensal por projeto</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="sticky left-0 bg-white py-3 pr-4 font-semibold">Colaborador</th>
              {projects.map((project) => (
                <th className="px-3 py-3 text-right font-semibold" key={project.id}>
                  <span className="block text-zinc-800">{project.nome}</span>
                  <span className="text-[11px] normal-case text-zinc-400">
                    {findProjectType(store, project.typeId)?.nome ?? "Sem tipo"}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {collaborators.map((user) => {
              const rowEntries = entries.filter((entry) => entry.colaboradorId === user.id);
              const total = sumHours(rowEntries, (entry) => entry.hours);

              return (
                <tr className="border-b border-zinc-100 last:border-0" key={user.id}>
                  <td className="sticky left-0 bg-white py-3 pr-4 font-medium text-zinc-950">{user.nome}</td>
                  {projects.map((project) => {
                    const value = sumHours(
                      rowEntries.filter((entry) => entry.projectId === project.id),
                      (entry) => entry.hours,
                    );
                    return (
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-700" key={project.id}>
                        {value ? formatHours(value) : "0h"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-zinc-950">{formatHours(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OtherActivitiesMatrix({ collaborators, entries }: { collaborators: User[]; entries: OtherActivityEntry[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-zinc-950">Demais atividades</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="sticky left-0 bg-white py-3 pr-4 font-semibold">Colaborador</th>
              {OTHER_ACTIVITY_CATEGORIES.map((category) => (
                <th className="px-3 py-3 text-right font-semibold" key={category}>{category}</th>
              ))}
              <th className="px-3 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {collaborators.map((user) => {
              const rowEntries = entries.filter((entry) => entry.colaboradorId === user.id);
              const total = sumHours(rowEntries, (entry) => entry.hours);

              return (
                <tr className="border-b border-zinc-100 last:border-0" key={user.id}>
                  <td className="sticky left-0 bg-white py-3 pr-4 font-medium text-zinc-950">{user.nome}</td>
                  {OTHER_ACTIVITY_CATEGORIES.map((category) => {
                    const value = sumHours(
                      rowEntries.filter((entry) => entry.category === category),
                      (entry) => entry.hours,
                    );
                    return (
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-700" key={category}>
                        {value ? formatHours(value) : "0h"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-zinc-950">{formatHours(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DailyLogsTable({ store }: { store: StoreData }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-zinc-950">Lançamentos diários recentes</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4">Data</th>
              <th className="px-3 py-3">Colaborador</th>
              <th className="px-3 py-3">Projetos</th>
              <th className="px-3 py-3 text-right">Projetos</th>
              <th className="px-3 py-3 text-right">Atividades</th>
              <th className="px-3 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...store.dailyWorkLogs]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 8)
              .map((log) => (
                <tr className="border-b border-zinc-100 last:border-0" key={log.id}>
                  <td className="py-3 pr-4 font-medium text-zinc-950">{log.date}</td>
                  <td className="px-3 py-3 text-zinc-700">{findUser(store, log.colaboradorId)?.nome ?? "—"}</td>
                  <td className="px-3 py-3 text-zinc-700">
                    {log.projectAllocations
                      .map((entry) => findProject(store, entry.projectId)?.nome)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-3 py-3 text-right">{formatHours(log.totalProjectHours)}</td>
                  <td className="px-3 py-3 text-right">{formatHours(log.totalOtherActivityHours)}</td>
                  <td className="px-3 py-3 text-right font-semibold">{formatHours(log.totalHours)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MonthlyLaunchView({
  session,
  store,
  onMutate,
}: {
  session: User;
  store: StoreData;
  onMutate: (path: string, body: unknown, options?: MutationOptions) => Promise<StoreData>;
}) {
  const initialReference = useMemo(() => getCurrentReference(), []);
  const [reference, setReference] = useState(initialReference);
  const [collaboratorId, setCollaboratorId] = useState(
    session.role === "ADMIN" ? collaboratorUsers(store)[0]?.id ?? session.id : session.id,
  );
  const projects = store.projects.filter((project) => project.status === "ativo");
  const existingMonthly = store.monthlyEntries.filter(
    (entry) =>
      entry.colaboradorId === collaboratorId &&
      entry.referenceMonth === reference.referenceMonth &&
      entry.referenceYear === reference.referenceYear,
  );
  const existingOther = store.otherActivityEntries.filter(
    (entry) =>
      entry.colaboradorId === collaboratorId &&
      entry.referenceMonth === reference.referenceMonth &&
      entry.referenceYear === reference.referenceYear,
  );
  const formKey = `${collaboratorId}-${reference.referenceMonth}-${reference.referenceYear}-${existingMonthly.map((entry) => entry.updatedAt).join(",")}-${existingOther.map((entry) => entry.updatedAt).join(",")}`;

  return (
    <MonthlyLaunchForm
      key={formKey}
      collaboratorId={collaboratorId}
      existingMonthly={existingMonthly}
      existingOther={existingOther}
      isAdmin={session.role === "ADMIN"}
      projects={projects}
      reference={reference}
      store={store}
      onCollaboratorChange={setCollaboratorId}
      onMutate={onMutate}
      onReferenceChange={setReference}
    />
  );
}

function MonthlyLaunchForm({
  collaboratorId,
  existingMonthly,
  existingOther,
  isAdmin,
  projects,
  reference,
  store,
  onCollaboratorChange,
  onMutate,
  onReferenceChange,
}: {
  collaboratorId: string;
  existingMonthly: MonthlyEntry[];
  existingOther: OtherActivityEntry[];
  isAdmin: boolean;
  projects: Project[];
  reference: { referenceMonth: number; referenceYear: number };
  store: StoreData;
  onCollaboratorChange: (id: string) => void;
  onMutate: (path: string, body: unknown, options?: MutationOptions) => Promise<StoreData>;
  onReferenceChange: (reference: { referenceMonth: number; referenceYear: number }) => void;
}) {
  const isLocked = existingMonthly.some((entry) => ["enviado", "aprovado"].includes(entry.status));
  const [projectRows, setProjectRows] = useState(() =>
    projects.map((project) => {
      const entry = existingMonthly.find((item) => item.projectId === project.id);
      return { projectId: project.id, hours: entry ? String(entry.hours) : "", observation: entry?.observation ?? "" };
    }),
  );
  const [activityRows, setActivityRows] = useState(() =>
    OTHER_ACTIVITY_CATEGORIES.map((category) => {
      const entry = existingOther.find((item) => item.category === category);
      return { category, hours: entry ? String(entry.hours) : "", observation: entry?.observation ?? "" };
    }),
  );
  const projectTotal = sumHours(projectRows, (row) => Number(row.hours) || 0);
  const activityTotal = sumHours(activityRows, (row) => Number(row.hours) || 0);

  async function save(status: MonthlyEntryStatus) {
    await onMutate(
      "/api/monthly-entries",
      {
        colaboradorId: collaboratorId,
        referenceMonth: reference.referenceMonth,
        referenceYear: reference.referenceYear,
        status,
        entries: projectRows.map((row) => ({
          projectId: row.projectId,
          hours: Number(row.hours) || 0,
          observation: row.observation,
        })),
      },
      { silent: true },
    );
    await onMutate(
      "/api/other-activities",
      {
        colaboradorId: collaboratorId,
        referenceMonth: reference.referenceMonth,
        referenceYear: reference.referenceYear,
        entries: activityRows.map((row) => ({
          category: row.category,
          hours: Number(row.hours) || 0,
          observation: row.observation,
        })),
      },
      { successMessage: status === "enviado" ? "Lançamento mensal enviado." : "Rascunho salvo." },
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <MonthYearFilter
            month={reference.referenceMonth}
            year={reference.referenceYear}
            onChange={onReferenceChange}
          />
          {isAdmin && (
            <SelectField label="Colaborador" value={collaboratorId} onChange={onCollaboratorChange}>
              {collaboratorUsers(store).map((user) => (
                <option key={user.id} value={user.id}>{user.nome}</option>
              ))}
            </SelectField>
          )}
          <StatusBadge value={existingMonthly[0]?.status ?? "rascunho"} />
        </div>
      </section>

      <EditableProjectTable
        disabled={isLocked}
        projects={projects}
        rows={projectRows}
        store={store}
        onRowsChange={setProjectRows}
      />
      <EditableOtherActivitiesTable
        disabled={isLocked}
        rows={activityRows}
        onRowsChange={setActivityRows}
      />

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoPair label="Total projetos" value={formatHours(projectTotal)} />
          <InfoPair label="Total demais atividades" value={formatHours(activityTotal)} />
          <InfoPair label="Total geral" value={formatHours(projectTotal + activityTotal)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
            disabled={isLocked}
            type="button"
            onClick={() => save("rascunho")}
          >
            <Save size={16} />
            Salvar rascunho
          </button>
          <button
            className="flex h-10 items-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            disabled={isLocked}
            type="button"
            onClick={() => save("enviado")}
          >
            <Send size={16} />
            Enviar lançamento mensal
          </button>
        </div>
      </section>
    </div>
  );
}

function EditableProjectTable({
  disabled,
  projects,
  rows,
  store,
  onRowsChange,
}: {
  disabled: boolean;
  projects: Project[];
  rows: Array<{ projectId: string; hours: string; observation: string }>;
  store: StoreData;
  onRowsChange: (rows: Array<{ projectId: string; hours: string; observation: string }>) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-zinc-950">Projetos</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4">Projeto</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3 text-right">Horas</th>
              <th className="px-3 py-3">Observação</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const index = rows.findIndex((row) => row.projectId === project.id);
              const row = rows[index] ?? { projectId: project.id, hours: "", observation: "" };
              return (
                <tr className="border-b border-zinc-100 last:border-0" key={project.id}>
                  <td className="py-3 pr-4 font-medium text-zinc-950">{project.nome}</td>
                  <td className="px-3 py-3 text-zinc-600">{findProjectType(store, project.typeId)?.nome ?? "—"}</td>
                  <td className="px-3 py-3">
                    <input
                      className={classNames(inputClass, "ml-auto max-w-28 text-right")}
                      disabled={disabled}
                      min={0}
                      step="0.5"
                      type="number"
                      value={row.hours}
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = { ...row, hours: event.target.value };
                        onRowsChange(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={inputClass}
                      disabled={disabled}
                      value={row.observation}
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = { ...row, observation: event.target.value };
                        onRowsChange(next);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditableOtherActivitiesTable({
  disabled,
  rows,
  onRowsChange,
}: {
  disabled: boolean;
  rows: Array<{ category: OtherActivityCategory; hours: string; observation: string }>;
  onRowsChange: (rows: Array<{ category: OtherActivityCategory; hours: string; observation: string }>) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-zinc-950">Demais atividades</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4">Categoria</th>
              <th className="px-3 py-3 text-right">Horas</th>
              <th className="px-3 py-3">Observação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr className="border-b border-zinc-100 last:border-0" key={row.category}>
                <td className="py-3 pr-4 font-medium text-zinc-950">{row.category}</td>
                <td className="px-3 py-3">
                  <input
                    className={classNames(inputClass, "ml-auto max-w-28 text-right")}
                    disabled={disabled}
                    min={0}
                    step="0.5"
                    type="number"
                    value={row.hours}
                    onChange={(event) => {
                      const next = [...rows];
                      next[index] = { ...row, hours: event.target.value };
                      onRowsChange(next);
                    }}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    className={inputClass}
                    disabled={disabled}
                    value={row.observation}
                    onChange={(event) => {
                      const next = [...rows];
                      next[index] = { ...row, observation: event.target.value };
                      onRowsChange(next);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProjectsView({
  store,
  onMutate,
}: {
  store: StoreData;
  onMutate: (path: string, body: unknown, options?: MutationOptions) => Promise<StoreData>;
}) {
  const [form, setForm] = useState<Partial<Project>>({
    nome: "",
    identificador: "",
    typeId: store.projectTypes[0]?.id ?? "",
    status: "ativo",
    descricao: "",
  });
  const [modalOpen, setModalOpen] = useState(false);

  function reset() {
    setForm({
      nome: "",
      identificador: "",
      typeId: store.projectTypes[0]?.id ?? "",
      status: "ativo",
      descricao: "",
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onMutate("/api/projects", form, {
      method: form.id ? "PUT" : "POST",
      successMessage: form.id ? "Projeto atualizado." : "Projeto cadastrado.",
    });
    reset();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-950">{form.id ? "Editar projeto" : "Novo projeto"}</h2>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <TextField label="Nome do projeto" value={form.nome ?? ""} onChange={(value) => setForm({ ...form, nome: value })} />
          <TextField label="Identificador" value={form.identificador ?? ""} onChange={(value) => setForm({ ...form, identificador: value })} />
          <ProjectTypeSelect
            projectTypes={store.projectTypes}
            value={form.typeId ?? ""}
            onChange={(value) => setForm({ ...form, typeId: value })}
            onCreate={() => setModalOpen(true)}
          />
          <SelectField label="Status" value={form.status ?? "ativo"} onChange={(value) => setForm({ ...form, status: value as ProjectStatus })}>
            <option value="ativo">Ativo</option>
            <option value="pausado">Pausado</option>
            <option value="encerrado">Encerrado</option>
          </SelectField>
          <label className="block">
            <span className={labelClass}>Descrição</span>
            <textarea className={classNames(textareaClass, "mt-1")} value={form.descricao ?? ""} onChange={(event) => setForm({ ...form, descricao: event.target.value })} />
          </label>
          <FormButtons editing={Boolean(form.id)} onCancel={reset} />
        </form>
      </section>
      <ProjectsTable store={store} onEdit={setForm} onMutate={onMutate} />
      <CreateProjectTypeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={async (payload) => {
          const nextStore = await onMutate("/api/project-types", payload, {
            successMessage: "Tipo de projeto cadastrado.",
          });
          setForm({ ...form, typeId: nextStore.projectTypes.at(-1)?.id });
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function ProjectsTable({
  store,
  onEdit,
  onMutate,
}: {
  store: StoreData;
  onEdit: (project: Project) => void;
  onMutate: (path: string, body: unknown, options?: MutationOptions) => Promise<StoreData>;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-zinc-950">Projetos cadastrados</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
              <th className="py-3 pr-4">Projeto</th>
              <th className="px-3 py-3">Identificador</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {store.projects.map((project) => (
              <tr className="border-b border-zinc-100 last:border-0" key={project.id}>
                <td className="py-3 pr-4 font-medium text-zinc-950">{project.nome}</td>
                <td className="px-3 py-3 text-zinc-600">{project.identificador}</td>
                <td className="px-3 py-3 text-zinc-600">{findProjectType(store, project.typeId)?.nome ?? "—"}</td>
                <td className="px-3 py-3"><StatusBadge value={project.status} /></td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    <IconButton label="Editar" icon={Pencil} onClick={() => onEdit(project)} />
                    <IconButton
                      label={project.status === "ativo" ? "Encerrar" : "Reativar"}
                      icon={RotateCcw}
                      onClick={() =>
                        onMutate(
                          "/api/projects",
                          { ...project, status: project.status === "ativo" ? "encerrado" : "ativo" },
                          { method: "PUT", successMessage: "Projeto atualizado." },
                        )
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UsersView({
  store,
  onMutate,
}: {
  store: StoreData;
  onMutate: (path: string, body: unknown, options?: MutationOptions) => Promise<StoreData>;
}) {
  const [form, setForm] = useState<Partial<User>>({
    nome: "",
    email: "",
    cargo: "",
    role: "COLABORADOR",
    status: "ativo",
  });

  function reset() {
    setForm({ nome: "", email: "", cargo: "", role: "COLABORADOR", status: "ativo" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onMutate("/api/users", form, {
      method: form.id ? "PUT" : "POST",
      successMessage: form.id ? "Colaborador atualizado." : "Colaborador cadastrado.",
    });
    reset();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-950">{form.id ? "Editar colaborador" : "Novo colaborador"}</h2>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <TextField label="Nome" value={form.nome ?? ""} onChange={(value) => setForm({ ...form, nome: value })} />
          <TextField label="Email" type="email" value={form.email ?? ""} onChange={(value) => setForm({ ...form, email: value })} />
          <TextField label="Cargo" value={form.cargo ?? ""} onChange={(value) => setForm({ ...form, cargo: value })} />
          <SelectField label="Perfil" value={form.role ?? "COLABORADOR"} onChange={(value) => setForm({ ...form, role: value as Role })}>
            <option value="COLABORADOR">Colaborador</option>
            <option value="ADMIN">Administrador</option>
          </SelectField>
          <SelectField label="Status" value={form.status ?? "ativo"} onChange={(value) => setForm({ ...form, status: value as User["status"] })}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </SelectField>
          <FormButtons editing={Boolean(form.id)} onCancel={reset} />
        </form>
      </section>
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-zinc-950">Colaboradores cadastrados</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
                <th className="py-3 pr-4">Nome</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Cargo</th>
                <th className="px-3 py-3">Perfil</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {store.users.map((user) => (
                <tr className="border-b border-zinc-100 last:border-0" key={user.id}>
                  <td className="py-3 pr-4 font-medium text-zinc-950">{user.nome}</td>
                  <td className="px-3 py-3 text-zinc-600">{user.email}</td>
                  <td className="px-3 py-3 text-zinc-600">{user.cargo}</td>
                  <td className="px-3 py-3"><StatusBadge value={user.role} /></td>
                  <td className="px-3 py-3"><StatusBadge value={user.status} /></td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <IconButton label="Editar" icon={Pencil} onClick={() => setForm(user)} />
                      <IconButton
                        label={user.status === "ativo" ? "Inativar" : "Reativar"}
                        icon={RotateCcw}
                        onClick={() =>
                          onMutate(
                            "/api/users",
                            { ...user, status: user.status === "ativo" ? "inativo" : "ativo" },
                            { method: "PUT", successMessage: "Colaborador atualizado." },
                          )
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PasswordView({ session }: { session: User }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);

    if (newPassword !== confirmPassword) {
      setNotice({ type: "error", message: "A confirmacao nao confere com a nova senha." });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.id,
          currentPassword,
          newPassword,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Nao foi possivel atualizar a senha.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ type: "success", message: "Senha atualizada." });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Nao foi possivel atualizar a senha.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-xl rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-950">Atualizar senha</h2>
      <p className="mt-1 text-sm text-zinc-500">
        A senha sera alterada apenas para {session.email}.
      </p>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <TextField
          autoComplete="current-password"
          label="Senha atual"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <TextField
          autoComplete="new-password"
          label="Nova senha"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <TextField
          autoComplete="new-password"
          label="Confirmar nova senha"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        {notice && <NoticeBox notice={notice} />}
        <button
          className="flex h-10 items-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          disabled={saving}
          type="submit"
        >
          <KeyRound size={16} />
          {saving ? "Atualizando..." : "Atualizar senha"}
        </button>
      </form>
    </section>
  );
}

function ReportsView({
  filters,
  store,
  onFiltersChange,
}: {
  filters: ReportFiltersState;
  store: StoreData;
  onFiltersChange: (filters: ReportFiltersState) => void;
}) {
  const projectEntries = scopedProjectEntries(store, filters);
  const otherEntries = scopedOtherEntries(store, filters);
  const projects = scopedProjects(store, filters);
  const collaborators = collaboratorUsers(store).filter((user) =>
    filters.colaboradorId === "all" ? true : user.id === filters.colaboradorId,
  );

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr]">
          <SelectField label="Período" value={filters.period} onChange={(value) => onFiltersChange({ ...filters, period: value as ReportFiltersState["period"] })}>
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
          </SelectField>
          <MonthYearFilter month={filters.referenceMonth} year={filters.referenceYear} onChange={(next) => onFiltersChange({ ...filters, ...next })} />
          <SelectField label="Colaborador" value={filters.colaboradorId} onChange={(value) => onFiltersChange({ ...filters, colaboradorId: value })}>
            <option value="all">Todos</option>
            {collaboratorUsers(store).map((user) => (
              <option key={user.id} value={user.id}>{user.nome}</option>
            ))}
          </SelectField>
          <SelectField label="Projeto" value={filters.projectId} onChange={(value) => onFiltersChange({ ...filters, projectId: value })}>
            <option value="all">Todos</option>
            {store.projects.map((project) => (
              <option key={project.id} value={project.id}>{project.nome}</option>
            ))}
          </SelectField>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <BarList
          title="Relatório mensal por projeto"
          items={projects.map((project) => ({
            label: project.nome,
            value: sumHours(projectEntries.filter((entry) => entry.projectId === project.id), (entry) => entry.hours),
          }))}
        />
        <BarList
          title="Demais atividades"
          items={OTHER_ACTIVITY_CATEGORIES.map((category) => ({
            label: category,
            value: sumHours(otherEntries.filter((entry) => entry.category === category), (entry) => entry.hours),
          }))}
        />
      </div>
      <MonthlyActivityMatrix collaborators={collaborators} entries={projectEntries} projects={projects} store={store} />
      <OtherActivitiesMatrix collaborators={collaborators} entries={otherEntries} />
      <DailyLogsTable store={store} />
    </div>
  );
}

function MonthYearFilter({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (next: { referenceMonth: number; referenceYear: number }) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField label="Mês" value={String(month)} onChange={(value) => onChange({ referenceMonth: Number(value), referenceYear: year })}>
        {MONTHS.map((label, index) => (
          <option key={label} value={index + 1}>{label}</option>
        ))}
      </SelectField>
      <SelectField label="Ano" value={String(year)} onChange={(value) => onChange({ referenceMonth: month, referenceYear: Number(value) })}>
        {years.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </SelectField>
    </div>
  );
}

function ProjectTypeSelect({
  projectTypes,
  value,
  onChange,
  onCreate,
}: {
  projectTypes: ProjectType[];
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <SelectField
      label="Tipo de projeto"
      value={value}
      onChange={(next) => {
        if (next === "__new__") {
          onCreate();
          return;
        }
        onChange(next);
      }}
    >
      <option value="">Selecione</option>
      {projectTypes
        .filter((type) => type.status === "ativo")
        .map((type) => (
          <option key={type.id} value={type.id}>{type.nome}</option>
        ))}
      <option value="__new__">+ Criar novo tipo de projeto</option>
    </SelectField>
  );
}

function CreateProjectTypeModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: Partial<ProjectType>) => Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4">
      <form
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-lg"
        onSubmit={async (event) => {
          event.preventDefault();
          await onCreate({ nome, descricao, status: "ativo" });
          setNome("");
          setDescricao("");
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-zinc-950">Criar tipo de projeto</h2>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <div className="space-y-4">
          <TextField label="Nome" value={nome} onChange={setNome} />
          <label className="block">
            <span className={labelClass}>Descrição</span>
            <textarea className={classNames(textareaClass, "mt-1")} value={descricao} onChange={(event) => setDescricao(event.target.value)} />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100" type="button" onClick={onClose}>
            <X size={16} />
            Cancelar
          </button>
          <button className="flex h-10 items-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800" type="submit">
            <Plus size={16} />
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({
  autoComplete,
  label,
  type = "text",
  value,
  onChange,
}: {
  autoComplete?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        autoComplete={autoComplete}
        className={classNames(inputClass, "mt-1")}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  children,
  label,
  value,
  onChange,
}: {
  children: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select className={classNames(inputClass, "mt-1")} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function FormButtons({ editing, onCancel }: { editing: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <button className="flex h-10 items-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800" type="submit">
        <Save size={16} />
        Salvar
      </button>
      {editing && (
        <button className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100" type="button" onClick={onCancel}>
          <X size={16} />
          Cancelar
        </button>
      )}
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100" type="button" onClick={onClick}>
      <Icon size={15} />
      {label}
    </button>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const colors =
    normalized === "ativo" ||
    normalized === "aprovado" ||
    normalized === "finalizado" ||
    normalized === "admin"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : normalized === "enviado" || normalized === "aberto"
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : normalized === "rascunho" || normalized === "pausado"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : normalized === "colaborador"
            ? "border-cyan-200 bg-cyan-50 text-cyan-800"
            : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <span className={classNames("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold uppercase", colors)}>
      {value}
    </span>
  );
}

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      className={classNames(
        "mt-4 rounded-md border px-3 py-2 text-sm",
        notice.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {notice.message}
    </div>
  );
}

function NoticePill({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <span
      className={classNames(
        "hidden rounded-md border px-3 py-2 text-xs font-medium sm:inline-flex",
        notice.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {notice.message}
    </span>
  );
}
