import Link from "next/link";

export type AppShellProps = {
  children: React.ReactNode;
  /** Page title shown under the nav */
  title: string;
  /** Optional subtitle under the title */
  subtitle?: string;
  /** Which nav item is active */
  activeNav: "employee" | "manager";
};

export function AppShell({
  children,
  title,
  subtitle,
  activeNav,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50/80">
      <header className="border-b border-neutral-200/80 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Example HR
            </p>
            <h1 className="mt-0.5 text-lg font-semibold text-neutral-900 sm:text-xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
            ) : null}
          </div>
          <nav
            className="flex flex-wrap items-center gap-1 rounded-lg bg-neutral-100/80 p-1 text-sm"
            aria-label="Main"
          >
            <Link
              href="/"
              className={[
                "rounded-md px-3 py-1.5 font-medium transition",
                activeNav === "employee"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900",
              ].join(" ")}
            >
              Time off
            </Link>
            <Link
              href="/manager"
              className={[
                "rounded-md px-3 py-1.5 font-medium transition",
                activeNav === "manager"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900",
              ].join(" ")}
            >
              Approvals
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
