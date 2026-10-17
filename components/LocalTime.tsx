"use client";

import { useEffect, useState } from "react";

// Live clock in Nyazul's timezone, so a visitor elsewhere can see at a glance
// whether it's a reasonable hour to expect a reply. Renders nothing until
// mounted to avoid a server/client time mismatch.
export function LocalTime({ timeZone = "Asia/Kolkata" }: { timeZone?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [timeZone]);

  if (!time) return null;
  return <span suppressHydrationWarning>{time} IST</span>;
}
