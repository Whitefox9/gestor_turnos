import { Outlet, useLocation } from "react-router-dom";
import { Breadcrumbs } from "@/shared/components/layout/Breadcrumbs";

export function PlannerLayout() {
  const location = useLocation();

  const labels = {
    "/planner/centro-control": "Centro de control",
    "/planner/programacion": "Programacion",
    "/planner/novedades": "Novedades",
  } as const;

  return (
    <div className="mx-auto w-full max-w-[1720px] space-y-5">
      <div className="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 backdrop-blur">
        <Breadcrumbs items={["Planificador", labels[location.pathname as keyof typeof labels] ?? "Panel"]} />
      </div>
      <Outlet />
    </div>
  );
}
