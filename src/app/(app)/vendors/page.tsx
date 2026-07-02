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
      <h1 className="text-xl font-bold">Contacts</h1>

      <details className="rounded-xl bg-white p-3 shadow-sm">
        <summary className="cursor-pointer font-medium text-emerald-700">
          + Add contact
        </summary>
        <form action={createVendor} className="mt-3 space-y-2">
          <input name="name" required placeholder="Name" className="w-full rounded-lg border border-stone-300 px-3 py-2.5" />
          <div className="grid grid-cols-2 gap-2">
            <input name="specialty" placeholder="Specialty (plumber…)" className="rounded-lg border border-stone-300 px-2 py-2 text-sm" />
            <input name="phone" type="tel" placeholder="Phone" className="rounded-lg border border-stone-300 px-2 py-2 text-sm" />
          </div>
          <input name="email" type="email" placeholder="Email" className="w-full rounded-lg border border-stone-300 px-2 py-2 text-sm" />
          <textarea name="notes" rows={2} placeholder="Notes" className="w-full rounded-lg border border-stone-300 px-2 py-2 text-sm" />
          <button type="submit" className="w-full rounded-lg bg-emerald-700 py-2.5 font-semibold text-white">
            Add
          </button>
        </form>
      </details>

      <ul className="space-y-2">
        {all.map((v) => (
          <VendorRow key={v.id} vendor={v} />
        ))}
        {all.length === 0 && (
          <li className="rounded-xl bg-white p-6 text-center text-stone-500">
            No contacts yet. Add your super, plumber, HVAC person…
          </li>
        )}
      </ul>
    </div>
  );
}
