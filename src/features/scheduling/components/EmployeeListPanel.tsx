import { useMemo } from "react";
import { useUIStore } from "@/app/store/ui.store";
import { Badge } from "@/shared/components/ui/badge";
import { SearchInput } from "@/shared/components/data-display/SearchInput";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import type { Employee } from "@/shared/types/employee.types";
import type { CareModule } from "@/shared/types/module.types";
import type { Rule } from "@/shared/types/rule.types";
import type { ShiftAssignment, ShiftKind } from "@/shared/types/scheduling.types";
import { DraggableEmployeeCard } from "./DraggableEmployeeCard";
import {
  getEmployeeOperationalSignalsForContext,
  getEmployeeWeekStats,
  getMockAssignmentScore,
  isEmployeeCompatibleWithModule,
} from "../services/scheduling.service";

export function EmployeeListPanel({
  employees,
  modules,
  activeRules,
  hoveredModuleId,
  priorityModuleId,
  assignedTodayEmployeeIds,
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
  priorityModuleId?: string | null;
  assignedTodayEmployeeIds: string[];
  onQuickAssign: (employeeId: string, moduleId: string) => void;
  weeklyAssignments: ShiftAssignment[];
  weekStartDate: string;
  planningDate: string;
  planningShift: ShiftKind;
}) {
  const search = useUIStore((state) => state.schedulingSearch);
  const setSearch = useUIStore((state) => state.setSchedulingSearch);
  const assignedTodayEmployeeIdsSet = new Set(assignedTodayEmployeeIds);
  const priorityModule = modules.find((module) => module.id === priorityModuleId);
  const hoveredModule = modules.find((module) => module.id === hoveredModuleId);
  const focusModule = priorityModule ?? hoveredModule;
  const topRecommendationRanks = useMemo(() => {
    if (!focusModule) {
      return new Map<string, number>();
    }

    return new Map(
      [...employees]
        .filter((employee) => !assignedTodayEmployeeIdsSet.has(employee.id))
        .filter(
          (employee) => isEmployeeCompatibleWithModule(employee, focusModule).compatible,
        )
        .sort((left, right) => {
          const leftWeekStats = getEmployeeWeekStats({
            employeeId: left.id,
            assignments: weeklyAssignments,
            weekStartDate,
            throughDate: planningDate,
          });
          const rightWeekStats = getEmployeeWeekStats({
            employeeId: right.id,
            assignments: weeklyAssignments,
            weekStartDate,
            throughDate: planningDate,
          });
          const operationalDelta =
            getOperationalRank({
              employee: left,
              assignedToday: assignedTodayEmployeeIdsSet.has(left.id),
              totalHours: leftWeekStats.totalHours,
            }) -
            getOperationalRank({
              employee: right,
              assignedToday: assignedTodayEmployeeIdsSet.has(right.id),
              totalHours: rightWeekStats.totalHours,
            });
          if (operationalDelta !== 0) {
            return operationalDelta;
          }

          return getMockAssignmentScore(right, focusModule, activeRules, weeklyAssignments, planningDate, planningShift) - getMockAssignmentScore(left, focusModule, activeRules, weeklyAssignments, planningDate, planningShift);
        })
        .slice(0, 3)
        .map((employee, index) => [employee.id, index + 1]),
    );
  }, [activeRules, employees, focusModule, weeklyAssignments, planningDate, planningShift, assignedTodayEmployeeIdsSet]);

  const poolSummary = useMemo(() => {
    let eligibleCount = 0;
    let assignedCount = 0;
    let attentionCount = 0;
    let unavailableCount = 0;

    employees.forEach((employee) => {
      if (assignedTodayEmployeeIdsSet.has(employee.id)) {
        assignedCount += 1;
        return;
      }

      const weekStats = getEmployeeWeekStats({
        employeeId: employee.id,
        assignments: weeklyAssignments,
        weekStartDate,
        throughDate: planningDate,
      });
      const contextSignals = getEmployeeOperationalSignalsForContext({
        employee,
        assignments: weeklyAssignments,
        planningDate,
        planningShift,
        weekStartDate,
      });

      if (employee.status === "off") {
        unavailableCount += 1;
        return;
      }

      if (
        weekStats.totalHours >= 36 ||
        employee.status === "busy" ||
        weekStats.nightShifts >= 2 ||
        weekStats.compensatoryDays === 0 ||
        contextSignals.some((signal) => signal.code === "same_day_lock" || signal.code === "protected_post_night" || signal.code === "requires_compensatory")
      ) {
        attentionCount += 1;
        return;
      }

      eligibleCount += 1;
    });

    return {
      visibleCount: employees.length,
      eligibleCount,
      assignedCount,
      attentionCount,
      unavailableCount,
    };
  }, [assignedTodayEmployeeIdsSet, employees, weeklyAssignments, weekStartDate, planningDate, planningShift]);

  const groups = useMemo(() => {
    const grouped = {
      ready: [] as Employee[],
      assigned: [] as Employee[],
      attention: [] as Employee[],
      unavailable: [] as Employee[],
    };

    [...employees]
      .sort((left, right) => {
        const leftWeekStats = getEmployeeWeekStats({
          employeeId: left.id,
          assignments: weeklyAssignments,
          weekStartDate,
          throughDate: planningDate,
        });
        const rightWeekStats = getEmployeeWeekStats({
          employeeId: right.id,
          assignments: weeklyAssignments,
          weekStartDate,
          throughDate: planningDate,
        });
        const operationalDelta =
          getOperationalRank({
            employee: left,
            assignedToday: assignedTodayEmployeeIdsSet.has(left.id),
            totalHours: leftWeekStats.totalHours,
          }) -
          getOperationalRank({
            employee: right,
            assignedToday: assignedTodayEmployeeIdsSet.has(right.id),
            totalHours: rightWeekStats.totalHours,
          });
        if (operationalDelta !== 0) {
          return operationalDelta;
        }

        if (!focusModule) {
          return left.fullName.localeCompare(right.fullName);
        }

        const leftCompatible = isEmployeeCompatibleWithModule(left, focusModule).compatible;
        const rightCompatible = isEmployeeCompatibleWithModule(right, focusModule).compatible;

        if (leftCompatible !== rightCompatible) {
          return leftCompatible ? -1 : 1;
        }

        if (!leftCompatible && !rightCompatible) {
          return left.fullName.localeCompare(right.fullName);
        }

        return getMockAssignmentScore(right, focusModule, activeRules) - getMockAssignmentScore(left, focusModule, activeRules);
      })
      .forEach((employee) => {
        const weekStats = getEmployeeWeekStats({
          employeeId: employee.id,
          assignments: weeklyAssignments,
          weekStartDate,
          throughDate: planningDate,
        });
        const contextSignals = getEmployeeOperationalSignalsForContext({
          employee,
          assignments: weeklyAssignments,
          planningDate,
          planningShift,
          weekStartDate,
        });

        if (assignedTodayEmployeeIdsSet.has(employee.id)) {
          grouped.assigned.push(employee);
          return;
        }

        if (employee.status === "off") {
          grouped.unavailable.push(employee);
          return;
        }

        if (
          weekStats.totalHours >= 36 ||
          employee.status === "busy" ||
          weekStats.nightShifts >= 2 ||
          weekStats.compensatoryDays === 0 ||
          contextSignals.some((signal) => signal.code === "same_day_lock" || signal.code === "protected_post_night" || signal.code === "requires_compensatory")
        ) {
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
        id: "assigned",
        title: "Ya asignados hoy",
        description: "Quedaron ocupados en el día activo y salen del pool elegible de hoy.",
        badgeVariant: "info" as const,
        items: grouped.assigned,
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
  }, [activeRules, employees, focusModule, weeklyAssignments, weekStartDate, planningDate, planningShift, assignedTodayEmployeeIdsSet]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pool operativo</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{poolSummary.visibleCount} visibles</Badge>
          {focusModule ? <Badge variant="info">Priorizando {focusModule.name}</Badge> : null}
          <Badge variant="success">{poolSummary.eligibleCount} elegibles hoy</Badge>
          <Badge variant="info">{poolSummary.assignedCount} ya asignados hoy</Badge>
          <Badge variant="warning">{poolSummary.attentionCount} requieren revisión</Badge>
          <Badge variant="secondary">{poolSummary.unavailableCount} no disponibles</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          El pool responde al día activo real y solo propone como listos a quienes siguen disponibles hoy para asignación operativa.
        </p>
        <div className="mt-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar empleado por nombre, perfil o skill"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 pr-2">
        {employees.length === 0 ? (
          <div className="pt-2">
            <EmptyState
              title="Sin resultados"
              description="Ajusta el filtro para encontrar perfiles disponibles."
            />
          </div>
        ) : (
          groups
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
                          focusModule && topRecommendationRanks.has(employee.id)
                            ? `Top ${topRecommendationRanks.get(employee.id)} para ${focusModule.area}`
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
            })
        )}
      </div>
    </div>
  );
}

function getOperationalRank({
  employee,
  assignedToday,
  totalHours,
}: {
  employee: Employee;
  assignedToday: boolean;
  totalHours: number;
}) {
  if (employee.status === "available" && !assignedToday && totalHours < 36) {
    return 0;
  }

  if (employee.status === "busy" || assignedToday || totalHours >= 36) {
    return 1;
  }

  return 2;
}
