import { Prisma } from "@/generated/prisma/client";
import { normalizeDuration } from "@/lib/duration";
import { getPrisma } from "@/lib/prisma";
import { DailyWorkLog, MonthlyEntry, OtherActivityEntry, StoreData, TimeRecord } from "@/lib/types";

const stateId = process.env.SUPABASE_STATE_ID ?? "gestao-horas";

function createEmptyStore(): StoreData {
  return {
    users: [],
    projectTypes: [],
    projects: [],
    projectAllocations: [],
    monthlyEntries: [],
    otherActivityEntries: [],
    timeRecords: [],
    dailyWorkLogs: [],
    mmpRecords: [],
  };
}

function isStoreData(value: unknown): value is StoreData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoreData>;

  return (
    Array.isArray(candidate.users) &&
    Array.isArray(candidate.projectTypes) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.monthlyEntries) &&
    Array.isArray(candidate.otherActivityEntries) &&
    Array.isArray(candidate.timeRecords)
  );
}

function normalizeStore(store: StoreData): StoreData {
  const dailyWorkLogs = Array.isArray(store.dailyWorkLogs)
    ? store.dailyWorkLogs.map(normalizeDailyWorkLog)
    : [];

  return {
    ...store,
    projectAllocations: Array.isArray(store.projectAllocations)
      ? store.projectAllocations
      : [],
    monthlyEntries: store.monthlyEntries.map(normalizeMonthlyEntry),
    otherActivityEntries: store.otherActivityEntries.map(normalizeOtherActivityEntry),
    timeRecords: store.timeRecords.map(normalizeTimeRecord),
    dailyWorkLogs,
    mmpRecords: Array.isArray(store.mmpRecords) ? store.mmpRecords : [],
  };
}

function normalizeMonthlyEntry(entry: MonthlyEntry): MonthlyEntry {
  return { ...entry, hours: normalizeDuration(entry.hours) };
}

function normalizeOtherActivityEntry(entry: OtherActivityEntry): OtherActivityEntry {
  return { ...entry, hours: normalizeDuration(entry.hours) };
}

function normalizeTimeRecord(record: TimeRecord): TimeRecord {
  return { ...record, totalHours: normalizeDuration(record.totalHours) };
}

function normalizeDailyWorkLog(log: DailyWorkLog): DailyWorkLog {
  return {
    ...log,
    projectAllocations: log.projectAllocations.map((entry) => ({
      ...entry,
      hours: normalizeDuration(entry.hours),
    })),
    otherActivityAllocations: log.otherActivityAllocations.map((entry) => ({
      ...entry,
      hours: normalizeDuration(entry.hours),
    })),
    totalProjectHours: normalizeDuration(log.totalProjectHours),
    totalOtherActivityHours: normalizeDuration(log.totalOtherActivityHours),
    totalHours: normalizeDuration(log.totalHours),
  };
}

export async function readStore(): Promise<StoreData> {
  return readPrismaStore();
}

export async function writeStore(store: StoreData) {
  await writePrismaStore(store);
}

export async function updateStore(
  updater: (store: StoreData) => void | StoreData,
) {
  const store = await readStore();
  const nextStore = updater(store) ?? store;
  await writeStore(nextStore);
  return nextStore;
}

async function readPrismaStore() {
  const prisma = getPrisma();
  const row = await prisma.appState.findUnique({
    where: { id: stateId },
    select: { data: true },
  });

  const data = row?.data;
  if (isStoreData(data)) return normalizeStore(data);

  const emptyStore = createEmptyStore();
  await writePrismaStore(emptyStore);
  return emptyStore;
}

async function writePrismaStore(store: StoreData) {
  const prisma = getPrisma();
  const data = store as unknown as Prisma.InputJsonValue;

  await prisma.appState.upsert({
    where: { id: stateId },
    create: {
      id: stateId,
      data,
    },
    update: {
      data,
    },
  });
}
