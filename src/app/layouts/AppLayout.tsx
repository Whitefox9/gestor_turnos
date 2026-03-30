import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/shared/components/layout/AppSidebar";
import { TopNavbar } from "@/shared/components/layout/TopNavbar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_22%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.9))]">
      <AppSidebar />
      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="min-h-0 flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
