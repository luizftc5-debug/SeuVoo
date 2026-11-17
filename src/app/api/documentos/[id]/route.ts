import { getCurrentUser } from "@/server/auth";
import { getDocument } from "@/server/services/trips";
import { readUpload } from "@/server/storage";

/** Serve um documento privado somente para o dono, sem cache público. */
export async function GET(_req: Request, ctx: RouteContext<"/api/documentos/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Não autenticado.", { status: 401 });
  const doc = await getDocument(user.id, id);
  if (!doc?.file) return new Response("Documento não encontrado.", { status: 404 });
  const bytes = await readUpload(doc.file.storageKey);
  const safeName = doc.file.originalName.replace(/[^\w.\- ]/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.file.mime,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
