import { badRequest, created } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";
import { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return Response.json(store.users);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<User>;

  if (!body.nome?.trim()) return badRequest("Informe o nome do colaborador.");
  if (!body.email?.trim()) return badRequest("Informe o email.");
  if (!body.cargo?.trim()) return badRequest("Informe o cargo.");

  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    nome: body.nome.trim(),
    email: body.email.trim().toLowerCase(),
    cargo: body.cargo.trim(),
    role: body.role ?? "COLABORADOR",
    status: body.status ?? "ativo",
    createdAt: now,
    updatedAt: now,
  };

  let duplicated = false;
  const store = await updateStore((draft) => {
    duplicated = draft.users.some((item) => item.email === user.email);
    if (!duplicated) draft.users.push(user);
  });

  if (duplicated) return badRequest("Já existe usuário com esse email.", 409);

  return created({ user, store });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<User>;

  if (!body.id) return badRequest("Colaborador não encontrado.");
  if (!body.nome?.trim()) return badRequest("Informe o nome do colaborador.");
  if (!body.email?.trim()) return badRequest("Informe o email.");
  if (!body.cargo?.trim()) return badRequest("Informe o cargo.");

  const now = new Date().toISOString();
  let updated: User | undefined;
  let duplicated = false;

  const store = await updateStore((draft) => {
    duplicated = draft.users.some(
      (item) => item.email === body.email!.trim().toLowerCase() && item.id !== body.id,
    );
    if (duplicated) return;

    const index = draft.users.findIndex((item) => item.id === body.id);
    if (index < 0) return;

    updated = {
      ...draft.users[index],
      nome: body.nome!.trim(),
      email: body.email!.trim().toLowerCase(),
      cargo: body.cargo!.trim(),
      role: body.role ?? draft.users[index].role,
      status: body.status ?? draft.users[index].status,
      updatedAt: now,
    };
    draft.users[index] = updated;
  });

  if (duplicated) return badRequest("Já existe usuário com esse email.", 409);
  if (!updated) return badRequest("Colaborador não encontrado.", 404);

  return Response.json({ user: updated, store });
}
