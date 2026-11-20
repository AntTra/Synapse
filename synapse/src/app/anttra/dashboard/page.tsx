import Workspace from "@/components/Workspace";
import Dashboard from "./Dashboard";
export const metadata = {
  title: "Dashboard — Synapse",
  description:
    "A personal reading desk for technology, robotics, AI, and computer vision.",
};
export default function DashboardPage() {
  return (
    <Workspace>
      <Dashboard />
    </Workspace>
  );
}
