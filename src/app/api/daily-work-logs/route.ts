import { badRequest, sanitizeHours } from "@/lib/api";
import { calculateWorkedHours } from "@/lib/date";
import { durationToMinutes, minutesToDuration } from "@/lib/duration";
import { readStore, updateStore } from "@/lib/store";
import {
  DailyOtherActivityAllocation,
  DailyProjectAllocation,
  DailyWorkLog,
  OTHER_ACTIVITY_CATEGORIES,
  StoreData,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type DailyProjectInput = {
  projectId?: string;
  hours?: string;
  observation?: string;
};

type DailyOtherActivityInput = {
  category?: string;
  hours?: string;
  observation?: string;
};

type DailyWorkLogInput = {
  colaboradorId?: string;
  date?: string;
  projectAllocations?: DailyProjectInput[];
  otherActivityAllocations?: DailyOtherActivityInput[];
  observation?: string;
  closeDay?: boolean;
};

export async function GET() {
  const store = await readStore();
  return Response.json(store.dailyWorkLogs);
}

export async function POST(request: Request) {
  const body = (await request.json()) as DailyWorkLogInput;

  if (!body.colaboradorId) return badRequest("Colaborador não informado.");
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return badRequest("Data inválida.");
  }

  const now = new Date().toISOString();
  let error = "";

  const store = await updateStore((draft) => {
    const userExists = draft.users.some((user) => user.id === body.colaboradorId);
    if (!userExists) {
      error = "Colaborador não encontrado.";
      return;
    }

    const projectAllocations = normalizeProjectAllocations(
      draft,
      body.projectAllocations ?? [],
    );
    const otherActivityAllocations = normalizeOtherActivityAllocations(
      body.otherActivityAllocations ?? [],
    );
    const totalProjectHours = sumAllocationHours(projectAllocations);
    const totalOtherActivityHours = sumAllocationHours(otherActivityAllocations);
    const totalHours = minutesToDuration(
      durationToMinutes(totalProjectHours) + durationToMinutes(totalOtherActivityHours),
    );

    if (durationToMinutes(totalHours) <= 0) {
      error = "Informe ao menos uma hora para encerrar o lançamento.";
      return;
    }

    if (body.closeDay) {
      const openRecord = draft.timeRecords.find(
        (record) =>
          record.colaboradorId === body.colaboradorId &&
          record.date === body.date &&
          record.status === "aberto",
      );

      if (!openRecord) {
        error = "Não há dia de trabalho aberto para encerrar.";
        return;
      }
    }

    const index = draft.dailyWorkLogs.findIndex(
      (log) => log.colaboradorId === body.colaboradorId && log.date === body.date,
    );
    const previousLog = index >= 0 ? draft.dailyWorkLogs[index] : undefined;
    const nextLog: DailyWorkLog = {
      id: previousLog?.id ?? crypto.randomUUID(),
      colaboradorId: body.colaboradorId!,
      date: body.date!,
      projectAllocations,
      otherActivityAllocations,
      totalProjectHours,
      totalOtherActivityHours,
      totalHours,
      observation: body.observation?.trim() ?? previousLog?.observation ?? "",
      createdAt: previousLog?.createdAt ?? now,
      updatedAt: now,
    };

    applyDailyLogDelta(draft, previousLog, nextLog, now);

    if (index >= 0) draft.dailyWorkLogs[index] = nextLog;
    else draft.dailyWorkLogs.push(nextLog);

    if (body.closeDay) {
      closeOpenTimeRecord(draft, nextLog, now);
    }
  });

  if (error) return badRequest(error);

  return Response.json({ store });
}

function normalizeProjectAllocations(
  store: StoreData,
  entries: DailyProjectInput[],
): DailyProjectAllocation[] {
  const projectIds = new Set(store.projects.map((project) => project.id));

  return entries
    .map((entry) => ({
      projectId: entry.projectId ?? "",
      hours: sanitizeHours(entry.hours),
      observation: entry.observation?.trim() ?? "",
    }))
    .filter((entry) => projectIds.has(entry.projectId) && durationToMinutes(entry.hours) > 0);
}

function normalizeOtherActivityAllocations(
  entries: DailyOtherActivityInput[],
): DailyOtherActivityAllocation[] {
  return entries
    .map((entry) => ({
      category: entry.category,
      hours: sanitizeHours(entry.hours),
      observation: entry.observation?.trim() ?? "",
    }))
    .filter(
      (entry): entry is DailyOtherActivityAllocation =>
        typeof entry.category === "string" &&
        OTHER_ACTIVITY_CATEGORIES.includes(
          entry.category as DailyOtherActivityAllocation["category"],
        ) &&
        durationToMinutes(entry.hours) > 0,
    );
}

