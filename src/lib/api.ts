export function badRequest(message: string, status = 400) {
  return Response.json({ message }, { status });
}

export function created<T>(payload: T) {
  return Response.json(payload, { status: 201 });
}

export function sanitizeHours(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}
