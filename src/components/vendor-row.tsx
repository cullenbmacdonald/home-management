"use client";

import { useTransition } from "react";
import { deleteVendor } from "@/app/(app)/vendors/actions";

interface VendorData {
  id: number;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export function VendorRow({ vendor }: { vendor: VendorData }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{vendor.name}</div>
          {vendor.specialty && (
            <div className="text-xs uppercase tracking-wide text-stone-400">
              {vendor.specialty}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (confirm(`Delete ${vendor.name}?`)) {
              startTransition(() => deleteVendor(vendor.id));
            }
          }}
          disabled={pending}
          aria-label="Delete contact"
          className="px-1 text-stone-300 active:text-red-500"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        {vendor.phone && (
          <a href={`tel:${vendor.phone}`} className="text-emerald-700 underline">
            {vendor.phone}
          </a>
        )}
        {vendor.email && (
          <a href={`mailto:${vendor.email}`} className="text-emerald-700 underline">
            {vendor.email}
          </a>
        )}
      </div>
      {vendor.notes && <p className="mt-1 text-sm text-stone-500">{vendor.notes}</p>}
    </li>
  );
}
