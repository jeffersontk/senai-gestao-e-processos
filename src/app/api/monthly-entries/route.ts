import { badRequest, sanitizeHours } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { MonthlyEntry, MonthlyEntryStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type MonthlyEntryInput = {
  projectId: string;
  hours: string;
  observation?: string;
};

export async function GET() {
  const store = await readStore();
  return Response.json(store.monthlyEntries);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    colaboradorId?: string;
    referenceMonth?: number;
    referenceYear?: number;
    status?: MonthlyEntryStatus;
    entries?: MonthlyEntryInput[];
  };

  if (!body.colaboradorId) return badRequest("Colaborador não informado.");
  if (!body.referenceMonth || !body.referenceYear) {
    return badRequest("Mês e ano são obrigatórios.");
  }
  if (!Array.isArray(body.entries)) return badRequest("Lançamentos inválidos.");

  const now = new Date().toISOString();
  const status = body.status ?? "rascunho";

  const store = await updateStore((draft) => {
    for (const entry of body.entries ?? []) {
      const index = draft.monthlyEntries.findIndex(
        (item) =>
          item.colaboradorId === body.colaboradorId &&
          item.referenceMonth === body.referenceMonth &&
          item.referenceYear === body.referenceYear &&
          item.projectId === entry.projectId,
      );

      const nextEntry: MonthlyEntry = {
        id: index >= 0 ? draft.monthlyEntries[index].id : crypto.randomUUID(),
        colaboradorId: body.colaboradorId!,
        referenceMonth: body.referenceMonth!,
        referenceYear: body.referenceYear!,
        projectId: entry.projectId,
        hours: sanitizeHours(entry.hours),
        observation: entry.observation?.trim() ?? "",
        status,
        createdAt: index >= 0 ? draft.monthlyEntries[index].createdAt : now,
        updatedAt: now,
      };

      if (index >= 0) draft.monthlyEntries[index] = nextEntry;
      else draft.monthlyEntries.push(nextEntry);
    }
  });

  return Response.json({ store });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    ids?: string[];
    status?: MonthlyEntryStatus;
  };

  if (!body.ids?.length) return badRequest("Informe os lançamentos.");
  if (!body.status) return badRequest("Informe o status.");

  const now = new Date().toISOString();
  const store = await updateStore((draft) => {
    draft.monthlyEntries = draft.monthlyEntries.map((entry) =>
      body.ids!.includes(entry.id)
        ? { ...entry, status: body.status!, updatedAt: now }
        : entry,
    );
  });

  return Response.json({ store });
}
