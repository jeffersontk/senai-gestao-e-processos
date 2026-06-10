import { badRequest, created } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return Response.json(store.projects);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Project>;

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
  });

  return created({ project, store });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<Project>;

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
  });

  if (!updated) return badRequest("Projeto não encontrado.", 404);

  return Response.json({ project: updated, store });
}
