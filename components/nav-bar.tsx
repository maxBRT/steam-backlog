"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquareKanban, ListFilter } from "lucide-react";

const PAGES = {
  kanban: { href: "/kanban", label: "Kanban", Icon: SquareKanban },
  triage: { href: "/triage", label: "Triage", Icon: ListFilter },
} as const;

export function NavBar() {
  const pathname = usePathname();
  const active = pathname.startsWith("/triage") ? "triage" : "kanban";
  const other = active === "kanban" ? "triage" : "kanban";

  const Active = PAGES[active];
  const Other = PAGES[other];

  return (
    <nav className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        {/* inactive section: click to swap in and navigate */}
        <Link
          href={Other.href}
          aria-label={Other.label}
          className="text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
        >
          <Other.Icon className="size-5" />
        </Link>

        <span className="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />

        {/* active section sits next to the wordmark */}
        <Link
          href={Active.href}
          aria-label={Active.label}
          className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50"
        >
          <Active.Icon className="size-5" />
          <span className="font-[family-name:var(--font-wordmark)] text-lg font-bold tracking-tight">
            Log
          </span>
        </Link>
    </nav>
  );
}
