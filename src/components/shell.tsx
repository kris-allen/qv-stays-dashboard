import Link from "next/link";
import type { AppUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export type NavItem = { href: string; label: string };

export function DashboardShell({
  title,
  user,
  nav,
  children,
}: {
  title: string;
  user: AppUser;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6"
        style={{ borderColor: "var(--viz-gridline)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: "var(--viz-text-primary)" }}>
            {title}
          </span>
          <span className="text-xs" style={{ color: "var(--viz-text-muted)" }}>
            QV Stays
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm" style={{ color: "var(--viz-text-secondary)" }}>
          <span className="hidden sm:inline">{user.seName ?? user.clientOrg ?? user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <nav
        className="flex gap-1 overflow-x-auto border-b px-4 sm:px-6"
        style={{ borderColor: "var(--viz-gridline)" }}
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: "var(--viz-text-secondary)" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
