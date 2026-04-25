import { EmployeeDashboard } from "@/components/employee";
import { AppShell } from "@/components/layout/AppShell";

export default function Home() {
  return (
    <AppShell
      title="Time off"
      subtitle="View your balance for the selected work location and submit a request. Balances are owned by HCM; we sync on a short interval and when you act."
      activeNav="employee"
    >
      <div className="mx-auto w-full max-w-md">
        <EmployeeDashboard employeeId="emp-1" locationId="loc-1" />
      </div>
      <p className="mx-auto mt-10 max-w-md text-center text-xs leading-relaxed text-slate-500">
        Demo: employee{" "}
        <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-slate-700 shadow-sm">
          emp-1
        </code>
        , location{" "}
        <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-slate-700 shadow-sm">
          loc-1
        </code>
        . With{" "}
        <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-slate-700 shadow-sm">
          NEXT_PUBLIC_ENABLE_MSW=true
        </code>
        , MSW can intercept fetches; otherwise the in-memory HCM API runs in Next.
      </p>
    </AppShell>
  );
}
