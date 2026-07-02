import { desc } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { uploadDocument } from "./actions";
import { DocumentRow } from "@/components/document-row";

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  const docs = db
    .select()
    .from(documents)
    .orderBy(desc(documents.uploadedAt))
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Documents</h1>

      <form
        action={uploadDocument}
        className="space-y-2 rounded-xl bg-white p-3 shadow-sm"
      >
        <input
          name="title"
          placeholder="Title (defaults to filename)"
          className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
        />
        <div className="flex gap-2">
          <input
            name="file"
            type="file"
            required
            className="flex-1 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Upload
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {docs.map((doc) => (
          <DocumentRow key={doc.id} doc={doc} />
        ))}
        {docs.length === 0 && (
          <li className="rounded-xl bg-white p-6 text-center text-stone-500">
            No documents yet. Manuals, closing docs, insurance policies, receipts.
          </li>
        )}
      </ul>
    </div>
  );
}
