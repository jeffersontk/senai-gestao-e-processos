import { badRequest, sanitizeHours } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import {
  OtherActivityCategory,
  OtherActivityEntry,
  OTHER_ACTIVITY_CATEGORIES,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type OtherActivityInput = {
  category: OtherActivityCategory;
  hours: string;
  observation?: string;
};

export async function GET() {
  const store = await readStore();
  return Response.json(store.otherActivityEntries);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    colaboradorId?: string;
    referenceMonth?: number;
    referenceYear?: number;
    entries?: OtherActivityInput[];
  };

  if (!body.colaboradorId) return badRequest("Colaborador não informado.");
  if (!body.referenceMonth || !body.referenceYear) {
    return badRequest("Mês e ano são obrigatórios.");
  }
  if (!Array.isArray(body.entries)) return badRequest("Atividades inválidas.");

  const now = new Date().toISOString();
  const store = await updateStore((draft) => {
    for (const entry of body.entries ?? []) {
      if (!OTHER_ACTIVITY_CATEGORIES.includes(entry.category)) continue;

      const index = draft.otherActivityEntries.findIndex(
        (item) =>
          item.colaboradorId === body.colaboradorId &&
          item.referenceMonth === body.referenceMonth &&
          item.referenceYear === body.referenceYear &&
          item.category === entry.category,
      );

      const nextEntry: OtherActivityEntry = {
        id: index >= 0 ? draft.otherActivityEntries[index].id : crypto.randomUUID(),
        colaboradorId: body.colaboradorId!,
        referenceMonth: body.referenceMonth!,
        referenceYear: body.referenceYear!,
        category: entry.category,
        hours: sanitizeHours(entry.hours),
        observation: entry.observation?.trim() ?? "",
        createdAt: index >= 0 ? draft.otherActivityEntries[index].createdAt : now,
        updatedAt: now,
      };

      if (index >= 0) draft.otherActivityEntries[index] = nextEntry;
      else draft.otherActivityEntries.push(nextEntry);
    }
  });

  return Response.json({ store });
}
