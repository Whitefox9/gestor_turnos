import { useModuleCatalogStore } from "@/app/store/module-catalog.store";
import { usePlanningHistoryStore } from "@/app/store/planning-history.store";
import { apiClient } from "@/services/api/client";
import { employeesMock } from "@/services/mocks/employees.mock";
import { modulesMock } from "@/services/mocks/modules.mock";
import { rulesMock } from "@/services/mocks/rules.mock";
import { schedulingAssignmentsMock } from "@/services/mocks/scheduling.mock";
import type { AIInsight } from "@/shared/types/ai.types";
import type { Employee } from "@/shared/types/employee.types";
import type { Incident } from "@/shared/types/incident.types";
import type { CareModule } from "@/shared/types/module.types";
import type { Rule } from "@/shared/types/rule.types";
import type {
  AssignmentValidationResult,
  DailyRestOperationalSummary,
  HoverAssignmentPreview,
  IncidentReplacementSuggestion,
  LocalizedIncidentImpact,
  PublicationSimulationResult,
  RestOperationalSignal,
  ShiftAssignment,
  ShiftBucketSummary,
  ShiftKind,
} from "@/shared/types/scheduling.types";

export const schedulingService = {
  async getPlanningBoard(tenantId?: string) {
    const catalogModules = useModuleCatalogStore.getState().modules;
    const planningState = usePlanningHistoryStore.getState();
    if (planningState.weeklyAssignments.length === 0) {
      planningState.hydrateWeeklyAssignments(schedulingAssignmentsMock);
    }

    return apiClient.simulate({
      employees: employeesMock.filter((item) => !tenantId || item.tenantId === tenantId),
      modules: catalogModules.filter((item) => !tenantId || item.tenantId === tenantId),
      assignments: planningState.weeklyAssignments,
    });
  },
  async validateAssignment({
    employeeId,
    moduleId,
    employees = employeesMock,
    modules = modulesMock,
    rules = rulesMock,
    assignments = schedulingAssignmentsMock,
    planningDate,
    planningShift = "manana",
    weekStartDate,
  }: {
    employeeId: string;
    moduleId: string;
    employees?: Employee[];
    modules?: CareModule[];
    rules?: Rule[];
    assignments?: ShiftAssignment[];
    planningDate?: string;
    planningShift?: ShiftKind;
    weekStartDate?: string;
  }): Promise<AssignmentValidationResult> {
    const result = evaluateAssignment({
      employeeId,
      moduleId,
      employees,
      modules,
      rules,
      assignments,
      planningDate,
      planningShift,
      weekStartDate,
    });

    return apiClient.simulate(result, 80);
  },
  async simulatePublication({
    employees = employeesMock,
    modules = modulesMock,
    rules = rulesMock,
    assignments = schedulingAssignmentsMock,
    planningDate,
    planningShift = "manana",
    weekStartDate,
  }: {
    employees?: Employee[];
    modules?: CareModule[];
    rules?: Rule[];
    assignments?: ShiftAssignment[];
    planningDate?: string;
    planningShift?: ShiftKind;
    weekStartDate?: string;
  }): Promise<PublicationSimulationResult> {
    const activeRules = rules.filter((rule) => rule.enabled);
    const blockedRuleCodes = new Set<string>();
    const warningRuleCodes = new Set<string>();
    const affectedModuleIds = new Set<string>();

    modules.forEach((module) => {
      const assignedEmployees = employees.filter((employee) => module.assignedEmployeeIds.includes(employee.id));
      const gap = module.capacity - assignedEmployees.length;

      if (gap > 0 && activeRules.some((rule) => rule.code === "R-HRD-01")) {
        blockedRuleCodes.add("R-HRD-01");
        affectedModuleIds.add(module.id);
      }

      if (assignedEmployees.length === 0 && activeRules.some((rule) => rule.code === "R-HRD-02")) {
        blockedRuleCodes.add("R-HRD-02");
        affectedModuleIds.add(module.id);
      }

      assignedEmployees.forEach((employee) => {
        const weekStats = getEmployeeWeekStats({
          employeeId: employee.id,
          assignments,
          weekStartDate: weekStartDate ?? getWeekStartDate(planningDate ?? new Date().toISOString().slice(0, 10)),
        });
        const hasSameDayLoad = Boolean(planningDate && hasWorkingAssignmentOnDate(employee.id, assignments, planningDate));

        if (activeRules.some((rule) => rule.code === "R-HRD-07") && weekStats.totalHours > 36) {
          blockedRuleCodes.add("R-HRD-07");
          affectedModuleIds.add(module.id);
        }

        if ((activeRules.some((rule) => rule.code === "R-HRD-03") || activeRules.some((rule) => rule.code === "R-HRD-05")) && hasSameDayLoad) {
          blockedRuleCodes.add(activeRules.some((rule) => rule.code === "R-HRD-03") ? "R-HRD-03" : "R-HRD-05");
          affectedModuleIds.add(module.id);
        }

        if (activeRules.some((rule) => rule.code === "R-HRD-09") && weekStats.workingDays.size >= 7) {
          blockedRuleCodes.add("R-HRD-09");
          affectedModuleIds.add(module.id);
        }

        if (activeRules.some((rule) => rule.code === "R-HRD-06") && weekStats.nightShifts > 2) {
          blockedRuleCodes.add("R-HRD-06");
          affectedModuleIds.add(module.id);
        }

        if (activeRules.some((rule) => rule.code === "R-BLD-01") && employee.status === "busy") {
          warningRuleCodes.add("R-BLD-01");
          affectedModuleIds.add(module.id);
        }

        if (activeRules.some((rule) => rule.code === "R-BLD-02") && weekStats.totalHours >= 32) {
          warningRuleCodes.add("R-BLD-02");
          affectedModuleIds.add(module.id);
        }

        if (activeRules.some((rule) => rule.code === "R-BLD-03") && weekStats.nightShifts >= 2 && isNightShift(planningShift)) {
          warningRuleCodes.add("R-BLD-03");
          affectedModuleIds.add(module.id);
        }
      });
    });

    const moduleScores = modules.map((module) => {
      const assignedEmployees = employees.filter((employee) => module.assignedEmployeeIds.includes(employee.id));
      return getMockModuleScore(module, assignedEmployees, activeRules);
    });
    const averageScore = moduleScores.length > 0
      ? Math.round(moduleScores.reduce((sum, score) => sum + score, 0) / moduleScores.length)
      : 0;
    const blockedPenalty = blockedRuleCodes.size * 14;
    const warningPenalty = warningRuleCodes.size * 4;
    const readinessScore = Math.max(0, Math.min(100, averageScore - blockedPenalty - warningPenalty));
    const canPublish =
      blockedRuleCodes.size === 0 ||
      !activeRules.some((rule) => rule.code === "R-HRD-15" && rule.enabled);

    const summary = canPublish
      ? warningRuleCodes.size > 0
        ? `Simulación aprobada con ${warningRuleCodes.size} advertencias blandas activas.`
        : "Simulación aprobada. El cronograma no presenta bloqueos duros."
      : `Simulación bloqueada por ${blockedRuleCodes.size} reglas duras.`;

    return apiClient.simulate(
      {
        canPublish,
        readinessScore,
        blockedRuleCodes: Array.from(blockedRuleCodes),
        warningRuleCodes: Array.from(warningRuleCodes),
        affectedModuleIds: Array.from(affectedModuleIds),
        summary,
      },
      120,
    );
  },
  buildAutoAssignmentPlan({
    employees = employeesMock,
    modules = modulesMock,
    rules = rulesMock,
    targetModuleId,
    onlyEmptyModules = false,
    onlyHighRiskModules = false,
    assignments: weeklyAssignments = schedulingAssignmentsMock,
    planningDate,
    planningShift = "manana",
    weekStartDate,
  }: {
    employees?: Employee[];
    modules?: CareModule[];
    rules?: Rule[];
    targetModuleId?: string;
    onlyEmptyModules?: boolean;
    onlyHighRiskModules?: boolean;
    assignments?: ShiftAssignment[];
    planningDate?: string;
    planningShift?: ShiftKind;
    weekStartDate?: string;
  }) {
    let workingModules = modules.map((module) => ({
      ...module,
      assignedEmployeeIds: [...module.assignedEmployeeIds],
    }));
    let workingAssignments = [...weeklyAssignments];
    const appliedAssignments: Array<{ employeeId: string; employeeName: string; moduleId: string; moduleName: string; score: number }> = [];
    const skipped: Array<{ moduleId: string; moduleName: string; reason: string }> = [];

    const prioritizedModules = [...workingModules]
      .filter((module) => !targetModuleId || module.id === targetModuleId)
      .filter((module) => !onlyEmptyModules || module.assignedEmployeeIds.length === 0)
      .filter((module) => {
        if (!onlyHighRiskModules) {
          return true;
        }

        const assignedEmployees = employees.filter((employee) => module.assignedEmployeeIds.includes(employee.id));
        return getMockModuleRisk(module, assignedEmployees, rules).level === "high";
      })
      .sort((left, right) => {
        const leftGap = left.capacity - left.assignedEmployeeIds.length;
        const rightGap = right.capacity - right.assignedEmployeeIds.length;
        return rightGap - leftGap;
      });

    prioritizedModules.forEach((module) => {
      let gap = module.capacity - module.assignedEmployeeIds.length;

      while (gap > 0) {
        const occupiedIds = new Set(workingModules.flatMap((item) => item.assignedEmployeeIds));
        const candidates = employees
          .filter((employee) => !occupiedIds.has(employee.id))
          .map((employee) => ({
            employee,
            score: getMockAssignmentScore(employee, module, rules, workingAssignments, planningDate, planningShift),
          }))
          .sort((left, right) => right.score - left.score);

        const nextCandidate = candidates.find(({ employee }) =>
          evaluateAssignment({
            employeeId: employee.id,
            moduleId: module.id,
            employees,
            modules: workingModules,
            rules,
            assignments: workingAssignments,
            planningDate,
            planningShift,
            weekStartDate,
          }).valid,
        );

        const fallbackCandidate =
          nextCandidate ??
          candidates.find(({ employee }) =>
            canFallbackAutoAssignEmployee({
              employee,
              module,
              assignments: workingAssignments,
              planningDate,
              planningShift,
            }),
          );

        if (!fallbackCandidate) {
          skipped.push({
            moduleId: module.id,
            moduleName: module.name,
            reason: "No se encontró un candidato válido con las reglas activas.",
          });
          break;
        }

        workingModules = workingModules.map((item) =>
          item.id === module.id
            ? {
                ...item,
                assignedEmployeeIds: [...item.assignedEmployeeIds, fallbackCandidate.employee.id],
              }
            : item,
        );
        if (planningDate) {
          workingAssignments = [
            ...workingAssignments,
            {
              id: `auto-${planningDate}-${planningShift}-${module.id}-${fallbackCandidate.employee.id}`,
              employeeId: fallbackCandidate.employee.id,
              moduleId: module.id,
              date: planningDate,
              shift: planningShift,
              valid: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
        }

        appliedAssignments.push({
          employeeId: fallbackCandidate.employee.id,
          employeeName: fallbackCandidate.employee.fullName,
          moduleId: module.id,
          moduleName: module.name,
          score: fallbackCandidate.score,
        });

        gap -= 1;
      }
    });

    return {
      modules: workingModules,
      assignments: appliedAssignments,
      skipped,
    };
  },
};

export function getMockAssignmentScore(
  employee: Employee,
  module: CareModule,
  rules: Rule[] = rulesMock,
  assignments: ShiftAssignment[] = schedulingAssignmentsMock,
  planningDate?: string,
  planningShift: ShiftKind = "manana",
) {
  const activeRuleCodes = new Set(rules.filter((rule) => rule.enabled).map((rule) => rule.code));
  const weekStats = getEmployeeWeekStats({
    employeeId: employee.id,
    assignments,
    weekStartDate: getWeekStartDate(planningDate ?? new Date().toISOString().slice(0, 10)),
    throughDate: planningDate,
    throughShift: planningShift,
  });
  if (planningShift === "descanso_remunerado") {
    const compensatoryUrgencyBonus = weekStats.compensatoryDays <= 1 ? 18 : weekStats.compensatoryDays === 2 ? 10 : 4;
    const workloadReliefBonus = weekStats.totalHours >= 32 ? 14 : weekStats.totalHours >= 24 ? 8 : 2;
    const sameModuleBonus = employee.moduleIds.includes(module.id) ? 6 : 0;
    const statusPenalty = employee.status === "off" ? 30 : 0;

    return Math.max(35, Math.min(99, 52 + compensatoryUrgencyBonus + workloadReliefBonus + sameModuleBonus - statusPenalty));
  }

  const requiredMatches = module.requiredSkills.filter((skill) => employee.skills.includes(skill)).length;
  const skillScore = Math.min(70, requiredMatches * 35);
  const workloadPenalty = weekStats.totalHours >= 40 ? 12 : weekStats.totalHours >= 32 ? 6 : 0;
  const statusPenalty = employee.status === "busy" ? 8 : employee.status === "off" ? 25 : 0;
  const compatibilityBonus = employee.moduleIds.includes(module.id) ? 18 : employee.moduleIds.some((id) => id !== module.id) ? 8 : 0;
  const rulesBonus = activeRuleCodes.has("R-HRD-12") && employee.moduleIds.includes(module.id) ? 8 : 0;
  const rulesPenalty =
    (activeRuleCodes.has("R-HRD-07") && weekStats.totalHours >= 40 ? 8 : 0) +
    (activeRuleCodes.has("R-HRD-03") && planningDate && hasWorkingAssignmentOnDate(employee.id, assignments, planningDate) ? 12 : 0) +
    (activeRuleCodes.has("R-HRD-06") && isNightShift(planningShift) && weekStats.nightShifts >= 2 ? 18 : 0) +
    (activeRuleCodes.has("R-HRD-09") && weekStats.workingDays.size >= 6 ? 10 : 0) +
    (activeRuleCodes.has("R-BLD-02") && weekStats.totalHours >= 40 ? 6 : 0) +
    (activeRuleCodes.has("R-BLD-01") && employee.status === "busy" ? 6 : 0);

  return Math.max(35, Math.min(99, 50 + skillScore + compatibilityBonus + rulesBonus - workloadPenalty - statusPenalty - rulesPenalty));
}

export function isEmployeeCompatibleWithModule(employee: Employee, module: CareModule) {
  const normalizedRole = `${employee.roleLabel} ${employee.profile}`.toLowerCase();
  const matchesRole =
    employee.moduleIds.includes(module.id) ||
    normalizedRole.includes(module.area.toLowerCase()) ||
    normalizedRole.includes(module.name.toLowerCase());
  const matchesSkill = module.requiredSkills.length === 0 || module.requiredSkills.some((skill) => employee.skills.includes(skill));

  return {
    matchesRole,
    matchesSkill,
    compatible: matchesRole || matchesSkill,
  };
}

export function getHoverAssignmentPreview(
  employee: Employee,
  module: CareModule,
  modules: CareModule[],
  rules: Rule[] = rulesMock,
  assignments: ShiftAssignment[] = schedulingAssignmentsMock,
  planningDate?: string,
  planningShift: ShiftKind = "manana",
): HoverAssignmentPreview {
  const sourceModule = modules.find((item) => item.assignedEmployeeIds.includes(employee.id));
  const advisoryRuleCodes = getAdvisoryRuleCodes(employee, module, sourceModule, rules);
  const risk = getMockSlotRisk(employee, module, rules);
  const restReason =
    planningShift === "descanso_remunerado"
      ? getRestAssignmentReason({
          employee,
          assignments,
          weekStartDate: getWeekStartDate(planningDate ?? new Date().toISOString().slice(0, 10)),
        })
      : null;

  return {
    employeeName: employee.fullName,
    moduleName: module.name,
    score: getMockAssignmentScore(employee, module, rules, assignments, planningDate, planningShift),
    riskLevel: risk.level,
    riskHint: restReason?.detail ?? risk.reasons[0],
    advisoryRuleCodes,
  };
}

export function getRestAssignmentReason({
  employee,
  assignments,
  weekStartDate,
}: {
  employee: Employee;
  assignments: ShiftAssignment[];
  weekStartDate: string;
}) {
  const stats = getEmployeeWeekStats({
    employeeId: employee.id,
    assignments,
    weekStartDate,
  });

  if (stats.compensatoryDays <= 1 && stats.totalHours >= 32) {
    return {
      label: "Compensatorio prioritario",
      detail: "Alta carga semanal y sin margen de compensatorio. Conviene proteger su descanso.",
      tone: "danger" as const,
    };
  }

  if (stats.compensatoryDays <= 1) {
    return {
      label: "Requiere compensatorio",
      detail: "Está cerca de agotar sus días de compensatorio y conviene asignarle libre.",
      tone: "warning" as const,
    };
  }

  if (stats.nightShifts >= 2) {
    return {
      label: "Recuperación nocturna",
      detail: "Ya acumuló turnos nocturnos en la semana y se prioriza su recuperación.",
      tone: "info" as const,
    };
  }

  if (stats.totalHours >= 32) {
    return {
      label: "Alta carga semanal",
      detail: "Su carga semanal está alta y el descanso ayuda a equilibrar horas.",
      tone: "warning" as const,
    };
  }

  return {
    label: "Balance operativo",
    detail: "El descanso ayuda a sostener una distribución semanal estable del equipo.",
    tone: "info" as const,
  };
}

export function getEmployeeOperationalSignalsForContext({
  employee,
  assignments,
  planningDate,
  planningShift,
  weekStartDate,
}: {
  employee: Employee;
  assignments: ShiftAssignment[];
  planningDate: string;
  planningShift: ShiftKind;
  weekStartDate: string;
}): RestOperationalSignal[] {
  const stats = getEmployeeWeekStats({
    employeeId: employee.id,
    assignments,
    weekStartDate,
    throughDate: planningDate,
    throughShift: planningShift,
  });
  const signals: RestOperationalSignal[] = [];
  const hasSameDayCoverage = hasWorkingAssignmentOnDate(employee.id, assignments, planningDate);
  const hasSameDayRest = hasRestAssignmentOnDate(employee.id, assignments, planningDate);
  const previousDate = addDays(planningDate, -1);
  const hadPreviousNight = assignments.some(
    (assignment) =>
      assignment.employeeId === employee.id &&
      assignment.date === previousDate &&
      isNightShift(assignment.shift),
  );

  if (hasSameDayRest) {
    signals.push({
      code: "rest_assigned_today",
      label: "Libre hoy",
      detail: "Ya tiene descanso o compensatorio asignado para este día.",
      tone: "success",
    });
  }

  if (planningShift !== "descanso_remunerado" && hasSameDayCoverage) {
    signals.push({
      code: "same_day_lock",
      label: "No debe tomar otra jornada hoy",
      detail: "Ya tiene cobertura asistencial en este día y conviene evitar una segunda jornada.",
      tone: "danger",
    });
  }

  if (hadPreviousNight) {
    signals.push({
      code: "protected_post_night",
      label: "Protegido post noche",
      detail: "Trabajó turno nocturno el día previo y el sistema prioriza su recuperación.",
      tone: "warning",
    });
  }

  if (stats.compensatoryDays <= 1) {
    signals.push({
      code: "requires_compensatory",
      label: "Requiere compensatorio",
      detail: "Está al límite de descanso semanal y conviene priorizarle libre o una carga más ligera.",
      tone: "warning",
    });
  }

  return signals;
}

export function buildDailyRestOperationalSummary({
  employees,
  assignments,
  planningDate,
  planningShift,
  weekStartDate,
}: {
  employees: Employee[];
  assignments: ShiftAssignment[];
  planningDate: string;
  planningShift: ShiftKind;
  weekStartDate: string;
}): DailyRestOperationalSummary {
  const recommendations = employees
    .map((employee) => {
      const signals = getEmployeeOperationalSignalsForContext({
        employee,
        assignments,
        planningDate,
        planningShift,
        weekStartDate,
      });
      const weekStats = getEmployeeWeekStats({
        employeeId: employee.id,
        assignments,
        weekStartDate,
        throughDate: planningDate,
      });
      const primarySignal =
        signals.find((signal) => signal.code === "requires_compensatory") ??
        signals.find((signal) => signal.code === "protected_post_night") ??
        signals.find((signal) => signal.code === "rest_assigned_today");

      if (!primarySignal) {
        return null;
      }

      return {
        employeeId: employee.id,
        employeeName: employee.fullName,
        currentWeeklyHours: weekStats.totalHours,
        reason: primarySignal.detail,
        tone: primarySignal.tone,
        priority:
          primarySignal.code === "requires_compensatory"
            ? 3
            : primarySignal.code === "protected_post_night"
              ? 2
              : 1,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return right.currentWeeklyHours - left.currentWeeklyHours;
    })
    .slice(0, 5)
    .map(({ priority: _priority, ...item }) => item);

  return {
    assignedRestCount: assignments.filter(
      (assignment) => assignment.date === planningDate && assignment.shift === "descanso_remunerado",
    ).length,
    requiresCompensatoryCount: employees.filter((employee) =>
      getEmployeeOperationalSignalsForContext({
        employee,
        assignments,
        planningDate,
        planningShift,
        weekStartDate,
      }).some((signal) => signal.code === "requires_compensatory"),
    ).length,
    protectedPostNightCount: employees.filter((employee) =>
      getEmployeeOperationalSignalsForContext({
        employee,
        assignments,
        planningDate,
        planningShift,
        weekStartDate,
      }).some((signal) => signal.code === "protected_post_night"),
    ).length,
    sameDayLockCount: employees.filter((employee) =>
      getEmployeeOperationalSignalsForContext({
        employee,
        assignments,
        planningDate,
        planningShift,
        weekStartDate,
      }).some((signal) => signal.code === "same_day_lock"),
    ).length,
    recommendations,
  };
}

export function getMockModuleScore(module: CareModule, assignedEmployees: Employee[], rules: Rule[] = rulesMock) {
  if (assignedEmployees.length === 0) {
    return 42;
  }

  const occupancyScore = Math.min(100, Math.round((assignedEmployees.length / module.capacity) * 100));
  const fitAverage = Math.round(
    assignedEmployees.reduce((sum, employee) => sum + getMockAssignmentScore(employee, module, rules), 0) /
      assignedEmployees.length,
  );

  return Math.round((occupancyScore + fitAverage) / 2);
}

export function buildModulesForPlanningSlice({
  modules,
  assignments,
  planningDate,
  planningShift,
}: {
  modules: CareModule[];
  assignments: ShiftAssignment[];
  planningDate: string;
  planningShift: ShiftKind;
}) {
  return modules.map((module) => ({
    ...module,
    shiftLabel: getShiftLabel(planningShift),
    assignedEmployeeIds: assignments
      .filter((assignment) => assignment.moduleId === module.id && assignment.date === planningDate && assignment.shift === planningShift)
      .map((assignment) => assignment.employeeId),
  }));
}

export function getModuleDailyShiftSummary({
  moduleId,
  assignments,
  planningDate,
}: {
  moduleId: string;
  assignments: ShiftAssignment[];
  planningDate: string;
}): ShiftBucketSummary[] {
  const shifts: ShiftKind[] = ["manana", "tarde", "noche", "noche_larga", "descanso_remunerado"];

  return shifts.map((shift) => ({
    shift,
    employeeIds: assignments
      .filter((assignment) => assignment.moduleId === moduleId && assignment.date === planningDate && assignment.shift === shift)
      .map((assignment) => assignment.employeeId),
    count: assignments.filter((assignment) => assignment.moduleId === moduleId && assignment.date === planningDate && assignment.shift === shift).length,
  }));
}

export function applyIncidentsToPlanningSlice({
  modules,
  incidents,
  planningDate,
  planningShift,
}: {
  modules: CareModule[];
  incidents: Incident[];
  planningDate: string;
  planningShift: ShiftKind;
}) {
  const activeImpacts = incidents.filter(
    (incident) =>
      incident.status !== "resuelta" &&
      incident.employeeId &&
      incident.moduleId &&
      incident.date === planningDate &&
      incident.shift === planningShift,
  );

  if (activeImpacts.length === 0) {
    return modules;
  }

  return modules.map((module) => {
    const blockedEmployeeIds = activeImpacts
      .filter((incident) => incident.moduleId === module.id)
      .map((incident) => incident.employeeId);

    if (blockedEmployeeIds.length === 0) {
      return module;
    }

    return {
      ...module,
      assignedEmployeeIds: module.assignedEmployeeIds.filter((employeeId) => !blockedEmployeeIds.includes(employeeId)),
    };
  });
}

export function getPlanningWeekDays(weekStartDate: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStartDate, index);
    const label = new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
    });

    return { date, label };
  });
}

