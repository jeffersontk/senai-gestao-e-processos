import { badRequest, created } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { Project, StoreData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return Response.json(store.projects);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Project> & {
    allocatedUserIds?: string[];
  };

  if (!body.nome?.trim()) return badRequest("Informe o nome do projeto.");
  if (!body.identificador?.trim()) return badRequest("Informe o identificador.");
  if (!body.typeId) return badRequest("Selecione um tipo de projeto.");

  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    nome: body.nome.trim(),
    identificador: body.identificador.trim(),
    typeId: body.typeId,
    status: body.status ?? "ativo",
    descricao: body.descricao?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };

  const store = await updateStore((draft) => {
    draft.projects.push(project);
    syncProjectAllocations(draft, project.id, body.allocatedUserIds ?? [], now);
  });

  return created({ project, store });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<Project> & {
    allocatedUserIds?: string[];
  };

  if (!body.id) return badRequest("Projeto não encontrado.");
  if (!body.nome?.trim()) return badRequest("Informe o nome do projeto.");
  if (!body.identificador?.trim()) return badRequest("Informe o identificador.");
  if (!body.typeId) return badRequest("Selecione um tipo de projeto.");

  const now = new Date().toISOString();
  let updated: Project | undefined;

  const store = await updateStore((draft) => {
    const index = draft.projects.findIndex((item) => item.id === body.id);
    if (index < 0) return;

    updated = {
      ...draft.projects[index],
      nome: body.nome!.trim(),
      identificador: body.identificador!.trim(),
      typeId: body.typeId!,
      status: body.status ?? draft.projects[index].status,
      descricao: body.descricao?.trim() ?? "",
      updatedAt: now,
    };
    draft.projects[index] = updated;

    if (Array.isArray(body.allocatedUserIds)) {
      syncProjectAllocations(draft, updated.id, body.allocatedUserIds, now);
    }
  });

  if (!updated) return badRequest("Projeto não encontrado.", 404);

  return Response.json({ project: updated, store });
}

function syncProjectAllocations(
  store: StoreData,
  projectId: string,
  allocatedUserIds: string[],
  now: string,
) {
  const allowedUserIds = new Set(
    store.users
      .filter((user) => user.role === "COLABORADOR")
      .map((user) => user.id),
  );
  const nextUserIds = Array.from(new Set(allocatedUserIds)).filter((userId) =>
    allowedUserIds.has(userId),
  );
  const existingByUserId = new Map(
    store.projectAllocations
      .filter((allocation) => allocation.projectId === projectId)
      .map((allocation) => [allocation.colaboradorId, allocation]),
  );

  store.projectAllocations = [
    ...store.projectAllocations.filter(
      (allocation) => allocation.projectId !== projectId,
    ),
    ...nextUserIds.map((colaboradorId) => {
      const existing = existingByUserId.get(colaboradorId);

      return {
        id: existing?.id ?? crypto.randomUUID(),
        projectId,
        colaboradorId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
    }),
  ];
}
