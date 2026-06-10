const durationPattern = /^(\d{1,4}):([0-5]\d)$/;

export function minutesToDuration(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function durationToMinutes(value: unknown) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.round(value * 60);
  }

  if (typeof value !== "string") return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  const match = trimmed.match(durationPattern);
  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }

  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  return Math.round(parsed * 60);
}

export function normalizeDuration(value: unknown) {
  return minutesToDuration(durationToMinutes(value));
}

export function normalizeDurationInput(value: unknown) {
  if (typeof value !== "string") return "00:00";

  const trimmed = value.trim();
  const match = trimmed.match(durationPattern);
  if (!match) return "00:00";

  return minutesToDuration(Number(match[1]) * 60 + Number(match[2]));
}

export function durationInputValue(value: unknown) {
  const minutes = durationToMinutes(value);
  return minutes > 0 ? minutesToDuration(minutes) : "";
}

export function sumDurationMinutes<T>(
  items: T[],
  pick: (item: T) => unknown,
) {
  return items.reduce((total, item) => total + durationToMinutes(pick(item)), 0);
}

export function formatDuration(value: unknown) {
  return `${normalizeDuration(value)}h`;
}

export function formatDurationFromMinutes(totalMinutes: number) {
  return `${minutesToDuration(totalMinutes)}h`;
}
