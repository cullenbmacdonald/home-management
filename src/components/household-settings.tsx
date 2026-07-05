"use client";

import { useActionState, useState } from "react";
import {
  renameHousehold,
  generateInvite,
  removeResident,
} from "@/app/(app)/settings/actions";

const inputClass =
  "w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-[15px] focus:border-[#059669] focus:outline-none";

export interface Resident {
  id: number;
  displayName: string;
  username: string;
  accentColor: string;
  role: "owner" | "member";
}

export function HouseholdSettings({
  householdName,
  residents,
  currentUserId,
  isOwner,
}: {
  householdName: string;
  residents: Resident[];
  currentUserId: number;
  isOwner: boolean;
}) {
  const [msg, action, pending] = useActionState(renameHousehold, null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function makeInvite() {
    setGenerating(true);
    const path = await generateInvite();
    setGenerating(false);
    if (path) setInviteUrl(`${window.location.origin}${path}`);
  }

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  }

  return (
    <div className="space-y-4">
      {isOwner ? (
        <form action={action} className="space-y-2">
          <input
            name="name"
            defaultValue={householdName}
            className={inputClass}
            placeholder="Household name"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl border border-[#e7e5e4] bg-white py-2.5 text-[14px] font-semibold text-[#57534e] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Rename household"}
          </button>
          {msg && <p className="text-[13px] text-[#059669]">{msg}</p>}
        </form>
      ) : (
        <div className="text-[15px] font-semibold text-[#1c1917]">
          {householdName}
        </div>
      )}

      <div>
        <div className="mb-1.5 text-[12px] font-semibold text-[#57534e]">
          Residents
        </div>
        <ul className="space-y-1.5">
          {residents.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2.5 rounded-xl border border-[#efece9] px-3 py-2"
            >
              <span
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ background: r.accentColor }}
              >
                {r.displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-[#1c1917]">
                  {r.displayName}
                  {r.role === "owner" && (
                    <span className="ml-1.5 text-[11px] font-semibold text-[#a8a29e]">
                      owner
                    </span>
                  )}
                </div>
                <div className="truncate text-[12px] text-[#a8a29e]">
                  @{r.username}
                </div>
              </div>
              {isOwner && r.id !== currentUserId && (
                <form action={removeResident.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="text-[12px] font-semibold text-[#dc2626]"
                  >
                    Remove
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isOwner && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={makeInvite}
            disabled={generating}
            className="w-full rounded-xl bg-[#059669] py-2.5 text-[14px] font-semibold text-white active:bg-[#047857] disabled:opacity-50"
          >
            {generating ? "Generating…" : "Create invite link"}
          </button>
          {inviteUrl && (
            <div className="space-y-1.5">
              <p className="text-[12px] text-[#78716c]">
                Share this single-use link. It expires in 14 days.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className={`${inputClass} text-[12px]`}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={copy}
                  className="flex-none rounded-xl border border-[#e7e5e4] px-3 text-[13px] font-semibold text-[#57534e]"
                >
                  {copying ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
