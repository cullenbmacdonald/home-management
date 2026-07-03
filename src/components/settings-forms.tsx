"use client";

import { useActionState } from "react";
import { saveHaConfig, changePassword } from "@/app/(app)/settings/actions";

const inputClass =
  "w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-[15px] focus:border-[#059669] focus:outline-none";
const labelClass =
  "text-[12px] font-semibold text-[#57534e] mb-1 block";

export function HaConfigForm({
  baseUrl,
  entities,
  tokenSaved,
}: {
  baseUrl: string;
  entities: string;
  tokenSaved: boolean;
}) {
  const [msg, action, pending] = useActionState(saveHaConfig, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={labelClass} htmlFor="ha-base-url">
          Base URL
        </label>
        <input
          id="ha-base-url"
          name="baseUrl"
          defaultValue={baseUrl}
          placeholder="http://homeassistant.local:8123"
          autoCapitalize="none"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="ha-token">
          Long-lived access token
        </label>
        <input
          id="ha-token"
          name="token"
          type="password"
          placeholder={tokenSaved ? "Token saved — leave blank to keep" : "Paste token"}
          autoComplete="off"
          className={inputClass}
        />
        {tokenSaved && (
          <p className="mt-1 text-[12px] text-[#059669]">Token saved</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor="ha-entities">
          Entities (one id per line)
        </label>
        <textarea
          id="ha-entities"
          name="entities"
          defaultValue={entities}
          rows={5}
          placeholder={"sensor.living_room_temp\nclimate.mini_split\nlock.front_door"}
          autoCapitalize="none"
          className={`${inputClass} font-mono text-[13px]`}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#059669] py-2.5 text-[15px] font-semibold text-white active:bg-[#047857] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {msg && <p className="text-[13px] text-[#059669]">{msg}</p>}
    </form>
  );
}

export function PasswordForm() {
  const [msg, action, pending] = useActionState(changePassword, null);
  const isError = msg != null && msg !== "Password updated";
  return (
    <form action={action} className="space-y-3">
      <input
        name="currentPassword"
        type="password"
        placeholder="Current password"
        autoComplete="current-password"
        className={inputClass}
      />
      <input
        name="newPassword"
        type="password"
        placeholder="New password"
        autoComplete="new-password"
        className={inputClass}
      />
      <input
        name="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        autoComplete="new-password"
        className={inputClass}
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl border border-[#e7e5e4] bg-white py-2.5 text-[15px] font-semibold text-[#57534e] disabled:opacity-50"
      >
        {pending ? "Updating…" : "Change password"}
      </button>
      {msg && (
        <p
          className="text-[13px]"
          style={{ color: isError ? "#dc2626" : "#059669" }}
        >
          {msg}
        </p>
      )}
    </form>
  );
}
