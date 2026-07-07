import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Marketing landing page (public). Logged-in residents go straight to the app. */
export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-[#e7e5e4] text-[#1c1917]">
      <SiteNav />

      {/* Hero */}
      <header className="mx-auto max-w-[1060px] px-6 pt-16 pb-12 md:pt-20">
        <div className="grid items-center gap-10 md:grid-cols-[1.08fr_0.92fr] md:gap-12">
          <div>
            <h1 className="font-serif text-[42px] leading-[1.04] tracking-[-0.02em] text-balance md:text-[58px]">
              Everything about your home, in one place.
            </h1>
            <p className="mt-5 max-w-[34em] text-[17px] leading-[1.6] text-[#57534e] md:text-[19px]">
              The maintenance schedule is in a spreadsheet, the receipts in Google
              Drive, the wifi password in 1Password, the to-dos in Apple Notes.
              Homebase brings home upkeep, groceries, appliances, purchases, and
              documents together — shared with whoever you live with.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/signup"
                className="rounded-[12px] bg-[#059669] px-6 py-3.5 text-[16px] font-bold text-white transition hover:bg-emerald-700"
              >
                Get started — free
              </Link>
              <span className="text-[14px] text-[#a8a29e]">
                Set it up in a minute. Invite your partner with a link.
              </span>
            </div>
          </div>
          <Phone src="/marketing/dashboard.png" alt="Homebase dashboard" priority />
        </div>
      </header>

      {/* Feature rows */}
      <main id="what" className="mx-auto max-w-[1060px] px-6">
        <Feature
          label="Maintenance"
          title="Home upkeep on a schedule."
          img="/marketing/upkeep.png"
          alt="Upkeep list with due dates"
        >
          Add recurring tasks — clean the mini-split filters, test the smoke
          alarms, descale the kettle. Homebase works out when each one is next
          due, flags what&rsquo;s overdue, and logs it the moment you tap Done. It
          also keeps a history of who did what and when.
        </Feature>

        <Feature
          reverse
          label="Calendar & meals"
          title="Plan the week in one place."
          img="/marketing/plan.png"
          alt="Monthly calendar"
        >
          A shared month view with events, chores, and upcoming maintenance
          together. Plan the week&rsquo;s dinners on the meals tab, and send a
          meal&rsquo;s ingredients straight to the grocery list.
        </Feature>

        <Feature
          label="Groceries"
          title="A grocery list you both edit."
          img="/marketing/shop.png"
          alt="Grocery list grouped by aisle"
        >
          Grouped by aisle and synced in real time, so whoever&rsquo;s at the
          store sees what the other just added. Save the staples you always run
          out of and add them back with one tap.
        </Feature>

        <Feature
          reverse
          label="Appliances & documents"
          title="Keep track of what you own."
          img="/marketing/inventory.png"
          alt="Appliance inventory with warranty dates"
        >
          Log your appliances with brand, model, serial, and warranty dates — the
          warranty shows green while it&rsquo;s still covered. Store the manuals,
          receipts, and closing papers alongside them, and keep a wishlist of
          things to buy with a running total of what you&rsquo;ve committed to.
        </Feature>

        <Feature
          label="Smart home & Claude"
          title="Your thermostat and your AI, built in."
          img="/marketing/smart.png"
          alt="Home Assistant tiles"
        >
          Connect Home Assistant to see temperatures, lock the door, and adjust
          the thermostat right from the dashboard. Connect Claude to add
          groceries, check what&rsquo;s due, or plan dinner just by asking.
        </Feature>
      </main>

      {/* Secondary features */}
      <section className="mt-8 border-y border-[#e7e2dc] bg-white">
        <div className="mx-auto max-w-[1060px] px-6 py-14">
          <h2 className="font-serif text-[24px] tracking-[-0.01em] md:text-[31px]">
            And the rest of it.
          </h2>
          <div className="mt-7 grid gap-px overflow-hidden rounded-[16px] border border-[#e7e2dc] bg-[#e7e2dc] sm:grid-cols-2 md:grid-cols-3">
            {SECONDARY.map((item) => (
              <div key={item.title} className="bg-white p-5">
                <h3 className="text-[16px] font-bold">{item.title}</h3>
                <p className="mt-1.5 text-[14px] leading-[1.55] text-[#57534e]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-[1060px] px-6 py-16 text-center md:py-20">
        <h2 className="font-serif text-[28px] tracking-[-0.015em] text-balance md:text-[40px]">
          Set up your household in a minute.
        </h2>
        <p className="mx-auto mt-4 max-w-[34em] text-[17px] leading-[1.6] text-[#57534e]">
          Create an account, invite your partner, and start from a ready-made
          sample home you can edit into your own.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <Link
            href="/signup"
            className="rounded-[12px] bg-[#059669] px-6 py-3.5 text-[16px] font-bold text-white transition hover:bg-emerald-700"
          >
            Get started — free
          </Link>
          <span className="text-[14px] text-[#a8a29e]">No credit card.</span>
        </div>
      </section>

      <footer className="border-t border-[#e7e2dc]">
        <div className="mx-auto flex max-w-[1060px] flex-wrap items-center justify-between gap-3 px-6 py-8 text-[14px] text-[#a8a29e]">
          <span className="font-serif text-[18px] text-[#1c1917]">Homebase</span>
          <span>homebase.casa</span>
        </div>
      </footer>
    </div>
  );
}

function SiteNav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-[#e7e2dc] bg-[rgba(231,229,228,0.85)] backdrop-blur-[9px]">
      <div className="mx-auto flex max-w-[1060px] items-center justify-between px-6 py-3.5">
        <span className="font-serif text-[22px] tracking-[-0.01em]">Homebase</span>
        <div className="flex items-center gap-5 text-[14.5px] font-semibold text-[#57534e]">
          <a href="#what" className="hidden hover:text-[#1c1917] sm:inline">
            What it does
          </a>
          <Link href="/login" className="hover:text-[#1c1917]">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-[11px] bg-[#059669] px-4 py-2.5 text-white transition hover:bg-emerald-700"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Feature({
  label,
  title,
  img,
  alt,
  reverse = false,
  children,
}: {
  label: string;
  title: string;
  img: string;
  alt: string;
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-center gap-8 py-10 md:grid-cols-2 md:gap-12">
      <div className={reverse ? "md:order-2" : ""}>
        <div className="text-[13px] font-bold tracking-[0.04em] text-[#047857]">
          {label}
        </div>
        <h2 className="mt-2.5 font-serif text-[25px] leading-[1.14] tracking-[-0.015em] text-balance md:text-[34px]">
          {title}
        </h2>
        <p className="mt-3.5 max-w-[34em] text-[16px] leading-[1.6] text-[#57534e]">
          {children}
        </p>
      </div>
      <div className={`flex justify-center ${reverse ? "md:order-1" : ""}`}>
        <Phone src={img} alt={alt} />
      </div>
    </div>
  );
}

function Phone({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="w-[288px] rounded-[40px] bg-[#2a2521] p-2.5 shadow-[0_2px_6px_rgba(28,25,23,0.10),0_26px_54px_-22px_rgba(28,25,23,0.32)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className="block w-full rounded-[31px]"
      />
    </div>
  );
}

const SECONDARY: { title: string; body: string }[] = [
  {
    title: "Tasks",
    body: "Shared to-dos you can assign to either of you or leave open, with optional due dates.",
  },
  {
    title: "Wishlist",
    body: "Track purchases from considering to ordered to delivered, with prices and links, by room.",
  },
  {
    title: "Contacts",
    body: "Your super, plumber, and electrician in one place — tap to call or email.",
  },
  {
    title: "Documents",
    body: "Upload manuals, receipts, and lease or closing papers; download them from any device.",
  },
  {
    title: "Notifications",
    body: "A daily sweep for what's overdue or due soon, plus a badge when something needs you.",
  },
  {
    title: "Two accounts, one home",
    body: "Both of you get your own login and share the same household. No per-seat pricing.",
  },
];
