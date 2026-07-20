import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-[#efece9] bg-white p-4";
const HEADING =
  "text-[11px] font-bold uppercase tracking-[0.06em] text-[#a8a29e]";

/** One documented destination in the app. */
function PageEntry({
  name,
  where,
  children,
}: {
  name: string;
  where: string;
  children: ReactNode;
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[#1c1917]">{name}</h3>
        <span className="flex-none text-[11px] text-[#a8a29e]">{where}</span>
      </div>
      <p className="mt-1 text-[13px] leading-[1.55] text-[#57534e]">{children}</p>
    </div>
  );
}

/** Numbered step in the Claude/MCP setup walkthrough. */
function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#ecfdf5] text-[12px] font-bold text-[#059669]">
        {n}
      </span>
      <span className="text-[13px] leading-[1.55] text-[#57534e]">
        {children}
      </span>
    </li>
  );
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-[#f5f2ef] px-1.5 py-0.5 font-mono text-[12px] text-[#1c1917]">
    {children}
  </code>
);

export default function HelpPage() {
  return (
    <div className="space-y-6 pb-4">
      {/* Intro */}
      <section className="space-y-2">
        <div className={CARD}>
          <h1 className="text-[18px] font-semibold text-[#1c1917]">
            Welcome to Homebase
          </h1>
          <p className="mt-1.5 text-[13px] leading-[1.55] text-[#57534e]">
            Homebase is a shared home for everything your household runs on —
            what needs doing, what needs buying, what needs fixing, and the
            paperwork behind it all. Everyone in your household sees the same
            up-to-date list. This page explains what each screen does and how to
            connect Claude so you can manage things by just asking.
          </p>
        </div>
      </section>

      {/* The screens */}
      <section className="space-y-2">
        <h2 className={`${HEADING} mx-1`}>The screens</h2>
        <div className={`${CARD} divide-y divide-[#efece9]`}>
          <PageEntry name="Home" where="bottom bar">
            Your daily glance — a summary of what&apos;s open across the
            household: upcoming upkeep, today&apos;s plan, and the grocery list.
            Start here.
          </PageEntry>
          <PageEntry name="Upkeep" where="bottom bar">
            Recurring home care — filters, smoke detectors, gutters, anything on
            a schedule. Each item tracks when it was last done and flags when
            it&apos;s due or overdue. Add an item and set how often it repeats.
          </PageEntry>
          <PageEntry name="Plan" where="bottom bar">
            A shared calendar and meal planner. Add dates, events, and chores,
            and plan what you&apos;re eating each day — whether you&apos;re
            cooking or going out. Ingredients you attach to a meal can flow
            straight onto the grocery list.
          </PageEntry>
          <PageEntry name="Shop" where="bottom bar">
            This week&apos;s grocery list. Add items by category, check them off
            as you shop, and clear them when you&apos;re done.
          </PageEntry>
          <PageEntry name="Staples" where="Shop → Staples">
            Your household&apos;s reusable pool of things you always keep on hand
            (milk, paper towels, coffee). &ldquo;Restock&rdquo; drops any missing
            staples onto the grocery list in one tap.
          </PageEntry>
          <PageEntry name="Tasks" where="More → Tasks">
            The household to-do list. Create a task, assign it to someone, give
            it a due date, and check it off when it&apos;s done.
          </PageEntry>
          <PageEntry name="Wishlist" where="More → Wishlist">
            Things you want for the home — track them from idea through ordered
            to delivered.
          </PageEntry>
          <PageEntry name="Inventory" where="More → Inventory">
            A record of what you own and where it lives — useful for warranties,
            spare parts, and knowing what you already have.
          </PageEntry>
          <PageEntry name="Documents" where="More → Documents">
            Store household paperwork — leases, manuals, receipts, insurance —
            so it&apos;s in one place instead of scattered across inboxes.
          </PageEntry>
          <PageEntry name="Contacts" where="More → Contacts">
            Your vendors and service providers — plumber, super, cleaner,
            handyman — with the details you need to reach them.
          </PageEntry>
          <PageEntry name="Home Assistant" where="More → Home">
            If you run Home Assistant, connect it in Settings to see live tiles
            for your smart-home devices right inside Homebase.
          </PageEntry>
          <PageEntry name="Notifications" where="bell icon">
            Recent activity plus alerts for upkeep that&apos;s due soon or
            overdue. Homebase checks once a day and posts anything that needs
            attention.
          </PageEntry>
          <PageEntry name="Settings" where="More → Settings">
            Your account and household — residents, password, Home Assistant
            connection, and the apps connected to your household (see below).
          </PageEntry>
        </div>
      </section>

      {/* Connect Claude */}
      <section className="space-y-2">
        <h2 className={`${HEADING} mx-1`}>Connect Claude</h2>
        <div className={CARD}>
          <p className="text-[13px] leading-[1.55] text-[#57534e]">
            Homebase can connect to Claude (Desktop or Code) so you can manage
            your household by just asking — &ldquo;add milk to the grocery
            list,&rdquo; &ldquo;what&apos;s overdue?,&rdquo; &ldquo;plan tacos for
            Friday.&rdquo; The connection is secured with a sign-in flow, and you
            can revoke it any time from Settings.
          </p>

          <h3 className="mt-4 text-[13px] font-semibold text-[#1c1917]">
            Claude Desktop
          </h3>
          <ol className="mt-2 space-y-2.5">
            <Step n={1}>
              Open Claude Desktop and go to{" "}
              <Code>Settings → Connectors → Add custom connector</Code>.
            </Step>
            <Step n={2}>
              Give it a name (e.g. &ldquo;Homebase&rdquo;) and paste your
              Homebase MCP URL, which ends in <Code>/api/mcp</Code> — for example{" "}
              <Code>https://homebase.cullenmacdonald.com/api/mcp</Code>.
            </Step>
            <Step n={3}>
              A Homebase sign-in window opens. Log in with your household
              account and approve access.
            </Step>
            <Step n={4}>
              Done — ask Claude to check or update your household. It appears
              under <Code>Connected apps</Code> in Settings.
            </Step>
          </ol>

          <h3 className="mt-4 text-[13px] font-semibold text-[#1c1917]">
            Claude Code
          </h3>
          <ol className="mt-2 space-y-2.5">
            <Step n={1}>
              Run{" "}
              <Code>
                claude mcp add --transport http homebase
                https://homebase.cullenmacdonald.com/api/mcp
              </Code>{" "}
              (use your own Homebase URL).
            </Step>
            <Step n={2}>
              The first time you use it, Claude opens the Homebase sign-in flow
              in your browser. Log in and approve.
            </Step>
            <Step n={3}>
              You&apos;re connected — ask Claude to read or change anything in
              your household.
            </Step>
          </ol>
        </div>
      </section>

      {/* What Claude can do */}
      <section className="space-y-2">
        <h2 className={`${HEADING} mx-1`}>What Claude can do</h2>
        <div className={CARD}>
          <p className="text-[13px] leading-[1.55] text-[#57534e]">
            Once connected, Claude works with the same household data you see in
            the app. You don&apos;t need to learn commands — just describe what
            you want.
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-[12px] font-semibold text-[#059669]">
                Look things up
              </div>
              <p className="mt-0.5 text-[13px] leading-[1.5] text-[#57534e]">
                Tasks, groceries, staples, the meal plan, calendar events,
                inventory, upkeep (with what&apos;s due or overdue), contacts,
                the wishlist, or a quick overall summary of the household.
              </p>
            </div>
            <div>
              <div className="text-[12px] font-semibold text-[#059669]">
                Make changes
              </div>
              <p className="mt-0.5 text-[13px] leading-[1.5] text-[#57534e]">
                Add and update tasks or mark them done; add, check off, or remove
                grocery items; restock staples in one go; plan a meal for a day
                (and add its ingredients to the list); and add calendar events,
                dates, or chores.
              </p>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-[1.5] text-[#a8a29e]">
            Changes Claude makes show up in the app right away, and vice-versa —
            it&apos;s all the same household.
          </p>
        </div>
      </section>

      {/* Managing access */}
      <section className="space-y-2">
        <h2 className={`${HEADING} mx-1`}>Managing access</h2>
        <div className={`${CARD} text-[13px] leading-[1.55] text-[#57534e]`}>
          Every connected app is listed under{" "}
          <Code>Settings → Connected apps</Code>, along with when it was last
          used. Tap <span className="font-medium text-[#dc2626]">Revoke</span> to
          disconnect an app at any time — it immediately loses access to your
          household until you connect it again.
        </div>
      </section>
    </div>
  );
}
