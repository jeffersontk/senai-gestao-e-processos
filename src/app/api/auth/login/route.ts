import { badRequest } from "@/lib/api";
import { verifyUserPassword } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return badRequest("Informe email e senha.");
  }

  const store = await readStore();
  const user = store.users.find(
    (item) =>
      item.email.toLowerCase() === body.email?.toLowerCase() &&
      item.status === "ativo",
  );

  if (!user || !(await verifyUserPassword(user.id, body.password))) {
    return badRequest("Credenciais inválidas.", 401);
  }

  return Response.json({ user });
}