export function getPlanningWeekStartDate(date: string) {
  return getWeekStartDate(date);
}

export function getAssignedEmployeeIdsForDate(assignments: ShiftAssignment[], planningDate: string) {
  return Array.from(
    new Set(
      assignments
        .filter((assignment) => assignment.date === planningDate)
        .map((assignment) => assignment.employeeId),
    ),
  );
}

export function getPreviousShiftByEmployee({
  employeeId,
  assignments,
  planningDate,
  planningShift = "manana",
}: {
  employeeId: string;
  assignments: ShiftAssignment[];
  planningDate: string;
  planningShift?: ShiftKind;
}) {
  const shiftOrder = getShiftOrder(planningShift);
  const previousAssignments = assignments
    .filter((assignment) => assignment.employeeId === employeeId)
    .filter(
      (assignment) =>
        assignment.date < planningDate ||
        (assignment.date === planningDate && getShiftOrder(assignment.shift) < shiftOrder),
    )
    .sort((left, right) => {
      if (left.date === right.date) {
        return getShiftOrder(right.shift) - getShiftOrder(left.shift);
      }

      return right.date.localeCompare(left.date);
    });

  if (previousAssignments.length === 0) {
    return null;
  }

  const previousAssignment = previousAssignments[0];

  return {
    shift: previousAssignment.shift,
    label: getShiftLabel(previousAssignment.shift),
    date: previousAssignment.date,
  };
}

