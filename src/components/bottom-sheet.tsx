"use client";

import type { ReactNode } from "react";

export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-[rgba(28,25,23,0.4)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[82%] max-w-[430px] overflow-y-auto rounded-t-[22px] bg-white px-[18px] pb-[26px] pt-2 [animation:sheetIn_0.25s_cubic-bezier(0.32,0.72,0,1)_both]"
      >
        <div className="mx-auto my-2 h-1 w-[38px] rounded-full bg-[#d6d3d1]" />
        {children}
      </div>
    </div>
  );
}
