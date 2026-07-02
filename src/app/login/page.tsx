"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#e7e5e4] p-6">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-[#efece9] bg-white p-8 shadow-[0_0_60px_rgba(0,0,0,0.08)]"
      >
        <div className="text-center">
          <h1 className="font-serif text-[34px] leading-none text-[#1c1917]">
            Homebase
          </h1>
          <p className="mt-2 text-sm text-[#a8a29e]">Our home, managed.</p>
        </div>
        <input
          name="username"
          placeholder="Username"
          autoCapitalize="none"
          autoComplete="username"
          required
          className="w-full rounded-xl border border-[#e7e5e4] px-4 py-3 text-base focus:border-[#059669] focus:outline-none"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-[#e7e5e4] px-4 py-3 text-base focus:border-[#059669] focus:outline-none"
        />
        {error && <p className="text-sm text-[#dc2626]">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[#059669] py-3 font-semibold text-white active:bg-[#047857] disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