export function buildDailyAutoAssignmentPlan({
  employees = employeesMock,
  modules = modulesMock,
  rules = rulesMock,
  assignments = schedulingAssignmentsMock,
  planningDate,
  weekStartDate,
  targetModuleId,
}: {
  employees?: Employee[];
  modules?: CareModule[];
  rules?: Rule[];
  assignments?: ShiftAssignment[];
  planningDate: string;
  weekStartDate: string;
  targetModuleId?: string;
}) {
  const shifts: ShiftKind[] = ["manana", "tarde", "noche", "noche_larga", "descanso_remunerado"];
  const scopedModules = modules.filter((module) => !targetModuleId || module.id === targetModuleId);
  const historicalAssignments = assignments.filter((assignment) => assignment.date < planningDate);
  const futureAssignments = assignments.filter((assignment) => assignment.date > planningDate);
  let workingAssignments = [...historicalAssignments];
  const usedEmployeeIdsForDay = new Set<string>();
  const appliedAssignments: Array<{
    employeeId: string;
    employeeName: string;
    moduleId: string;
    moduleName: string;
    score: number;
    shift: ShiftKind;
  }> = [];
  const skipped: Array<{
    moduleId: string;
    moduleName: string;
    reason: string;
    shift: ShiftKind;
  }> = [];

  shifts.forEach((shift) => {
    scopedModules.forEach((module) => {
      let assignedCount = workingAssignments.filter(
        (assignment) =>
          assignment.date === planningDate &&
          assignment.shift === shift &&
          assignment.moduleId === module.id,
      ).length;

      while (assignedCount < module.capacity) {
        const modulesForShift = buildModulesForPlanningSlice({
          modules,
          assignments: workingAssignments,
          planningDate,
          planningShift: shift,
        });
        const candidates = employees
          .filter((employee) => employee.status === "available")
          .filter((employee) => !usedEmployeeIdsForDay.has(employee.id))
          .filter((employee) =>
            shift === "descanso_remunerado"
              ? true
              : isEmployeeCompatibleWithModule(employee, module).compatible,
          )
          .map((employee) => ({
            employee,
            score: getMockAssignmentScore(
              employee,
              module,
              rules,
              workingAssignments,
              planningDate,
              shift,
            ),
          }))
          .sort((left, right) => right.score - left.score);

        const selectedCandidate =
          candidates.find(({ employee }) =>
            evaluateAssignment({
              employeeId: employee.id,
              moduleId: module.id,
              employees,
              modules: modulesForShift,
              rules,
              assignments: workingAssignments,
              planningDate,
              planningShift: shift,
              weekStartDate,
            }).valid,
          ) ??
          candidates.find(({ employee }) =>
            canFallbackAutoAssignEmployee({
              employee,
              module,
              assignments: workingAssignments,
              planningDate,
              planningShift: shift,
            }),
          );

        if (!selectedCandidate) {
          skipped.push({
            moduleId: module.id,
            moduleName: module.name,
            shift,
            reason: "No se encontró un candidato elegible para este día y jornada.",
          });
          break;
        }

        const timestamp = new Date().toISOString();
        workingAssignments = [
          ...workingAssignments,
          {
            id: `day-auto-${planningDate}-${shift}-${module.id}-${selectedCandidate.employee.id}`,
            employeeId: selectedCandidate.employee.id,
            moduleId: module.id,
            date: planningDate,
            shift,
            valid: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ];
        usedEmployeeIdsForDay.add(selectedCandidate.employee.id);
        appliedAssignments.push({
          employeeId: selectedCandidate.employee.id,
          employeeName: selectedCandidate.employee.fullName,
          moduleId: module.id,
          moduleName: module.name,
          score: selectedCandidate.score,
          shift,
        });
        assignedCount += 1;
      }
    });
  });

  return {
    assignments: [...workingAssignments, ...futureAssignments],
    appliedAssignments,
    skipped,
    assignedEmployeeIdsForDay: Array.from(usedEmployeeIdsForDay),
    perShiftCounts: shifts.map((shift) => ({
      shift,
      count: appliedAssignments.filter((assignment) => assignment.shift === shift).length,
    })),
  };
}

export function getMockModuleRisk(module: CareModule, assignedEmployees: Employee[], rules: Rule[] = rulesMock) {
  const activeRuleCodes = new Set(rules.filter((rule) => rule.enabled).map((rule) => rule.code));
  const reasons: string[] = [];
  let level: "none" | "low" | "medium" | "high" = "none";

  const gap = module.capacity - assignedEmployees.length;
  if (activeRuleCodes.has("R-HRD-01") && gap > 0) {
    reasons.push("Cobertura por debajo del minimo");
    level = gap >= 2 ? "high" : "medium";
  }

  if (activeRuleCodes.has("R-HRD-07") && assignedEmployees.some((employee) => employee.weeklyHours >= 44)) {
    reasons.push("Horas semanales al limite");
    level = "high";
  }

  if (activeRuleCodes.has("R-BLD-02") && assignedEmployees.some((employee) => employee.weeklyHours >= 40) && level !== "high") {
    reasons.push("Carga desigual en el equipo");
    level = "medium";
  }

  if (activeRuleCodes.has("R-BLD-04") && assignedEmployees.some((employee) => employee.moduleIds.length <= 1) && level === "none") {
    reasons.push("Rotacion limitada");
    level = "low";
  }

  return {
    level,
    reasons,
  };
}

export function getMockSlotRisk(employee: Employee | null, module: CareModule, rules: Rule[] = rulesMock) {
  const activeRuleCodes = new Set(rules.filter((rule) => rule.enabled).map((rule) => rule.code));
  const reasons: string[] = [];
  let level: "none" | "low" | "medium" | "high" = "none";

  if (!employee) {
    if (activeRuleCodes.has("R-HRD-01")) {
      return {
        level: "high" as const,
        reasons: ["Slot critico pendiente de cobertura"],
      };
    }

    return {
      level: "low" as const,
      reasons: ["Slot libre disponible"],
    };
  }

  if (activeRuleCodes.has("R-HRD-07") && employee.weeklyHours >= 44) {
    reasons.push("Horas al limite contractual");
    level = "high";
  }

  if ((activeRuleCodes.has("R-HRD-03") || activeRuleCodes.has("R-HRD-05")) && employee.assignedToday) {
    reasons.push("Descanso minimo comprometido");
    level = level === "high" ? "high" : "medium";
  }

  if (activeRuleCodes.has("R-BLD-02") && employee.weeklyHours >= 40 && level === "none") {
    reasons.push("Carga alta");
    level = "medium";
  }

  if (activeRuleCodes.has("R-BLD-04") && employee.moduleIds.length <= 1 && level === "none") {
    reasons.push("Rotacion baja");
    level = "low";
  }

  return {
    level,
    reasons,
  };
}

export function getInvalidAssignedEmployeeIdsForModule({
  module,
  employees,
  rules = rulesMock,
  assignments = schedulingAssignmentsMock,
  planningDate,
  planningShift = "manana",
  weekStartDate,
}: {
  module: CareModule;
  employees: Employee[];
  rules?: Rule[];
  assignments?: ShiftAssignment[];
  planningDate?: string;
  planningShift?: ShiftKind;
  weekStartDate?: string;
}) {
  return module.assignedEmployeeIds.filter((employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) {
      return true;
    }

    const activeRuleCodes = new Set(rules.filter((rule) => rule.enabled).map((rule) => rule.code));
    const weekStats = getEmployeeWeekStats({
      employeeId,
      assignments,
      weekStartDate: weekStartDate ?? getWeekStartDate(planningDate ?? new Date().toISOString().slice(0, 10)),
    });
    const compatibility = isEmployeeCompatibleWithModule(employee, module);

    if (activeRuleCodes.has("R-HRD-12") && !compatibility.matchesRole) {
      return true;
    }
    if (activeRuleCodes.has("R-HRD-13") && !compatibility.matchesSkill) {
      return true;
    }
    if (activeRuleCodes.has("R-HRD-14") && employee.status === "off") {
      return true;
    }
    if (activeRuleCodes.has("R-HRD-07") && weekStats.totalHours > 36) {
      return true;
    }
    if (activeRuleCodes.has("R-HRD-06") && isNightShift(planningShift) && weekStats.nightShifts > 2) {
      return true;
    }
    if (activeRuleCodes.has("R-HRD-09") && weekStats.compensatoryDays === 0) {
      return true;
    }

    return false;
  });
}

