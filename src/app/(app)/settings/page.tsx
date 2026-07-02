import { redirect } from "next/navigation";
import { getCurrentUser, destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#efece9] bg-white p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]">
          Signed in as
        </div>
        <div className="mt-1 text-[16px] font-semibold text-[#1c1917]">
          {user?.displayName ?? "—"}
        </div>
      </div>
      <p className="px-1 text-[13px] text-[#a8a29e]">
        Home Assistant connection and password change arrive in a later phase.
      </p>
      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-xl border border-[#e7e5e4] bg-white py-2.5 text-sm font-medium text-[#57534e]"
        >
          Sign out {user ? `(${user.displayName})` : ""}
        </button>
      </form>
    </div>
  );
}
