import { minutesToDuration } from "@/lib/duration";

export function getBrazilDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function formatDateTime(value?: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatTime(value?: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function brazilDateTimeToIso(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;

  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

export function calculateWorkedHours(
  entryAt?: string,
  exitAt?: string,
  breakStartAt?: string,
  breakEndAt?: string,
) {
  if (!entryAt || !exitAt) return "00:00";

  const totalMs = new Date(exitAt).getTime() - new Date(entryAt).getTime();
  const breakMs =
    breakStartAt && breakEndAt
      ? new Date(breakEndAt).getTime() - new Date(breakStartAt).getTime()
      : 0;

  return minutesToDuration(Math.max(0, Math.round((totalMs - breakMs) / 60_000)));
}
