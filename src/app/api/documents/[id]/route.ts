import { and, eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { db, dataDir } from "@/db";
import { documents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  // Scope to the caller's household so document ids can't be enumerated across
  // households.
  const doc = (
    await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, Number(id)),
          eq(documents.householdId, user.householdId),
        ),
      )
      .limit(1)
  )[0];
  if (!doc) return new Response("Not found", { status: 404 });

  const filePath = path.join(dataDir, "uploads", doc.filename);
  const data = await fs.readFile(filePath).catch(() => null);
  if (!data) return new Response("File missing", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
    },
  });
}
