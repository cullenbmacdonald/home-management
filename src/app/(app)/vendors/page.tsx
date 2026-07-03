import { asc } from "drizzle-orm";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { createVendor } from "./actions";
import { VendorRow } from "@/components/vendor-row";

export const dynamic = "force-dynamic";

export default function VendorsPage() {
  const all = db.select().from(vendors).orderBy(asc(vendors.name)).all();

  return (
    <div className="space-y-4">
      <details className="rounded-[14px] border border-[#efece9] bg-white p-3">
        <summary className="cursor-pointer text-[14px] font-semibold text-[#059669]">
          + Add contact
        </summary>
        <form action={createVendor} className="mt-3 space-y-2">
          <input name="name" required placeholder="Name" className="w-full rounded-[10px] border border-[#e7e5e4] px-3 py-2.5 text-[14px] placeholder:text-[#a8a29e] focus:border-[#059669] focus:outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input name="specialty" placeholder="Specialty (plumber…)" className="rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]" />
            <input name="phone" type="tel" placeholder="Phone" className="rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]" />
          </div>
          <input name="email" type="email" placeholder="Email" className="w-full rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]" />
          <textarea name="notes" rows={2} placeholder="Notes" className="w-full rounded-[10px] border border-[#e7e5e4] px-2 py-2 text-[13px]" />
          <button type="submit" className="w-full rounded-[10px] bg-[#059669] py-2.5 text-[14px] font-bold text-white active:bg-emerald-800">
            Add
          </button>
        </form>
      </details>

      <ul className="space-y-[9px]">
        {all.map((v) => (
          <VendorRow key={v.id} vendor={v} />
        ))}
        {all.length === 0 && (
          <li className="rounded-[14px] border border-[#efece9] bg-white p-6 text-center text-[#a8a29e]">
            No contacts yet. Add your super, plumber, HVAC person…
          </li>
        )}
      </ul>
    </div>
  );
}
