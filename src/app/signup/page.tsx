import Link from "next/link";
import { households } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { findValidInvite } from "@/lib/invites";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite: code } = await searchParams;

  let invite: { code: string; householdName: string } | null = null;
  let inviteError: string | null = null;
  if (code) {
    const row = await findValidInvite(code);
    if (!row) {
      inviteError = "That invite link is invalid or has expired.";
    } else {
      const hh = (
        await db
          .select({ name: households.name })
          .from(households)
          .where(eq(households.id, row.householdId))
          .limit(1)
      )[0];
      invite = { code, householdName: hh?.name ?? "your household" };
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#e7e5e4] p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-[#efece9] bg-white p-8 shadow-[0_0_60px_rgba(0,0,0,0.08)]">
        <div className="text-center">
          <h1 className="font-serif text-[34px] leading-none text-[#1c1917]">
            Homebase
          </h1>
          <p className="mt-2 text-sm text-[#a8a29e]">
            {invite
              ? `Join ${invite.householdName}`
              : "Create your household."}
          </p>
        </div>

        {inviteError ? (
          <p className="text-sm text-[#dc2626]">{inviteError}</p>
        ) : (
          <SignupForm invite={invite} />
        )}

        <p className="text-center text-sm text-[#a8a29e]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#059669]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
