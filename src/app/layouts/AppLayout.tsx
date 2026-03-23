import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/shared/components/layout/AppSidebar";
import { TopNavbar } from "@/shared/components/layout/TopNavbar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <TopNavbar />
        <main className="min-h-[calc(100vh-5rem)] p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
