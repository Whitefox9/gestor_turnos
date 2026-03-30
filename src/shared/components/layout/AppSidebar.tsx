import { Building2, Menu, PanelLeftClose } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useUIStore } from "@/app/store/ui.store";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { useRoleNavigation } from "@/shared/hooks/useRoleNavigation";

export function AppSidebar() {
  const items = useRoleNavigation();
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 h-screen shrink-0 self-start overflow-y-auto border-r border-slate-200/80 bg-white/88 text-slate-700 shadow-[10px_0_30px_-24px_rgba(15,23,42,0.3)] backdrop-blur-xl transition-all",
        sidebarOpen ? "w-[248px]" : "w-[72px]",
      )}
    >
      <div className={cn("flex h-full flex-col px-2 py-3", sidebarOpen ? "gap-5" : "items-center gap-4")}>
        <div className={cn("flex items-center", sidebarOpen ? "justify-between px-2" : "flex-col gap-4")}>
          <Button variant="ghost" size="sm" className="h-10 w-10 rounded-2xl p-0" onClick={toggleSidebar}>
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4 text-slate-500" /> : <Menu className="h-4 w-4 text-slate-500" />}
          </Button>

          {sidebarOpen ? (
            <div className="ml-2 flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-primary shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">Turnos Health</p>
                <Badge variant="info" className="mt-1">
                  MVP Planner
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-primary shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
          )}
        </div>

        <nav className={cn("flex flex-1 flex-col", sidebarOpen ? "gap-2" : "items-center gap-3")}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "transition",
                    sidebarOpen
                      ? cn(
                          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium",
                          isActive
                            ? "bg-blue-50 text-blue-700 shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )
                      : cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl border",
                          isActive
                            ? "border-blue-200 bg-blue-100 text-blue-700 shadow-sm"
                            : "border-transparent bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-100",
                        ),
                  )
                }
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
