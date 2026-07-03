import {
  listNotifications,
  relativeTime,
  SEVERITY_COLOR,
} from "@/lib/notifications";
import { MarkAllRead } from "@/components/mark-all-read";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  const notifs = listNotifications();
  const hasUnread = notifs.some((n) => !n.read);
  const now = new Date();

  if (notifs.length === 0) {
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
          No notifications
        </div>
        <div className="mt-1 text-[13px] leading-[1.5] text-[#a8a29e]">
          Due-soon reminders and completion updates will show up here.
        </div>
      </div>
    );
  }

  return (
    <div>
      {hasUnread && <MarkAllRead />}
      <ul className="flex flex-col gap-[6px]">
        {notifs.map((n) => (
          <li
            key={n.id}
            data-notification
            data-severity={n.severity}
            data-read={n.read ? "true" : "false"}
            className={`flex gap-3 rounded-[13px] px-3 py-[13px] ${
              n.read ? "bg-transparent" : "bg-white"
            }`}
          >
            <span
              data-dot
              className="mt-[5px] h-[9px] w-[9px] flex-none rounded-full"
              style={{ background: SEVERITY_COLOR[n.severity] }}
            />
            <div className="flex-1">
              <div
                className="text-[14px] leading-[1.4] text-[#1c1917]"
                style={{ fontWeight: n.read ? 400 : 600 }}
              >
                {n.text}
              </div>
              <div className="mt-[3px] text-[11px] text-[#a8a29e]">
                {relativeTime(n.createdAt, now)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
