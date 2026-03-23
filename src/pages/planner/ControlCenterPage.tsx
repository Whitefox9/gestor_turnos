import {
  Layers3,
} from "lucide-react";
import { useControlCenterSummary } from "@/features/dashboard/hooks/useControlCenterSummary";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { PlannerTopBar } from "@/shared/components/layout/PlannerTopBar";
import { CriticalPanel } from "@/features/dashboard/components/CriticalPanel";
import { AlertsPanel } from "@/features/dashboard/components/AlertsPanel";
import { PendingIncidentsPanel } from "@/features/dashboard/components/PendingIncidentsPanel";
import { AISuggestionsPanel } from "@/features/dashboard/components/AISuggestionsPanel";
import { ShiftBoxOverviewPanel } from "@/features/dashboard/components/ShiftBoxOverviewPanel";

export function ControlCenterPage() {
  const { data, isLoading } = useControlCenterSummary();

  if (isLoading || !data) {
    return <LoadingState label="Cargando centro de control..." />;
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/80 shadow-soft backdrop-blur">
        <PlannerTopBar
          periodLabel="Abril 2026"
          coverage={`${data.coverageRate}%`}
          alertsCount={data.criticalAlerts}
          incidentsCount={data.latestIncidents.length}
          unassignedCount={data.vacancies}
          peopleCount={300}
          rulesAlertsCount={16}
          searchedShiftsCount={11}
        />

        <div className="border-b border-slate-200/80 px-5 py-5 xl:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Centro de control</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Vista operativa del planificador</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Monitorea cobertura, alertas, novedades y sugerencias IA desde una composicion pensada para decisiones rapidas.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-xl px-3 py-1.5">
              <Layers3 className="mr-2 h-3.5 w-3.5" />
              Interfaz de decisiones
            </Badge>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 xl:grid-cols-4 xl:px-6">
          <CriticalPanel criticalCount={data.criticalAlerts} />
          <AlertsPanel alertsCount={data.attendanceRisk} />
          <PendingIncidentsPanel incidents={data.latestIncidents} />
          <AISuggestionsPanel insights={data.insights} />
        </div>

        <div className="border-t border-slate-200/80 bg-slate-50/80 px-5 py-5 xl:px-6">
          <ShiftBoxOverviewPanel />
        </div>
      </section>
    </div>
  );
}
