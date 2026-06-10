import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return Response.json(store);
}
