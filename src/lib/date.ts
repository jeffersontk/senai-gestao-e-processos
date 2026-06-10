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

export function calculateWorkedHours(
  entryAt?: string,
  exitAt?: string,
  breakStartAt?: string,
  breakEndAt?: string,
) {
  if (!entryAt || !exitAt) return 0;

  const totalMs = new Date(exitAt).getTime() - new Date(entryAt).getTime();
  const breakMs =
    breakStartAt && breakEndAt
      ? new Date(breakEndAt).getTime() - new Date(breakStartAt).getTime()
      : 0;

  return Math.max(0, Math.round(((totalMs - breakMs) / 3_600_000) * 100) / 100);
}
