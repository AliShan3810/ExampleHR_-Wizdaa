import Link from "next/link";

export type AppShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  activeNav: "employee" | "manager";
};

function NavIconTimeOff({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function NavIconInbox({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  activeNav,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-app-gradient">
      <header className="border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md shadow-emerald-600/25"
              aria-hidden
            >
              HR
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700/90">
                Example HR
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-600">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          <nav
            className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/60 p-1 shadow-inner"
            aria-label="Main"
          >
            <Link
              href="/"
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition",
                activeNav === "employee"
                  ? "bg-white text-slate-900 shadow-md shadow-slate-300/30 ring-1 ring-emerald-200/60"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
              ].join(" ")}
            >
              <NavIconTimeOff
                className={activeNav === "employee" ? "text-emerald-600" : "text-slate-400"}
              />
              Time off
            </Link>
            <Link
              href="/manager"
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition",
                activeNav === "manager"
                  ? "bg-white text-slate-900 shadow-md shadow-slate-300/30 ring-1 ring-emerald-200/60"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
              ].join(" ")}
            >
              <NavIconInbox
                className={activeNav === "manager" ? "text-emerald-600" : "text-slate-400"}
              />
              Approvals
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
