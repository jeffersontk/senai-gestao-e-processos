import { badRequest } from "@/lib/api";
import { setUserPassword, verifyUserPassword } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
    userId?: string;
  };

  if (!body.userId) return badRequest("Usuario nao encontrado.");
  if (!body.currentPassword) return badRequest("Informe a senha atual.");
  if (!body.newPassword) return badRequest("Informe a nova senha.");
  if (body.newPassword.length < 8) {
    return badRequest("A nova senha deve ter pelo menos 8 caracteres.");
  }

  const store = await readStore();
  const user = store.users.find((item) => item.id === body.userId && item.status === "ativo");
  if (!user) return badRequest("Usuario nao encontrado.", 404);

  const currentPasswordOk = await verifyUserPassword(user.id, body.currentPassword);
  if (!currentPasswordOk) return badRequest("Senha atual invalida.", 401);

  await setUserPassword(user.id, body.newPassword);
  return Response.json({ ok: true });
}