function sumAllocationHours(entries: Array<{ hours: string }>) {
  return minutesToDuration(
    entries.reduce((total, entry) => total + durationToMinutes(entry.hours), 0),
  );
}

function applyDailyLogDelta(
  store: StoreData,
  previousLog: DailyWorkLog | undefined,
  nextLog: DailyWorkLog,
  now: string,
) {
  const [referenceYear, referenceMonth] = nextLog.date.split("-").map(Number);

  for (const entry of previousLog?.projectAllocations ?? []) {
    updateMonthlyProjectHours(
      store,
      nextLog.colaboradorId,
      referenceMonth,
      referenceYear,
      entry.projectId,
      -durationToMinutes(entry.hours),
      now,
    );
  }

  for (const entry of nextLog.projectAllocations) {
    updateMonthlyProjectHours(
      store,
      nextLog.colaboradorId,
      referenceMonth,
      referenceYear,
      entry.projectId,
      durationToMinutes(entry.hours),
      now,
    );
  }

  for (const entry of previousLog?.otherActivityAllocations ?? []) {
    updateMonthlyOtherActivityHours(
      store,
      nextLog.colaboradorId,
      referenceMonth,
      referenceYear,
      entry.category,
      -durationToMinutes(entry.hours),
      now,
    );
  }

  for (const entry of nextLog.otherActivityAllocations) {
    updateMonthlyOtherActivityHours(
      store,
      nextLog.colaboradorId,
      referenceMonth,
      referenceYear,
      entry.category,
      durationToMinutes(entry.hours),
      now,
    );
  }
}

function updateMonthlyProjectHours(
  store: StoreData,
  colaboradorId: string,
  referenceMonth: number,
  referenceYear: number,
  projectId: string,
  deltaMinutes: number,
  now: string,
) {
  const index = store.monthlyEntries.findIndex(
    (entry) =>
      entry.colaboradorId === colaboradorId &&
      entry.referenceMonth === referenceMonth &&
      entry.referenceYear === referenceYear &&
      entry.projectId === projectId,
  );

  if (index < 0) {
    if (deltaMinutes <= 0) return;

    store.monthlyEntries.push({
      id: crypto.randomUUID(),
      colaboradorId,
      referenceMonth,
      referenceYear,
      projectId,
      hours: minutesToDuration(deltaMinutes),
      observation: "Lançamento diário via calendário",
      status: "rascunho",
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const current = store.monthlyEntries[index];
  const nextMinutes = Math.max(
    0,
    durationToMinutes(current.hours) + deltaMinutes,
  );

  store.monthlyEntries[index] = {
    ...current,
    hours: minutesToDuration(nextMinutes),
    observation: current.observation || "Lançamento diário via calendário",
    status: current.status === "aprovado" ? "reaberto" : current.status,
    updatedAt: now,
  };
}

function updateMonthlyOtherActivityHours(
  store: StoreData,
  colaboradorId: string,
  referenceMonth: number,
  referenceYear: number,
  category: DailyOtherActivityAllocation["category"],
  deltaMinutes: number,
  now: string,
) {
  const index = store.otherActivityEntries.findIndex(
    (entry) =>
      entry.colaboradorId === colaboradorId &&
      entry.referenceMonth === referenceMonth &&
      entry.referenceYear === referenceYear &&
      entry.category === category,
  );

  if (index < 0) {
    if (deltaMinutes <= 0) return;

    store.otherActivityEntries.push({
      id: crypto.randomUUID(),
      colaboradorId,
      referenceMonth,
      referenceYear,
      category,
      hours: minutesToDuration(deltaMinutes),
      observation: "Lançamento diário via calendário",
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const current = store.otherActivityEntries[index];
  const nextMinutes = Math.max(
    0,
    durationToMinutes(current.hours) + deltaMinutes,
  );

  store.otherActivityEntries[index] = {
    ...current,
    hours: minutesToDuration(nextMinutes),
    observation: current.observation || "Lançamento diário via calendário",
    updatedAt: now,
  };
}

function closeOpenTimeRecord(store: StoreData, log: DailyWorkLog, now: string) {
  const index = store.timeRecords.findIndex(
    (record) =>
      record.colaboradorId === log.colaboradorId &&
      record.date === log.date &&
      record.status === "aberto",
  );

  if (index < 0) return;

  const current = store.timeRecords[index];
  const breakEndAt =
    current.breakStartAt && !current.breakEndAt ? now : current.breakEndAt;

  store.timeRecords[index] = {
    ...current,
    projectId: log.projectAllocations[0]?.projectId ?? current.projectId,
    breakEndAt,
    exitAt: now,
    totalHours: calculateWorkedHours(
      current.entryAt,
      now,
      current.breakStartAt,
      breakEndAt,
    ),
    status: "finalizado",
    updatedAt: now,
  };
}
