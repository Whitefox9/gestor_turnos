import { useMemo } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import type { Employee } from "@/shared/types/employee.types";
import type { CareModule } from "@/shared/types/module.types";
import type { Rule } from "@/shared/types/rule.types";
import type { ShiftAssignment, ShiftKind } from "@/shared/types/scheduling.types";
import { DraggableEmployeeCard } from "./DraggableEmployeeCard";
import { getEmployeeWeekStats, getMockAssignmentScore, isEmployeeCompatibleWithModule } from "../services/scheduling.service";

export function EmployeeListPanel({
  employees,
  modules,
  activeRules,
  hoveredModuleId,
  onQuickAssign,
  weeklyAssignments,
  weekStartDate,
  planningDate,
  planningShift,
}: {
  employees: Employee[];
  modules: CareModule[];
  activeRules: Rule[];
  hoveredModuleId?: string | null;
  onQuickAssign: (employeeId: string, moduleId: string) => void;
  weeklyAssignments: ShiftAssignment[];
  weekStartDate: string;
  planningDate: string;
  planningShift: ShiftKind;
}) {
  const hoveredModule = modules.find((module) => module.id === hoveredModuleId);
  const topRecommendationRanks = useMemo(() => {
    if (!hoveredModule) {
      return new Map<string, number>();
    }

    return new Map(
      [...employees]
        .filter(
          (employee) => isEmployeeCompatibleWithModule(employee, hoveredModule).compatible,
        )
        .sort((left, right) => {
          const operationalDelta = getOperationalRank(left) - getOperationalRank(right);
          if (operationalDelta !== 0) {
            return operationalDelta;
          }

          return getMockAssignmentScore(right, hoveredModule, activeRules, weeklyAssignments, planningDate, planningShift) - getMockAssignmentScore(left, hoveredModule, activeRules, weeklyAssignments, planningDate, planningShift);
        })
        .slice(0, 3)
        .map((employee, index) => [employee.id, index + 1]),
    );
  }, [activeRules, employees, hoveredModule, weeklyAssignments, planningDate, planningShift]);

  const groups = useMemo(() => {
    const grouped = {
      ready: [] as Employee[],
      attention: [] as Employee[],
      unavailable: [] as Employee[],
    };

    [...employees]
      .sort((left, right) => {
        const operationalDelta = getOperationalRank(left) - getOperationalRank(right);
        if (operationalDelta !== 0) {
          return operationalDelta;
        }

        if (!hoveredModule) {
          return left.fullName.localeCompare(right.fullName);
        }

        const leftCompatible = isEmployeeCompatibleWithModule(left, hoveredModule).compatible;
        const rightCompatible = isEmployeeCompatibleWithModule(right, hoveredModule).compatible;

        if (leftCompatible !== rightCompatible) {
          return leftCompatible ? -1 : 1;
        }

        if (!leftCompatible && !rightCompatible) {
          return left.fullName.localeCompare(right.fullName);
        }

        return getMockAssignmentScore(right, hoveredModule, activeRules) - getMockAssignmentScore(left, hoveredModule, activeRules);
      })
      .forEach((employee) => {
        const weekStats = getEmployeeWeekStats({
          employeeId: employee.id,
          assignments: weeklyAssignments,
          weekStartDate,
        });

        if (employee.status === "off") {
          grouped.unavailable.push(employee);
          return;
        }

        if (employee.weeklyHours >= 40 || employee.assignedToday || employee.status === "busy" || weekStats.nightShifts >= 2 || weekStats.compensatoryDays === 0) {
          grouped.attention.push(employee);
          return;
        }

        grouped.ready.push(employee);
      });

    return [
      {
        id: "ready",
        title: "Listos para asignar",
        description: "Perfiles disponibles con mejor contexto para decidir rápido.",
        badgeVariant: "success" as const,
        items: grouped.ready,
      },
      {
        id: "attention",
        title: "Requieren revisión",
        description: "Carga alta, asignación previa o disponibilidad menos favorable.",
        badgeVariant: "warning" as const,
        items: grouped.attention,
      },
      {
        id: "unavailable",
        title: "No disponibles",
        description: "Se mantienen visibles como contexto, pero no son prioridad operativa.",
        badgeVariant: "secondary" as const,
        items: grouped.unavailable,
      },
    ];
  }, [activeRules, employees, hoveredModule, weeklyAssignments, weekStartDate, planningDate, planningShift]);

  if (employees.length === 0) {
    return <EmptyState title="Sin resultados" description="Ajusta el filtro para encontrar perfiles disponibles." />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pool operativo</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{employees.length} visibles</Badge>
          {hoveredModule ? <Badge variant="info">Priorizando {hoveredModule.name}</Badge> : null}
          {groups.map((group) => (
            <Badge key={group.id} variant={group.badgeVariant}>
              {group.items.length} {group.title.toLowerCase()}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          La lista prioriza contexto y decisión. No depende de una enumeración plana cuando la dotación crece.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 pr-2">
        {groups
          .filter((group) => group.items.length > 0)
          .map((group) => {
            return (
              <section key={group.id} className="space-y-2.5">
                <div className="sticky top-0 z-10 rounded-2xl bg-white/95 px-1 py-1 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{group.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{group.description}</p>
                    </div>
                    <Badge variant={group.badgeVariant}>{group.items.length}</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {group.items.map((employee) => (
                    <DraggableEmployeeCard
                      key={employee.id}
                      employee={employee}
                      modules={modules}
                      activeRules={activeRules}
                      highlightLabel={
                        hoveredModule && topRecommendationRanks.has(employee.id)
                          ? `Top ${topRecommendationRanks.get(employee.id)} para ${hoveredModule.area}`
                          : undefined
                      }
                      onQuickAssign={onQuickAssign}
                      weeklyAssignments={weeklyAssignments}
                      weekStartDate={weekStartDate}
                      planningDate={planningDate}
                      planningShift={planningShift}
                    />
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}

function getOperationalRank(employee: Employee) {
  if (employee.status === "available" && !employee.assignedToday && employee.weeklyHours < 40) {
    return 0;
  }

  if (employee.status === "busy" || employee.assignedToday || employee.weeklyHours >= 40) {
    return 1;
  }

  return 2;
}