export function getSoftRuleInsights({
  employees,
  modules,
  rules = rulesMock,
}: {
  employees: Employee[];
  modules: CareModule[];
  rules?: Rule[];
}): AIInsight[] {
  const activeRuleCodes = new Set(rules.filter((rule) => rule.enabled && rule.ruleType === "blanda").map((rule) => rule.code));
  const now = new Date().toISOString();
  const insights: AIInsight[] = [];

  if (activeRuleCodes.has("R-BLD-01")) {
    const constrainedEmployees = employees.filter((employee) => employee.status === "busy").slice(0, 2);
    if (constrainedEmployees.length > 0) {
      insights.push({
        id: "soft-rule-r-bld-01",
        title: "Restricciones personales en revisión",
        message: `${constrainedEmployees.map((employee) => employee.fullName).join(" y ")} requieren asignación cuidadosa por disponibilidad o restricción operativa.`,
        severity: "warning",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (activeRuleCodes.has("R-BLD-02")) {
    const overloadedEmployees = employees.filter((employee) => employee.weeklyHours >= 40).slice(0, 2);
    if (overloadedEmployees.length > 0) {
      insights.push({
        id: "soft-rule-r-bld-02",
        title: "Equidad de carga",
        message: `${overloadedEmployees.map((employee) => employee.fullName).join(" y ")} están cerca del límite recomendable. Conviene redistribuir carga.`,
        severity: "warning",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (activeRuleCodes.has("R-BLD-04")) {
    const lowRotationModule = modules.find((module) =>
      employees
        .filter((employee) => module.assignedEmployeeIds.includes(employee.id))
        .some((employee) => employee.moduleIds.length <= 1),
    );
    if (lowRotationModule) {
      insights.push({
        id: "soft-rule-r-bld-04",
        title: "Rotación limitada",
        message: `${lowRotationModule.name} depende de perfiles con baja rotación. Vale la pena comparar alternativas antes de publicar.`,
        severity: "info",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (activeRuleCodes.has("R-BLD-05")) {
    const coveredModules = modules.filter((module) => module.assignedEmployeeIds.length > 0).length;
    if (coveredModules > 0) {
      insights.push({
        id: "soft-rule-r-bld-05",
        title: "Comunicación preventiva",
        message: `Hay ${coveredModules} dependencias con cambios potenciales. El copiloto recomienda preparar notificación temprana a los equipos afectados.`,
        severity: "info",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return insights;
}

function getAdvisoryRuleCodes(employee: Employee, module: CareModule, assignedModule: CareModule | undefined, activeRules: Rule[]) {
  return activeRules
    .filter((rule) => rule.ruleType === "blanda")
    .filter((rule) => {
      if (rule.code === "R-BLD-01") {
        return employee.status === "busy";
      }
      if (rule.code === "R-BLD-02") {
        return employee.weeklyHours >= 40;
      }
      if (rule.code === "R-BLD-03") {
        return employee.assignedToday;
      }
      if (rule.code === "R-BLD-04") {
        return employee.moduleIds.length <= 1;
      }
      if (rule.code === "R-BLD-05") {
        return Boolean(assignedModule && assignedModule.id !== module.id);
      }
      return false;
    })
    .map((rule) => rule.code);
}

function evaluateAssignment({
  employeeId,
  moduleId,
  employees = employeesMock,
  modules = modulesMock,
  rules = rulesMock,
  assignments = schedulingAssignmentsMock,
  planningDate,
  planningShift = "manana",
  weekStartDate,
}: {
  employeeId: string;
  moduleId: string;
  employees?: Employee[];
  modules?: CareModule[];
  rules?: Rule[];
  assignments?: ShiftAssignment[];
  planningDate?: string;
  planningShift?: ShiftKind;
  weekStartDate?: string;
}): AssignmentValidationResult {
  const employee = employees.find((item) => item.id === employeeId);
  const module = modules.find((item) => item.id === moduleId);
  const activeRules = rules.filter((rule) => rule.enabled);
  const activeRuleCodes = new Set(activeRules.map((rule) => rule.code));

  if (!employee || !module) {
    return { valid: false, reason: "No fue posible resolver la asignacion." };
  }

  if (module.assignedEmployeeIds.includes(employeeId)) {
    return { valid: false, reason: "El empleado ya esta asignado a este modulo." };
  }

  if (activeRuleCodes.has("R-HRD-01") && module.assignedEmployeeIds.length >= module.capacity) {
    return {
      valid: false,
      reason: "R-HRD-01 bloquea la asignacion: la dependencia ya alcanzo su cobertura maxima configurada.",
      violatedRuleCodes: ["R-HRD-01"],
    };
  }

  const assignedModule = modules.find((item) => item.assignedEmployeeIds.includes(employeeId));
  const effectiveWeekStart = weekStartDate ?? getWeekStartDate(planningDate ?? new Date().toISOString().slice(0, 10));
  const weekStats = getEmployeeWeekStats({
    employeeId,
    assignments,
    weekStartDate: effectiveWeekStart,
    throughDate: planningDate,
    throughShift: planningShift,
  });
  const alreadyAssignedInCurrentSlice = Boolean(assignedModule);
  const projectedHours = weekStats.totalHours + (alreadyAssignedInCurrentSlice ? 0 : getShiftDurationHours(planningShift));
  const hasSameDayWorkload = Boolean(planningDate && hasWorkingAssignmentOnDate(employeeId, assignments, planningDate));
  const hasSameDayRest = Boolean(planningDate && hasRestAssignmentOnDate(employeeId, assignments, planningDate));
  const compatibility = isEmployeeCompatibleWithModule(employee, module);
  const matchesRole = compatibility.matchesRole;
  const matchesSkill = compatibility.matchesSkill;

  if (planningShift !== "descanso_remunerado" && activeRuleCodes.has("R-HRD-12") && !matchesRole) {
    return {
      valid: false,
      reason: "R-HRD-12 bloquea la asignacion: el colaborador no cumple el rol base requerido por la dependencia.",
      violatedRuleCodes: ["R-HRD-12"],
    };
  }

  if (planningShift !== "descanso_remunerado" && activeRuleCodes.has("R-HRD-13") && !matchesSkill) {
    return {
      valid: false,
      reason: "R-HRD-13 bloquea la asignacion: el perfil no cumple la competencia requerida por el modulo.",
      violatedRuleCodes: ["R-HRD-13"],
    };
  }

  if (activeRuleCodes.has("R-HRD-14") && employee.status === "off") {
    return {
      valid: false,
      reason: "R-HRD-14 bloquea la asignacion: el colaborador figura como ausente o no disponible.",
      violatedRuleCodes: ["R-HRD-14"],
    };
  }

  if (activeRuleCodes.has("R-HRD-07") && projectedHours > 36) {
    return {
      valid: false,
      reason: "R-HRD-07 bloquea la asignacion: el colaborador ya alcanzo el limite semanal de horas del contrato.",
      violatedRuleCodes: ["R-HRD-07"],
    };
  }

  if (planningShift === "descanso_remunerado" && hasSameDayWorkload && !alreadyAssignedInCurrentSlice) {
    return {
      valid: false,
      reason: "No se puede programar descanso remunerado el mismo día en que el colaborador ya tiene cobertura asistencial.",
      violatedRuleCodes: ["R-HRD-09"],
    };
  }

  if ((activeRuleCodes.has("R-HRD-03") || activeRuleCodes.has("R-HRD-05")) && hasSameDayWorkload && !assignedModule) {
    return {
      valid: false,
      reason: "Las reglas R-HRD-03 y R-HRD-05 bloquean la asignacion por descanso minimo entre turnos.",
      violatedRuleCodes: ["R-HRD-03", "R-HRD-05"],
    };
  }

  if (planningShift !== "descanso_remunerado" && hasSameDayRest) {
    return {
      valid: false,
      reason: "El colaborador ya tiene un compensatorio asignado para este día y no debe cubrir un turno adicional.",
      violatedRuleCodes: ["R-HRD-09"],
    };
  }

  if (activeRuleCodes.has("R-HRD-06") && isNightShift(planningShift) && weekStats.nightShifts >= 2) {
    return {
      valid: false,
      reason: "R-HRD-06 bloquea la asignacion: el colaborador ya alcanzó el máximo semanal de dos turnos nocturnos.",
      violatedRuleCodes: ["R-HRD-06"],
    };
  }

  if (activeRuleCodes.has("R-HRD-09")) {
    const nextWorkingDays = new Set(weekStats.workingDays);
    if (planningDate) {
      nextWorkingDays.add(planningDate);
    }

    if (nextWorkingDays.size >= 7) {
      return {
        valid: false,
        reason: "R-HRD-09 bloquea la asignacion: el colaborador debe conservar al menos un dia compensatorio en la semana.",
        violatedRuleCodes: ["R-HRD-09"],
      };
    }
  }

  const advisoryRuleCodes = getAdvisoryRuleCodes(employee, module, assignedModule, activeRules);
  const appliedRuleCodes = activeRules
    .filter((rule) => ["R-HRD-01", "R-HRD-12", "R-HRD-13", "R-HRD-14", "R-HRD-07", "R-HRD-03", "R-HRD-05", "R-HRD-06", "R-HRD-09"].includes(rule.code))
    .map((rule) => rule.code);

  return {
    valid: true,
    appliedRuleCodes,
    advisoryRuleCodes,
  };
}

export function getEmployeeWeekStats({
  employeeId,
  assignments,
  weekStartDate,
  throughDate,
  throughShift,
}: {
  employeeId: string;
  assignments: ShiftAssignment[];
  weekStartDate: string;
  throughDate?: string;
  throughShift?: ShiftKind;
}) {
  const weekDays = new Set(getPlanningWeekDays(weekStartDate).map((day) => day.date));
  const relevantAssignments = assignments.filter(
    (assignment) =>
      assignment.employeeId === employeeId &&
      weekDays.has(assignment.date) &&
      isAssignmentOnOrBeforeContext(assignment, throughDate, throughShift),
  );

  return {
    totalAssignments: relevantAssignments.filter((assignment) => assignment.shift !== "descanso_remunerado").length,
    totalHours: relevantAssignments.reduce((sum, assignment) => sum + getShiftDurationHours(assignment.shift), 0),
    nightShifts: relevantAssignments.filter((assignment) => isNightShift(assignment.shift)).length,
    workingDays: new Set(
      relevantAssignments
        .filter((assignment) => assignment.shift !== "descanso_remunerado")
        .map((assignment) => assignment.date),
    ),
    compensatoryDays: Math.max(0, 7 - new Set(relevantAssignments.filter((assignment) => assignment.shift !== "descanso_remunerado").map((assignment) => assignment.date)).size),
  };
}

function hasWorkingAssignmentOnDate(employeeId: string, assignments: ShiftAssignment[], date: string) {
  return assignments.some(
    (assignment) =>
      assignment.employeeId === employeeId &&
      assignment.date === date &&
      assignment.shift !== "descanso_remunerado",
  );
}

function hasRestAssignmentOnDate(employeeId: string, assignments: ShiftAssignment[], date: string) {
  return assignments.some(
    (assignment) =>
      assignment.employeeId === employeeId &&
      assignment.date === date &&
      assignment.shift === "descanso_remunerado",
  );
}

function canFallbackAutoAssignEmployee({
  employee,
  module,
  assignments,
  planningDate,
  planningShift,
}: {
  employee: Employee;
  module: CareModule;
  assignments: ShiftAssignment[];
  planningDate?: string;
  planningShift: ShiftKind;
}) {
  if (employee.status !== "available") {
    return false;
  }

  if (planningDate) {
    const hasAnyAssignmentToday = assignments.some(
      (assignment) => assignment.employeeId === employee.id && assignment.date === planningDate,
    );

    if (hasAnyAssignmentToday) {
      return false;
    }
  }

  if (planningShift === "descanso_remunerado") {
    return true;
  }

  return isEmployeeCompatibleWithModule(employee, module).compatible;
}

function isAssignmentOnOrBeforeContext(
  assignment: ShiftAssignment,
  throughDate?: string,
  throughShift?: ShiftKind,
) {
  if (!throughDate) {
    return true;
  }

  if (assignment.date < throughDate) {
    return true;
  }

  if (assignment.date > throughDate) {
    return false;
  }

  if (!throughShift) {
    return true;
  }

  return getShiftOrder(assignment.shift) <= getShiftOrder(throughShift);
}

export function buildWeeklyCopilotInsights({
  employees,
  assignments,
  weekStartDate,
}: {
  employees: Employee[];
  assignments: ShiftAssignment[];
  weekStartDate: string;
}): AIInsight[] {
  const now = new Date().toISOString();
  const missingCompensatory = employees
    .map((employee) => ({
      employee,
      stats: getEmployeeWeekStats({
        employeeId: employee.id,
        assignments,
        weekStartDate,
      }),
    }))
    .filter(({ stats }) => stats.compensatoryDays === 0)
    .slice(0, 3);

  const nightLimitEmployees = employees
    .map((employee) => ({
      employee,
      stats: getEmployeeWeekStats({
        employeeId: employee.id,
        assignments,
        weekStartDate,
      }),
    }))
    .filter(({ stats }) => stats.nightShifts >= 2)
    .slice(0, 3);

  const insights: AIInsight[] = [];
  const overloadedEmployees = employees
    .map((employee) => ({
      employee,
      stats: getEmployeeWeekStats({
        employeeId: employee.id,
        assignments,
        weekStartDate,
      }),
    }))
    .filter(({ stats }) => stats.totalHours > 36)
    .slice(0, 3);

  if (missingCompensatory.length > 0) {
    insights.push({
      id: `week-comp-${weekStartDate}`,
      title: "Compensatorio semanal comprometido",
      message: `${missingCompensatory.map(({ employee }) => employee.fullName).join(", ")} ya no tienen día compensatorio libre en la semana activa.`,
      severity: "critical",
      createdAt: now,
      updatedAt: now,
    });
  }

  if (nightLimitEmployees.length > 0) {
    insights.push({
      id: `week-night-${weekStartDate}`,
      title: "Límite nocturno en vigilancia",
      message: `${nightLimitEmployees.map(({ employee }) => employee.fullName).join(", ")} ya alcanzaron 2 turnos nocturnos semanales.`,
      severity: "warning",
      createdAt: now,
      updatedAt: now,
    });
  }

  if (overloadedEmployees.length > 0) {
    insights.push({
      id: `week-hours-${weekStartDate}`,
      title: "Horas semanales excedidas",
      message: `${overloadedEmployees.map(({ employee }) => employee.fullName).join(", ")} superan las 36h semanales y no deberían recibir más cobertura.`,
      severity: "critical",
      createdAt: now,
      updatedAt: now,
    });
  }

  return insights;
}

export function buildLocalizedIncidentImpacts({
  incidents,
  modules,
  employees,
  rules = rulesMock,
  assignments = schedulingAssignmentsMock,
  planningDate,
  planningShift,
  weekStartDate,
}: {
  incidents: Incident[];
  modules: CareModule[];
  employees: Employee[];
  rules?: Rule[];
  assignments?: ShiftAssignment[];
  planningDate: string;
  planningShift: ShiftKind;
  weekStartDate: string;
}) {
  const impacts: LocalizedIncidentImpact[] = [];

  incidents
    .filter(
      (incident) =>
        incident.status !== "resuelta" &&
        incident.employeeId &&
        incident.date === planningDate &&
        incident.shift === planningShift,
    )
    .forEach((incident) => {
      const employee = employees.find((item) => item.id === incident.employeeId);
      const moduleId =
        incident.moduleId ??
        assignments.find(
          (assignment) =>
            assignment.employeeId === incident.employeeId &&
            assignment.date === planningDate &&
            assignment.shift === planningShift,
        )?.moduleId;
      const module = modules.find((item) => item.id === moduleId);

      if (!employee || !module) {
        return;
      }

      const removedHours = getShiftDurationHours(planningShift);
      const requiresReplacement = module.assignedEmployeeIds.length < module.capacity;
      const replacementSuggestions = requiresReplacement
        ? buildIncidentReplacementSuggestions({
            incident,
            module,
            employees,
            rules,
            modules,
            assignments,
            planningDate,
            planningShift,
            weekStartDate,
            removedHours,
          })
        : [];

      impacts.push({
        incidentId: incident.id,
        incidentKind: incident.kind,
        moduleId: module.id,
        moduleName: module.name,
        employeeId: employee.id,
        employeeName: employee.fullName,
        date: planningDate,
        shift: planningShift,
        severity: incident.severity,
        summary: incident.summary,
        removedHours,
        requiresReplacement,
        replacementSuggestions,
      });
    });

  return impacts;
}

function buildIncidentReplacementSuggestions({
  incident,
  module,
  employees,
  rules,
  modules,
  assignments,
  planningDate,
  planningShift,
  weekStartDate,
  removedHours,
}: {
  incident: Incident;
  module: CareModule;
  employees: Employee[];
  rules: Rule[];
  modules: CareModule[];
  assignments: ShiftAssignment[];
  planningDate: string;
  planningShift: ShiftKind;
  weekStartDate: string;
  removedHours: number;
}) {
  const occupiedIds = new Set(modules.flatMap((item) => item.assignedEmployeeIds));
  const suggestions: IncidentReplacementSuggestion[] = [];

  employees
    .filter((employee) => employee.id !== incident.employeeId)
    .filter((employee) => employee.status === "available")
    .filter((employee) => !occupiedIds.has(employee.id))
    .filter((employee) => {
      const stats = getEmployeeWeekStats({
        employeeId: employee.id,
        assignments,
        weekStartDate,
      });
      return stats.totalHours + removedHours <= 36;
    })
    .forEach((employee) => {
      const validation = evaluateAssignment({
        employeeId: employee.id,
        moduleId: module.id,
        employees,
        modules,
        rules,
        assignments,
        planningDate,
        planningShift,
        weekStartDate,
      });

      if (!validation.valid) {
        return;
      }

      const score = getMockAssignmentScore(employee, module, rules, assignments, planningDate, planningShift);

      const stats = getEmployeeWeekStats({
        employeeId: employee.id,
        assignments,
        weekStartDate,
      });

      suggestions.push({
        employeeId: employee.id,
        employeeName: employee.fullName,
        moduleId: module.id,
        moduleName: module.name,
        score,
        currentWeeklyHours: stats.totalHours,
        projectedWeeklyHours: stats.totalHours + removedHours,
        reason: `${module.area} compatible, mantiene el ajuste en el contexto afectado y queda en ${stats.totalHours + removedHours}h semanales.`,
        violatedRuleCodes: [],
        advisoryRuleCodes: validation.advisoryRuleCodes ?? [],
      });
    });

  return suggestions
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function getWeekStartDate(date: string) {
  const baseDate = new Date(`${date}T00:00:00`);
  const day = baseDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  baseDate.setDate(baseDate.getDate() + mondayOffset);
  return baseDate.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function getShiftLabel(shift: ShiftKind) {
  if (shift === "manana") {
    return "Turno mañana";
  }
  if (shift === "tarde") {
    return "Turno tarde";
  }
  if (shift === "noche") {
    return "Turno noche";
  }
  if (shift === "noche_larga") {
    return "Turno noche larga";
  }
  return "Descanso remunerado";
}

function isNightShift(shift: ShiftKind) {
  return shift === "noche" || shift === "noche_larga";
}

function getShiftOrder(shift: ShiftKind) {
  if (shift === "manana") {
    return 0;
  }
  if (shift === "tarde") {
    return 1;
  }
  if (shift === "noche") {
    return 2;
  }
  if (shift === "noche_larga") {
    return 3;
  }

  return 4;
}

function getShiftDurationHours(shift: ShiftKind) {
  if (shift === "descanso_remunerado") {
    return 0;
  }
  if (shift === "noche_larga") {
    return 12;
  }

  return 8;
}
