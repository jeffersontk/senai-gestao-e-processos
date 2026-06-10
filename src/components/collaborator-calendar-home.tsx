"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { formatTime, getBrazilDate } from "@/lib/date";
import {
  OTHER_ACTIVITY_CATEGORIES,
  OtherActivityCategory,
  Project,
  StoreData,
  TimeRecord,
  User,
} from "@/lib/types";

type MutationOptions = {
  method?: "POST" | "PUT";
  successMessage?: string;
  silent?: boolean;
};

type CollaboratorCalendarHomeProps = {
  session: User;
  store: StoreData;
  onMutate: (path: string, body: unknown, options?: MutationOptions) => Promise<StoreData>;
};

type WorkDayModalState = {
  mode: "close" | "manual";
  date: string;
} | null;

type ProjectRow = {
  projectId: string;
  hours: string;
  observation: string;
};

type ActivityRow = {
  category: OtherActivityCategory;
  hours: string;
  observation: string;
};

const inputClass =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const textareaClass =
  "min-h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-zinc-500";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatHours(value: number) {
  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}h`;
}

function toLocalDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, amount: number) {
  const date = toLocalDate(dateString);
  date.setDate(date.getDate() + amount);
  return toDateString(date);
}

function startOfWeek(dateString: string) {
  const date = toLocalDate(dateString);
  date.setDate(date.getDate() - date.getDay());
  return toDateString(date);
}

function weekDates(dateString: string) {
  const start = startOfWeek(dateString);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getMonthGrid(referenceDate: string) {
  const date = toLocalDate(referenceDate);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const start = toDateString(
    new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      firstDay.getDate() - firstDay.getDay(),
      12,
    ),
  );

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function formatDayLabel(dateString: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
  }).format(toLocalDate(dateString));
}

function formatWeekRange(dates: string[]) {
  const first = toLocalDate(dates[0]);
  const last = toLocalDate(dates[dates.length - 1]);
  const firstLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(first);
  const lastLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(last);

  return `${firstLabel} - ${lastLabel}`;
}

function getDateHour(value?: string) {
  if (!value) return 9;
  const date = new Date(value);
  return date.getHours() + date.getMinutes() / 60;
}

function workedHoursUntilNow(record?: TimeRecord) {
  if (!record?.entryAt) return 0;

  const totalMs = Date.now() - new Date(record.entryAt).getTime();
  const breakMs =
    record.breakStartAt && record.breakEndAt
      ? new Date(record.breakEndAt).getTime() -
        new Date(record.breakStartAt).getTime()
      : 0;

  return Math.max(0, Math.round(((totalMs - breakMs) / 3_600_000) * 100) / 100);
}

function sumRows(rows: Array<{ hours: string }>) {
  return rows.reduce((total, row) => total + (Number(row.hours) || 0), 0);
}

function getDailyLog(store: StoreData, colaboradorId: string, date: string) {
  return store.dailyWorkLogs.find(
    (log) => log.colaboradorId === colaboradorId && log.date === date,
  );
}

function findProject(store: StoreData, id: string) {
  return store.projects.find((project) => project.id === id);
}

export default function CollaboratorCalendarHome({
  session,
  store,
  onMutate,
}: CollaboratorCalendarHomeProps) {
  const projects = store.projects.filter((project) => project.status === "ativo");
  const today = getBrazilDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalState, setModalState] = useState<WorkDayModalState>(null);
  const visibleWeek = weekDates(selectedDate);
  const currentRecord = store.timeRecords.find(
    (record) => record.colaboradorId === session.id && record.date === today,
  );
  const isOpen = currentRecord?.status === "aberto";
  const isFinalized = currentRecord?.status === "finalizado";
  const workedToday = isOpen
    ? workedHoursUntilNow(currentRecord)
    : currentRecord?.totalHours ?? 0;

  async function startWorkDay() {
    await onMutate(
      "/api/time-records",
      {
        action: "clock-in",
        colaboradorId: session.id,
        projectId: projects[0]?.id ?? "",
      },
      { successMessage: "Dia de trabalho iniciado." },
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
      <aside className="space-y-5">
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-500">Hoje</p>
              <h2 className="mt-1 text-2xl font-semibold text-zinc-950">{today}</h2>
            </div>
            <StatusBadge value={currentRecord?.status ?? "não iniciado"} />
          </div>

          <button
            className={classNames(
              "mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-md px-4 text-base font-semibold transition disabled:cursor-not-allowed",
              isOpen
                ? "bg-zinc-950 text-white hover:bg-zinc-800"
                : isFinalized
                  ? "bg-zinc-200 text-zinc-500"
                  : "bg-blue-700 text-white hover:bg-blue-800",
            )}
            disabled={isFinalized || (!isOpen && projects.length === 0)}
            type="button"
            onClick={() => {
              if (isOpen) {
                setModalState({ mode: "close", date: today });
                return;
              }
              startWorkDay();
            }}
          >
            {isOpen ? <Square size={20} /> : <Play size={20} />}
            {isOpen ? "Encerrar dia de trabalho" : "Iniciar trabalho"}
          </button>

          <div className="mt-5 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <InfoPair label="Entrada" value={formatTime(currentRecord?.entryAt)} />
            <InfoPair label="Horas de hoje" value={formatHours(workedToday)} />
          </div>
        </section>

        <MiniMonthCalendar
          selectedDate={selectedDate}
          today={today}
          onSelect={setSelectedDate}
        />

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-950">
              Últimos lançamentos
            </h2>
            <button
              className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 px-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              type="button"
              onClick={() => setModalState({ mode: "manual", date: selectedDate })}
            >
              <Plus size={14} />
              Lançar
            </button>
          </div>
          <div className="space-y-2">
            {[...store.dailyWorkLogs]
              .filter((log) => log.colaboradorId === session.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((log) => (
                <button
                  className="w-full rounded-md border border-zinc-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  key={log.id}
                  type="button"
                  onClick={() => {
                    setSelectedDate(log.date);
                    setModalState({ mode: "manual", date: log.date });
                  }}
                >
                  <span className="block text-sm font-semibold text-zinc-950">
                    {log.date}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500">
                    {formatHours(log.totalHours)}
                  </span>
                </button>
              ))}
            {store.dailyWorkLogs.filter((log) => log.colaboradorId === session.id)
              .length === 0 && (
              <p className="rounded-md border border-dashed border-zinc-200 p-3 text-sm text-zinc-500">
                Nenhum lançamento diário salvo.
              </p>
            )}
          </div>
        </section>
      </aside>

      <section className="min-w-0 rounded-lg border border-zinc-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              type="button"
              onClick={() => setSelectedDate(today)}
            >
              <Calendar size={16} />
              Hoje
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100"
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100"
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              <ChevronRight size={17} />
            </button>
            <h2 className="ml-1 text-sm font-semibold text-zinc-950">
              {formatWeekRange(visibleWeek)}
            </h2>
          </div>
          <button
            className="flex h-9 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            type="button"
            onClick={() => setModalState({ mode: "manual", date: selectedDate })}
          >
            <Plus size={16} />
            Lançar horas do dia
          </button>
        </div>

        <WorkWeekCalendar
          dates={visibleWeek}
          selectedDate={selectedDate}
          session={session}
          store={store}
          today={today}
          onLaunch={(date) => {
            setSelectedDate(date);
            setModalState({ mode: "manual", date });
          }}
          onSelectDate={setSelectedDate}
        />
      </section>

      {modalState && (
        <WorkDayModal
          date={modalState.date}
          mode={modalState.mode}
          projects={projects}
          session={session}
          store={store}
          timeRecord={store.timeRecords.find(
            (record) =>
              record.colaboradorId === session.id && record.date === modalState.date,
          )}
          onClose={() => setModalState(null)}
          onMutate={onMutate}
        />
      )}
    </div>
  );
}

function MiniMonthCalendar({
  selectedDate,
  today,
  onSelect,
}: {
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
}) {
  const days = getMonthGrid(selectedDate);
  const reference = toLocalDate(selectedDate);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(reference);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold capitalize text-zinc-950">
          {monthLabel}
        </h2>
        <div className="flex gap-1">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100"
            type="button"
            onClick={() => onSelect(addDays(selectedDate, -30))}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100"
            type="button"
            onClick={() => onSelect(addDays(selectedDate, 30))}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-500">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((date) => {
          const localDate = toLocalDate(date);
          const isCurrentMonth = localDate.getMonth() === reference.getMonth();
          const active = date === selectedDate;
          const isToday = date === today;

          return (
            <button
              className={classNames(
                "flex h-8 items-center justify-center rounded-md text-sm transition",
                active
                  ? "bg-blue-700 font-semibold text-white"
                  : isToday
                    ? "bg-blue-50 font-semibold text-blue-800"
                    : isCurrentMonth
                      ? "text-zinc-800 hover:bg-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-50",
              )}
              key={date}
              type="button"
              onClick={() => onSelect(date)}
            >
              {localDate.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function WorkWeekCalendar({
  dates,
  selectedDate,
  session,
  store,
  today,
  onLaunch,
  onSelectDate,
}: {
  dates: string[];
  selectedDate: string;
  session: User;
  store: StoreData;
  today: string;
  onLaunch: (date: string) => void;
  onSelectDate: (date: string) => void;
}) {
  const hours = Array.from({ length: 11 }, (_, index) => index + 8);
  const rowHeight = 72;
  const calendarHeight = (hours.length - 1) * rowHeight;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1040px]">
        <div className="grid grid-cols-[56px_repeat(7,minmax(130px,1fr))] border-b border-zinc-200">
          <div className="border-r border-zinc-200 bg-zinc-50" />
          {dates.map((date) => {
            const localDate = toLocalDate(date);
            const active = date === selectedDate;
            const dayLog = getDailyLog(store, session.id, date);

            return (
              <div
                className={classNames(
                  "border-r border-zinc-200 p-3 last:border-r-0",
                  active ? "bg-blue-50" : "bg-white",
                )}
                key={date}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="text-left"
                    type="button"
                    onClick={() => onSelectDate(date)}
                  >
                    <span
                      className={classNames(
                        "block text-2xl font-semibold",
                        date === today ? "text-blue-700" : "text-zinc-950",
                      )}
                    >
                      {String(localDate.getDate()).padStart(2, "0")}
                    </span>
                    <span className="block text-xs capitalize text-zinc-500">
                      {formatDayLabel(date)}
                    </span>
                  </button>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-blue-700 transition hover:bg-blue-50"
                    title="Lançar horas deste dia"
                    type="button"
                    onClick={() => onLaunch(date)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {dayLog && (
                  <p className="mt-2 text-xs font-semibold text-zinc-600">
                    {formatHours(dayLog.totalHours)} lançadas
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,minmax(130px,1fr))]">
          <div
            className="relative border-r border-zinc-200 bg-zinc-50"
            style={{ height: calendarHeight }}
          >
            {hours.slice(0, -1).map((hour, index) => (
              <div
                className="absolute right-2 text-xs text-zinc-500"
                key={hour}
                style={{ top: index * rowHeight - 7 }}
              >
                {hour}
              </div>
            ))}
          </div>

          {dates.map((date) => {
            const dayRecords = store.timeRecords.filter(
              (record) => record.colaboradorId === session.id && record.date === date,
            );
            const dayLog = getDailyLog(store, session.id, date);

            return (
              <div
                className="relative border-r border-zinc-200 last:border-r-0"
                key={date}
                style={{ height: calendarHeight }}
                onClick={() => onSelectDate(date)}
              >
                {hours.slice(0, -1).map((hour, index) => (
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-zinc-200"
                    key={hour}
                    style={{ top: index * rowHeight }}
                  />
                ))}
                {dayRecords.map((record) => (
                  <CalendarTimeBlock
                    key={record.id}
                    record={record}
                    rowHeight={rowHeight}
                    store={store}
                  />
                ))}
                {dayLog && (
                  <CalendarLogBlock
                    log={dayLog}
                    rowHeight={rowHeight}
                    store={store}
                    topOffset={dayRecords.length ? 36 : 0}
                  />
                )}
                {!dayRecords.length && !dayLog && (
                  <button
                    className="absolute left-3 right-3 top-20 flex h-12 items-center justify-center gap-2 rounded-md border border-dashed border-zinc-200 text-sm font-medium text-zinc-400 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onLaunch(date);
                    }}
                  >
                    <Plus size={15} />
                    Lançar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarTimeBlock({
  record,
  rowHeight,
  store,
}: {
  record: TimeRecord;
  rowHeight: number;
  store: StoreData;
}) {
  const start = Math.max(8, getDateHour(record.entryAt));
  const end = record.exitAt
    ? getDateHour(record.exitAt)
    : Math.max(start + 1, getDateHour(new Date().toISOString()));
  const top = Math.max(0, (start - 8) * rowHeight);
  const height = Math.max(46, Math.min((end - start) * rowHeight, 260));

  return (
    <div
      className={classNames(
        "absolute left-2 right-2 overflow-hidden rounded-md border px-3 py-2 text-xs shadow-sm",
        record.status === "aberto"
          ? "border-blue-300 bg-blue-100 text-blue-950"
          : "border-zinc-300 bg-zinc-100 text-zinc-700",
      )}
      style={{ top, height }}
    >
      <p className="font-semibold">
        {record.status === "aberto" ? "Trabalho iniciado" : "Dia finalizado"}
      </p>
      <p className="mt-1 truncate">
        {formatTime(record.entryAt)} - {formatTime(record.exitAt)}
      </p>
      <p className="mt-1 truncate">
        {findProject(store, record.projectId)?.nome ?? "Projeto principal"}
      </p>
    </div>
  );
}

function CalendarLogBlock({
  log,
  rowHeight,
  store,
  topOffset,
}: {
  log: StoreData["dailyWorkLogs"][number];
  rowHeight: number;
  store: StoreData;
  topOffset: number;
}) {
  const top = rowHeight + topOffset;
  const height = Math.max(56, Math.min(log.totalHours * rowHeight, 220));
  const projectNames = log.projectAllocations
    .map((entry) => findProject(store, entry.projectId)?.nome)
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="absolute left-2 right-2 overflow-hidden rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-xs text-violet-950 shadow-sm"
      style={{ top, height }}
    >
      <p className="font-semibold">Lançamento diário</p>
      <p className="mt-1 truncate">{formatHours(log.totalHours)}</p>
      <p className="mt-1 line-clamp-2">
        {projectNames || "Demais atividades"}
      </p>
    </div>
  );
}

function WorkDayModal({
  date,
  mode,
  projects,
  session,
  store,
  timeRecord,
  onClose,
  onMutate,
}: {
  date: string;
  mode: "close" | "manual";
  projects: Project[];
  session: User;
  store: StoreData;
  timeRecord?: TimeRecord;
  onClose: () => void;
  onMutate: (path: string, body: unknown, options?: MutationOptions) => Promise<StoreData>;
}) {
  const existingLog = getDailyLog(store, session.id, date);
  const suggestedHours = mode === "close" ? workedHoursUntilNow(timeRecord) : 0;
  const [projectRows, setProjectRows] = useState<ProjectRow[]>(() =>
    existingLog?.projectAllocations.length
      ? existingLog.projectAllocations.map((entry) => ({
          projectId: entry.projectId,
          hours: String(entry.hours),
          observation: entry.observation,
        }))
      : [
          {
            projectId: projects[0]?.id ?? "",
            hours: suggestedHours ? String(suggestedHours) : "",
            observation: "",
          },
        ],
  );
  const [activityRows, setActivityRows] = useState<ActivityRow[]>(() =>
    existingLog?.otherActivityAllocations.length
      ? existingLog.otherActivityAllocations.map((entry) => ({
          category: entry.category,
          hours: String(entry.hours),
          observation: entry.observation,
        }))
      : [
          {
            category: OTHER_ACTIVITY_CATEGORIES[0],
            hours: "",
            observation: "",
          },
        ],
  );
  const [observation, setObservation] = useState(existingLog?.observation ?? "");
  const projectTotal = sumRows(projectRows);
  const activityTotal = sumRows(activityRows);
  const allocationTotal = projectTotal + activityTotal;
  const workedHours =
    mode === "close" ? suggestedHours : existingLog?.totalHours ?? allocationTotal;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onMutate(
      "/api/daily-work-logs",
      {
        colaboradorId: session.id,
        date,
        closeDay: mode === "close",
        observation,
        projectAllocations: projectRows.map((row) => ({
          projectId: row.projectId,
          hours: Number(row.hours) || 0,
          observation: row.observation,
        })),
        otherActivityAllocations: activityRows.map((row) => ({
          category: row.category,
          hours: Number(row.hours) || 0,
          observation: row.observation,
        })),
      },
      {
        successMessage:
          mode === "close"
            ? "Dia de trabalho encerrado."
            : "Lançamento diário salvo.",
      },
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6">
      <form
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 shadow-xl"
        onSubmit={submit}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">
              {mode === "close" ? "Encerrar dia de trabalho" : "Lançar horas do dia"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === "close"
                ? `Hoje você trabalhou ${formatHours(workedHours)}`
                : date}
            </p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100"
            type="button"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-5">
          <section className="rounded-lg border border-zinc-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950">
                Em quais projetos você atuou hoje?
              </h3>
              <button
                className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 px-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                type="button"
                onClick={() =>
                  setProjectRows([
                    ...projectRows,
                    { projectId: projects[0]?.id ?? "", hours: "", observation: "" },
                  ])
                }
              >
                <Plus size={14} />
                Projeto
              </button>
            </div>
            <div className="space-y-3">
              {projectRows.map((row, index) => (
                <div
                  className="grid gap-2 md:grid-cols-[1fr_120px_1fr_40px]"
                  key={`${row.projectId}-${index}`}
                >
                  <select
                    className={inputClass}
                    value={row.projectId}
                    onChange={(event) => {
                      const next = [...projectRows];
                      next[index] = { ...row, projectId: event.target.value };
                      setProjectRows(next);
                    }}
                  >
                    <option value="">Selecione o projeto</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    min={0}
                    step="0.25"
                    type="number"
                    value={row.hours}
                    onChange={(event) => {
                      const next = [...projectRows];
                      next[index] = { ...row, hours: event.target.value };
                      setProjectRows(next);
                    }}
                  />
                  <input
                    className={inputClass}
                    value={row.observation}
                    onChange={(event) => {
                      const next = [...projectRows];
                      next[index] = { ...row, observation: event.target.value };
                      setProjectRows(next);
                    }}
                  />
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100"
                    disabled={projectRows.length === 1}
                    type="button"
                    onClick={() =>
                      setProjectRows(projectRows.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-950">
                Demais atividades
              </h3>
              <button
                className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 px-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                type="button"
                onClick={() =>
                  setActivityRows([
                    ...activityRows,
                    {
                      category: OTHER_ACTIVITY_CATEGORIES[0],
                      hours: "",
                      observation: "",
                    },
                  ])
                }
              >
                <Plus size={14} />
                Atividade
              </button>
            </div>
            <div className="space-y-3">
              {activityRows.map((row, index) => (
                <div
                  className="grid gap-2 md:grid-cols-[1fr_120px_1fr_40px]"
                  key={`${row.category}-${index}`}
                >
                  <select
                    className={inputClass}
                    value={row.category}
                    onChange={(event) => {
                      const next = [...activityRows];
                      next[index] = {
                        ...row,
                        category: event.target.value as OtherActivityCategory,
                      };
                      setActivityRows(next);
                    }}
                  >
                    {OTHER_ACTIVITY_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    min={0}
                    step="0.25"
                    type="number"
                    value={row.hours}
                    onChange={(event) => {
                      const next = [...activityRows];
                      next[index] = { ...row, hours: event.target.value };
                      setActivityRows(next);
                    }}
                  />
                  <input
                    className={inputClass}
                    value={row.observation}
                    onChange={(event) => {
                      const next = [...activityRows];
                      next[index] = { ...row, observation: event.target.value };
                      setActivityRows(next);
                    }}
                  />
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100"
                    disabled={activityRows.length === 1}
                    type="button"
                    onClick={() =>
                      setActivityRows(
                        activityRows.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <label className="block">
            <span className={labelClass}>Observação geral</span>
            <textarea
              className={classNames(textareaClass, "mt-1")}
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-3">
          <InfoPair label="Projetos" value={formatHours(projectTotal)} />
          <InfoPair label="Demais atividades" value={formatHours(activityTotal)} />
          <InfoPair label="Total alocado" value={formatHours(allocationTotal)} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            type="button"
            onClick={onClose}
          >
            <X size={16} />
            Cancelar
          </button>
          <button
            className="flex h-10 items-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            disabled={allocationTotal <= 0}
            type="submit"
          >
            <Square size={16} />
            {mode === "close" ? "Encerrar meu dia de trabalho" : "Salvar lançamento"}
          </button>
        </div>
      </form>
    </div>
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
    normalized === "finalizado"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : normalized === "enviado" || normalized === "aberto"
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : normalized === "rascunho" || normalized === "pausado"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold uppercase",
        colors,
      )}
    >
      {value}
    </span>
  );
}
