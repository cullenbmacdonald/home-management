"use client";

import { usePathname } from "next/navigation";

/**
 * Re-runs a subtle fade+slide animation on the main content whenever the route
 * changes, by keying the wrapper on the pathname. Animation is skipped for
 * users who prefer reduced motion (handled in globals.css).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-transition">
      {children}
    </div>
  );
}
