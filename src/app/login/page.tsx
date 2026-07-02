"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, null);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-6">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800">Homebase</h1>
          <p className="mt-1 text-sm text-stone-500">Our home, managed.</p>
        </div>
        <input
          name="username"
          placeholder="Username"
          autoCapitalize="none"
          autoComplete="username"
          required
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-base focus:border-emerald-600 focus:outline-none"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-base focus:border-emerald-600 focus:outline-none"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-emerald-700 py-3 font-semibold text-white active:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
