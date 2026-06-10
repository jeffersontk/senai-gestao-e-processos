import { badRequest, created } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import {
  MmpItem,
  MmpMovementType,
  MmpRecord,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const movementTypes: MmpMovementType[] = [
  "Transferência",
  "Empréstimo",
  "Cessão",
  "Utilização fora das Dependências da Entidade",
  "Disponibilidade",
];

type MmpPayload = Partial<
  Omit<
    MmpRecord,
    | "createdAt"
    | "updatedAt"
    | "sentToSignatureAt"
    | "signedFileName"
    | "signedFileOriginalName"
    | "signedFilePath"
    | "signedAt"
  >
>;

export async function GET() {
  const store = await readStore();
  return Response.json(store.mmpRecords);
}

export async function POST(request: Request) {
  const body = (await request.json()) as MmpPayload;
  const normalized = normalizeMmpPayload(body);
  if ("message" in normalized) return badRequest(normalized.message);

  const now = new Date().toISOString();
  const record: MmpRecord = {
    ...normalized,
    id: crypto.randomUUID(),
    status: body.status ?? "rascunho",
    createdAt: now,
    updatedAt: now,
  };

  const store = await updateStore((draft) => {
    draft.mmpRecords.push(record);
  });

  return created({ record, store });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as MmpPayload & {
    action?: "mark-generated" | "send-signature";
  };

  if (!body.id) return badRequest("MMP não encontrada.");

  let normalized: ReturnType<typeof normalizeMmpPayload> | null = null;
  if (!body.action) {
    normalized = normalizeMmpPayload(body);
    if ("message" in normalized) return badRequest(normalized.message);
  }

  const now = new Date().toISOString();
  let updated: MmpRecord | undefined;

  const store = await updateStore((draft) => {
    const index = draft.mmpRecords.findIndex((record) => record.id === body.id);
    if (index < 0) return;

    const current = draft.mmpRecords[index];

    if (body.action === "mark-generated") {
      updated = { ...current, status: "gerado", updatedAt: now };
    } else if (body.action === "send-signature") {
      updated = {
        ...current,
        status: "enviado_assinatura",
        sentToSignatureAt: now,
        updatedAt: now,
      };
    } else if (normalized && !("message" in normalized)) {
      updated = {
        ...current,
        ...normalized,
        status: body.status ?? current.status,
        updatedAt: now,
      };
    }

    if (updated) draft.mmpRecords[index] = updated;
  });

  if (!updated) return badRequest("MMP não encontrada.", 404);

  return Response.json({ record: updated, store });
}

function normalizeMmpPayload(payload: MmpPayload):
  | Omit<
      MmpRecord,
      | "id"
      | "status"
      | "createdAt"
      | "updatedAt"
      | "sentToSignatureAt"
      | "signedFileName"
      | "signedFileOriginalName"
      | "signedFilePath"
      | "signedAt"
    >
  | { message: string } {
  if (!payload.numero?.trim()) return { message: "Informe o número do documento." };
  if (!payload.unidadeOrigem?.trim()) return { message: "Informe a unidade de origem." };
  if (!payload.unidadeDestino?.trim()) return { message: "Informe a unidade de destino." };
  if (!payload.dataEmissao) return { message: "Informe a data de emissão." };
  const tipoMovimentacao = normalizeMovementType(payload.tipoMovimentacao);
  if (!tipoMovimentacao) {
    return { message: "Selecione o tipo de movimentação." };
  }

  const items = normalizeItems(payload.items ?? []);
  if (!items.length) return { message: "Informe ao menos um item." };

  return {
    numero: payload.numero.trim(),
    unidadeOrigem: payload.unidadeOrigem.trim(),
    unidadeDestino: payload.unidadeDestino.trim(),
    dataEmissao: payload.dataEmissao,
    tipoMovimentacao,
    observacoes: payload.observacoes?.trim() ?? "",
    dataRecebimento: payload.dataRecebimento ?? "",
    responsavelRecebimento: payload.responsavelRecebimento?.trim() ?? "",
    responsavelGuarda: payload.responsavelGuarda?.trim() ?? "",
    gestor: payload.gestor?.trim() ?? "",
    items,
  };
}

function normalizeMovementType(value?: string) {
  if (!value) return null;
  const normalizedValue = normalizeText(value);
  return (
    movementTypes.find((type) => normalizeText(type) === normalizedValue) ?? null
  );
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function normalizeItems(items: Partial<MmpItem>[]) {
  return items
    .map((item, index) => ({
      id: item.id ?? crypto.randomUUID(),
      item: index + 1,
      numeroPatrimonial: item.numeroPatrimonial?.trim() ?? "",
      descricao: item.descricao?.trim() ?? "",
      valor: Number.isFinite(Number(item.valor)) ? Number(item.valor) : 0,
    }))
    .filter((item) => item.numeroPatrimonial || item.descricao || item.valor > 0);
}
