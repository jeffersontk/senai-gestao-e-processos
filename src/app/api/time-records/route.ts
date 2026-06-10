import { badRequest } from "@/lib/api";
import { calculateWorkedHours, getBrazilDate } from "@/lib/date";
import { readStore, updateStore } from "@/lib/store";
import { TimeRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

type TimeAction = "clock-in" | "break-start" | "break-end" | "clock-out";

export async function GET() {
  const store = await readStore();
  return Response.json(store.timeRecords);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    colaboradorId?: string;
    projectId?: string;
    action?: TimeAction;
    observation?: string;
  };

  if (!body.colaboradorId) return badRequest("Colaborador não informado.");
  if (!body.action) return badRequest("Ação de ponto não informada.");

  const today = getBrazilDate();
  const now = new Date().toISOString();
  let error = "";

  const store = await updateStore((draft) => {
    const currentIndex = draft.timeRecords.findIndex(
      (record) =>
        record.colaboradorId === body.colaboradorId && record.date === today,
    );
    const current = currentIndex >= 0 ? draft.timeRecords[currentIndex] : null;

    if (body.action === "clock-in") {
      if (!body.projectId) {
        error = "Selecione o projeto do dia antes de registrar entrada.";
        return;
      }

      if (current?.status === "aberto") {
        error = "Já existe um ponto aberto hoje.";
        return;
      }

      if (current?.status === "finalizado") {
        error = "O ponto de hoje já foi finalizado.";
        return;
      }

      const record: TimeRecord = {
        id: crypto.randomUUID(),
        colaboradorId: body.colaboradorId!,
        date: today,
        projectId: body.projectId,
        entryAt: now,
        totalHours: 0,
        observation: body.observation?.trim() ?? "",
        status: "aberto",
        createdAt: now,
        updatedAt: now,
      };
      draft.timeRecords.push(record);
      return;
    }

    if (!current || current.status !== "aberto") {
      error = "Não há ponto aberto para atualizar.";
      return;
    }

    if (body.action === "break-start") {
      if (current.breakStartAt) {
        error = "O intervalo já foi iniciado.";
        return;
      }
      draft.timeRecords[currentIndex] = {
        ...current,
        breakStartAt: now,
        updatedAt: now,
      };
      return;
    }

    if (body.action === "break-end") {
      if (!current.breakStartAt) {
        error = "Inicie o intervalo antes de finalizar.";
        return;
      }
      if (current.breakEndAt) {
        error = "O intervalo já foi finalizado.";
        return;
      }
      draft.timeRecords[currentIndex] = {
        ...current,
        breakEndAt: now,
        updatedAt: now,
      };
      return;
    }

    if (body.action === "clock-out") {
      if (current.breakStartAt && !current.breakEndAt) {
        error = "Finalize o intervalo antes de registrar saída.";
        return;
      }

      draft.timeRecords[currentIndex] = {
        ...current,
        exitAt: now,
        totalHours: calculateWorkedHours(
          current.entryAt,
          now,
          current.breakStartAt,
          current.breakEndAt,
        ),
        observation: body.observation?.trim() ?? current.observation,
        status: "finalizado",
        updatedAt: now,
      };
    }
  });

  if (error) return badRequest(error);

  return Response.json({ store });
}
