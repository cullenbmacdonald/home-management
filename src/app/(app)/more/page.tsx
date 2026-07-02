import Link from "next/link";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

const links = [
  { href: "/inventory", label: "Inventory", desc: "Appliances, models, warranties", icon: "📦" },
  { href: "/documents", label: "Documents", desc: "Manuals, closing docs, receipts", icon: "📄" },
  { href: "/vendors", label: "Contacts", desc: "Plumber, super, HVAC, electrician", icon: "📇" },
];

export default async function MorePage() {
  const user = await getCurrentUser();

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">More</h1>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <span className="text-2xl">{l.icon}</span>
              <span>
                <span className="block font-medium">{l.label}</span>
                <span className="block text-xs text-stone-500">{l.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <form action={logout} className="pt-4">
        <button
          type="submit"
          className="w-full rounded-lg border border-stone-300 py-2.5 text-sm font-medium text-stone-600"
        >
          Sign out {user ? `(${user.displayName})` : ""}
        </button>
      </form>
    </div>
  );
}
