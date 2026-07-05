"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { db, dataDir } from "@/db";
import { documents } from "@/db/schema";
import { requireHousehold } from "@/lib/auth";

const uploadsDir = path.join(dataDir, "uploads");

export async function uploadDocument(formData: FormData) {
  const { householdId } = await requireHousehold();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const title =
    String(formData.get("title") ?? "").trim() ||
    file.name.replace(/\.[^.]+$/, "");

  const ext = path.extname(file.name).slice(0, 10);
  const filename = crypto.randomBytes(12).toString("hex") + ext;
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(
    path.join(uploadsDir, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  await db.insert(documents).values({
    householdId,
    title,
    filename,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  });
  revalidatePath("/documents");
}

export async function deleteDocument(id: number) {
  const { householdId } = await requireHousehold();
  const doc = (
    await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.householdId, householdId)))
      .limit(1)
  )[0];
  if (!doc) return;
  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.householdId, householdId)));
  await fs.unlink(path.join(uploadsDir, doc.filename)).catch(() => {});
  revalidatePath("/documents");
}
