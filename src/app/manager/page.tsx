import { AppShell } from "@/components/layout/AppShell";
import { ManagerDashboard } from "@/components/manager";

export default function ManagerPage() {
  return (
    <AppShell
      title="Pending approvals"
      subtitle="Each card loads a live per-location balance from HCM so you can decide with current data. Approve re-validates balance server-side; a conflict means the request stays pending."
      activeNav="manager"
    >
      <div className="w-full max-w-lg">
        <ManagerDashboard />
      </div>
    </AppShell>
  );
}
