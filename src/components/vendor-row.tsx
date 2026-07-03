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
    <li className="flex items-center gap-[13px] rounded-[14px] border border-[#efece9] bg-white p-[14px]">
      <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-[#f0ede9] text-[15px] font-bold text-[#78716c]">
        {vendor.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        {vendor.specialty && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#a8a29e]">
            {vendor.specialty}
          </div>
        )}
        <div className="text-[15px] font-semibold text-[#1c1917]">
          {vendor.name}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 text-[12px]">
          {vendor.phone && (
            <a href={`tel:${vendor.phone}`} className="font-semibold text-[#059669]">
              {vendor.phone}
            </a>
          )}
          {vendor.email && (
            <a href={`mailto:${vendor.email}`} className="text-[#78716c]">
              {vendor.email}
            </a>
          )}
        </div>
        {vendor.notes && (
          <p className="mt-1 text-[12px] text-[#a8a29e]">{vendor.notes}</p>
        )}
      </div>
      {vendor.phone && (
        <a
          href={`tel:${vendor.phone}`}
          aria-label={`Call ${vendor.name}`}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#ecfdf5]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#059669"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" />
          </svg>
        </a>
      )}
      <button
        onClick={() => {
          if (confirm(`Delete ${vendor.name}?`)) {
            startTransition(() => deleteVendor(vendor.id));
          }
        }}
        disabled={pending}
        aria-label="Delete contact"
        className="px-1 text-[#c7c2bc] active:text-[#dc2626]"
      >
        ✕
      </button>
    </li>
  );
}
