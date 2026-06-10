import { normalizeDurationInput } from "@/lib/duration";

export function badRequest(message: string, status = 400) {
  return Response.json({ message }, { status });
}

export function created<T>(payload: T) {
  return Response.json(payload, { status: 201 });
}

export function sanitizeHours(value: unknown) {
  return normalizeDurationInput(value);
}
