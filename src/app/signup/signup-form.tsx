"use client";

import { useActionState } from "react";
import { signup } from "./actions";

const inputClass =
  "w-full rounded-xl border border-[#e7e5e4] px-4 py-3 text-base focus:border-[#059669] focus:outline-none";

export function SignupForm({
  invite,
}: {
  invite: { code: string; householdName: string } | null;
}) {
  const [error, formAction, pending] = useActionState(signup, null);
  return (
    <form action={formAction} className="space-y-4">
      {invite ? (
        <input type="hidden" name="invite" value={invite.code} />
      ) : (
        <input
          name="householdName"
          placeholder="Household name (e.g. The Smiths)"
          required
          className={inputClass}
        />
      )}
      <input
        name="displayName"
        placeholder="Your name"
        autoComplete="name"
        required
        className={inputClass}
      />
      <input
        name="username"
        placeholder="Username"
        autoCapitalize="none"
        autoComplete="username"
        required
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        autoComplete="new-password"
        required
        className={inputClass}
      />
      {error && <p className="text-sm text-[#dc2626]">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#059669] py-3 font-semibold text-white active:bg-[#047857] disabled:opacity-50"
      >
        {pending
          ? "Creating…"
          : invite
            ? "Join household"
            : "Create household"}
      </button>
    </form>
  );
}
