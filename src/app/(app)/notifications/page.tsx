export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-[#efece9] bg-white px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f2ef] text-[#a8a29e]">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </span>
      <div className="mt-4 text-[15px] font-semibold text-[#1c1917]">
        No notifications yet
      </div>
      <div className="mt-1 text-[13px] leading-[1.5] text-[#a8a29e]">
        Due-soon reminders and completion updates arrive in Phase 8.
      </div>
    </div>
  );
}
