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
      <form
        action={uploadDocument}
        className="space-y-2 rounded-[14px] border border-[#efece9] bg-white p-3"
      >
        <input
          name="title"
          placeholder="Title (defaults to filename)"
          className="w-full rounded-[10px] border border-[#e7e5e4] px-3 py-2.5 text-[13px] placeholder:text-[#a8a29e] focus:border-[#059669] focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            name="file"
            type="file"
            required
            className="flex-1 text-[13px] file:mr-2 file:rounded-[8px] file:border-0 file:bg-[#f5f2ef] file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-[#57534e]"
          />
          <button
            type="submit"
            className="rounded-[10px] bg-[#059669] px-4 py-2 text-[13px] font-bold text-white active:bg-emerald-800"
          >
            Upload
          </button>
        </div>
      </form>

      <ul className="space-y-[9px]">
        {docs.map((doc) => (
          <DocumentRow key={doc.id} doc={doc} />
        ))}
        {docs.length === 0 && (
          <li className="rounded-[14px] border border-[#efece9] bg-white p-6 text-center text-[#a8a29e]">
            No documents yet. Manuals, closing docs, insurance policies, receipts.
          </li>
        )}
      </ul>
    </div>
  );
}
