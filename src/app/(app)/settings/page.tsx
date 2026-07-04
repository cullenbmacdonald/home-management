import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { getStates, isHaConfigured } from "@/lib/ha";
import { HaConfigForm, PasswordForm } from "@/components/settings-forms";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-[#efece9] bg-white p-4";
const HEADING =
  "text-[11px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ["haBaseUrl", "haToken", "haEntities"]));
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
    string,
    string | undefined
  >;
  const baseUrl = map.haBaseUrl ?? "";
  const tokenSaved = Boolean(map.haToken);
  let entities = "";
  try {
    const parsed = JSON.parse(map.haEntities ?? "[]");
    if (Array.isArray(parsed)) entities = parsed.join("\n");
  } catch {
    entities = "";
  }

  const configured = await isHaConfigured();
  const connection = configured ? await getStates() : null;
  const connectionOk = connection?.ok ?? false;

  const initial = (user?.displayName ?? "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-4">
      {/* Account */}
      <section className="space-y-2">
        <h2 className={`${HEADING} mx-1`}>Account</h2>
        <div className={CARD}>
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[16px] font-bold text-white"
              style={{ background: user?.accentColor ?? "#059669" }}
            >
              {initial}
            </span>
            <div className="min-w-0">
              <div className="text-[16px] font-semibold text-[#1c1917]">
                {user?.displayName ?? "—"}
              </div>
              <div className="text-[13px] text-[#a8a29e]">
                @{user?.username ?? "—"}
              </div>
            </div>
          </div>
          <form action={logout} className="mt-4">
            <button
              type="submit"
              className="w-full rounded-xl border border-[#e7e5e4] bg-white py-2.5 text-sm font-medium text-[#57534e]"
            >
              Sign out{user ? ` (${user.displayName})` : ""}
            </button>
          </form>
        </div>
      </section>

      {/* Password */}
      <section className="space-y-2">
        <h2 className={`${HEADING} mx-1`}>Change password</h2>
        <div className={CARD}>
          <PasswordForm />
        </div>
      </section>

      {/* Home Assistant */}
      <section className="space-y-2">
        <div className="mx-1 flex items-center justify-between">
          <h2 className={HEADING}>Home Assistant</h2>
          {configured && (
            <span
              data-ha-connection
              className="text-[11px] font-bold"
              style={{ color: connectionOk ? "#059669" : "#dc2626" }}
            >
              {connectionOk ? "Connection: OK" : "Connection: failed"}
            </span>
          )}
        </div>
        <div className={CARD}>
          <HaConfigForm
            baseUrl={baseUrl}
            entities={entities}
            tokenSaved={tokenSaved}
          />
        </div>
      </section>

      {/* Notifications */}
      <section className="space-y-2">
        <h2 className={`${HEADING} mx-1`}>Notifications</h2>
        <div className={`${CARD} text-[13px] leading-[1.5] text-[#78716c]`}>
          Homebase generates in-app notifications for overdue and upcoming
          upkeep and for completed activity. Push notifications are not yet
          available.
        </div>
      </section>

      {/* Backup */}
      <section className="space-y-2">
        <h2 className={`${HEADING} mx-1`}>Backup</h2>
        <div className={`${CARD} text-[13px] leading-[1.5] text-[#78716c]`}>
          App data lives in your Postgres database; uploaded documents live in
          the <code>/data</code> volume. Back up both and you have backed up the
          entire app.
        </div>
      </section>
    </div>
  );
}
