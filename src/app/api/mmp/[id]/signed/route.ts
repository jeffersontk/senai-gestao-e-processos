import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { badRequest } from "@/lib/api";
import { readStore, updateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const signedDirectory = path.join(process.cwd(), "data", "mmp-signed");

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const store = await readStore();
  const record = store.mmpRecords.find((item) => item.id === id);

  if (!record?.signedFilePath || !record.signedFileName) {
    return badRequest("Arquivo assinado não encontrado.", 404);
  }

  const target = path.resolve(record.signedFilePath);
  if (!target.startsWith(path.resolve(signedDirectory))) {
    return badRequest("Caminho do arquivo inválido.", 400);
  }

  const file = await readFile(target);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${record.signedFileName}"`,
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) return badRequest("Envie um arquivo PDF.");
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return badRequest("O arquivo assinado deve ser um PDF.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length) return badRequest("O arquivo está vazio.");

  const now = new Date().toISOString();
  const safeName = `${id}-${crypto.randomUUID()}.pdf`;
  const target = path.join(signedDirectory, safeName);
  let updated = false;

  await mkdir(signedDirectory, { recursive: true });
  await writeFile(target, bytes);

  const store = await updateStore((draft) => {
    const index = draft.mmpRecords.findIndex((record) => record.id === id);
    if (index < 0) return;

    draft.mmpRecords[index] = {
      ...draft.mmpRecords[index],
      status: "assinado",
      signedFileName: safeName,
      signedFileOriginalName: file.name,
      signedFilePath: target,
      signedAt: now,
      updatedAt: now,
    };
    updated = true;
  });

  if (!updated) return badRequest("MMP não encontrada.", 404);

  return Response.json({ store });
}
