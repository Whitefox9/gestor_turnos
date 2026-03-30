import { RotateCcw, WandSparkles } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { ShiftKind } from "@/shared/types/scheduling.types";

export function SchedulingActionBar({
  currentPlanningDate,
  currentPlanningShift,
  activeModuleName,
  onAutoAssign,
  onResetAssignments,
  isSimulating = false,
}: {
  currentPlanningDate: string;
  currentPlanningShift: ShiftKind;
  activeModuleName?: string | null;
  onAutoAssign: () => void;
  onResetAssignments: () => void;
  isSimulating?: boolean;
}) {
  return (
    <section className="sticky top-24 z-20 rounded-3xl border border-slate-200 bg-white/88 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Acciones de jornada</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="info">
              {formatDate(currentPlanningDate)} · {getShiftLabel(currentPlanningShift)}
            </Badge>
            {activeModuleName ? <Badge variant="secondary">Vista: {activeModuleName}</Badge> : null}
            <span className="text-sm text-slate-500">
              Autoasignar y devolver trabajan sobre el día activo completo, aunque estés viendo una dependencia específica.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => onResetAssignments()} disabled={isSimulating}>
            <RotateCcw className="h-4 w-4" />
            Devolver todo
          </Button>
          <Button onClick={() => onAutoAssign()} disabled={isSimulating}>
            <WandSparkles className="h-4 w-4" />
            Autoasignar día
          </Button>
        </div>
      </div>
    </section>
  );
}

function getShiftLabel(shift: ShiftKind) {
  if (shift === "manana") {
    return "Mañana";
  }
  if (shift === "tarde") {
    return "Tarde";
  }
  if (shift === "noche") {
    return "Noche";
  }
  if (shift === "noche_larga") {
    return "Noche larga";
  }
  return "Libre";
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
