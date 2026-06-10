import { badRequest, created } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { ProjectType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return Response.json(store.projectTypes);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ProjectType>;

  if (!body.nome?.trim()) {
    return badRequest("Informe o nome do tipo de projeto.");
  }

  const now = new Date().toISOString();
  const projectType: ProjectType = {
    id: crypto.randomUUID(),
    nome: body.nome.trim(),
    descricao: body.descricao?.trim() ?? "",
    status: body.status ?? "ativo",
    createdAt: now,
    updatedAt: now,
  };

  const store = await updateStore((draft) => {
    draft.projectTypes.push(projectType);
  });

  return created({ projectType, store });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<ProjectType>;

  if (!body.id) return badRequest("Tipo de projeto não encontrado.");
  if (!body.nome?.trim()) return badRequest("Informe o nome do tipo.");

  const now = new Date().toISOString();
  let updated: ProjectType | undefined;

  const store = await updateStore((draft) => {
    const index = draft.projectTypes.findIndex((item) => item.id === body.id);
    if (index < 0) return;

    updated = {
      ...draft.projectTypes[index],
      nome: body.nome!.trim(),
      descricao: body.descricao?.trim() ?? "",
      status: body.status ?? draft.projectTypes[index].status,
      updatedAt: now,
    };
    draft.projectTypes[index] = updated;
  });

  if (!updated) return badRequest("Tipo de projeto não encontrado.", 404);

  return Response.json({ projectType: updated, store });
}
