"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
    { href: "/", label: "Home" },
    { href: "/auth/login", label: "Login" },
    { href: "/auth/sign-up", label: "Sign up" },
] as const;

export function PublicNav() {
    const pathname = usePathname();

    return (
        <header className="flex items-center justify-between px-4 py-4 sm:px-6">
            <Link
                href="/"
                className="font-(family-name:--font-wordmark) text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
                Log
            </Link>

            <nav className="flex items-center gap-1">
                {LINKS.map(({ href, label }) => {
                    const active =
                        href === "/" ? pathname === "/" : pathname.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={
                                active
                                    ? "rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50"
                                    : "rounded-lg px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                            }
                        >
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
