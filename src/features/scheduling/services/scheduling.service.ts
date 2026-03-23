import { apiClient } from "@/services/api/client";
import { employeesMock } from "@/services/mocks/employees.mock";
import { modulesMock } from "@/services/mocks/modules.mock";
import { rulesMock } from "@/services/mocks/rules.mock";
import { schedulingAssignmentsMock } from "@/services/mocks/scheduling.mock";
import type { AIInsight } from "@/shared/types/ai.types";
import type { Employee } from "@/shared/types/employee.types";
import type { CareModule } from "@/shared/types/module.types";
import type { Rule } from "@/shared/types/rule.types";
import type { AssignmentValidationResult, HoverAssignmentPreview, PublicationSimulationResult } from "@/shared/types/scheduling.types";

export const schedulingService = {
  async getPlanningBoard(tenantId?: string) {
    return apiClient.simulate({
      employees: employeesMock.filter((item) => !tenantId || item.tenantId === tenantId),
      modules: modulesMock.filter((item) => !tenantId || item.tenantId === tenantId),
      assignments: schedulingAssignmentsMock,
    });
  },
  async validateAssignment({
    employeeId,
    moduleId,
    employees = employeesMock,
    modules = modulesMock,
    rules = rulesMock,
  }: {
    employeeId: string;
    moduleId: string;
    employees?: Employee[];
    modules?: CareModule[];
    rules?: Rule[];
  }): Promise<AssignmentValidationResult> {
    const result = evaluateAssignment({
      employeeId,
      moduleId,
      employees,
      modules,
      rules,
    });

    return apiClient.simulate(result, 80);
  },
  async simulatePublication({
    employees = employeesMock,
    modules = modulesMock,
    rules = rulesMock,
  }: {
    employees?: Employee[];
    modules?: CareModule[];
    rules?: Rule[];
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
        if (activeRules.some((rule) => rule.code === "R-HRD-07") && employee.weeklyHours >= 44) {
          blockedRuleCodes.add("R-HRD-07");
          affectedModuleIds.add(module.id);
        }

        if ((activeRules.some((rule) => rule.code === "R-HRD-03") || activeRules.some((rule) => rule.code === "R-HRD-05")) && employee.assignedToday) {
          blockedRuleCodes.add(activeRules.some((rule) => rule.code === "R-HRD-03") ? "R-HRD-03" : "R-HRD-05");
          affectedModuleIds.add(module.id);
        }

        if (activeRules.some((rule) => rule.code === "R-BLD-01") && employee.status === "busy") {
          warningRuleCodes.add("R-BLD-01");
          affectedModuleIds.add(module.id);
        }

        if (activeRules.some((rule) => rule.code === "R-BLD-02") && employee.weeklyHours >= 40) {
          warningRuleCodes.add("R-BLD-02");
          affectedModuleIds.add(module.id);
        }

        if (activeRules.some((rule) => rule.code === "R-BLD-03") && employee.assignedToday) {
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
  }: {
    employees?: Employee[];
    modules?: CareModule[];
    rules?: Rule[];
    targetModuleId?: string;
  }) {
    let workingModules = modules.map((module) => ({
      ...module,
      assignedEmployeeIds: [...module.assignedEmployeeIds],
    }));
    const assignments: Array<{ employeeId: string; employeeName: string; moduleId: string; moduleName: string; score: number }> = [];
    const skipped: Array<{ moduleId: string; moduleName: string; reason: string }> = [];

    const prioritizedModules = [...workingModules]
      .filter((module) => !targetModuleId || module.id === targetModuleId)
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
            score: getMockAssignmentScore(employee, module, rules),
          }))
          .sort((left, right) => right.score - left.score);

        const nextCandidate = candidates.find(({ employee }) =>
          evaluateAssignment({
            employeeId: employee.id,
            moduleId: module.id,
            employees,
            modules: workingModules,
            rules,
          }).valid,
        );

        if (!nextCandidate) {
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
                assignedEmployeeIds: [...item.assignedEmployeeIds, nextCandidate.employee.id],
              }
            : item,
        );

        assignments.push({
          employeeId: nextCandidate.employee.id,
          employeeName: nextCandidate.employee.fullName,
          moduleId: module.id,
          moduleName: module.name,
          score: nextCandidate.score,
        });

        gap -= 1;
      }
    });

    return {
      modules: workingModules,
      assignments,
      skipped,
    };
  },
};

export function getMockAssignmentScore(employee: Employee, module: CareModule, rules: Rule[] = rulesMock) {
  const activeRuleCodes = new Set(rules.filter((rule) => rule.enabled).map((rule) => rule.code));
  const requiredMatches = module.requiredSkills.filter((skill) => employee.skills.includes(skill)).length;
  const skillScore = Math.min(70, requiredMatches * 35);
  const workloadPenalty = employee.weeklyHours >= 40 ? 12 : employee.weeklyHours >= 32 ? 6 : 0;
  const statusPenalty = employee.status === "busy" ? 8 : employee.status === "off" ? 25 : 0;
  const compatibilityBonus = employee.moduleIds.includes(module.id) ? 18 : employee.moduleIds.some((id) => id !== module.id) ? 8 : 0;
  const rulesBonus = activeRuleCodes.has("R-HRD-12") && employee.moduleIds.includes(module.id) ? 8 : 0;
  const rulesPenalty =
    (activeRuleCodes.has("R-HRD-07") && employee.weeklyHours >= 40 ? 8 : 0) +
    (activeRuleCodes.has("R-HRD-03") && employee.assignedToday ? 12 : 0) +
    (activeRuleCodes.has("R-BLD-02") && employee.weeklyHours >= 40 ? 6 : 0) +
    (activeRuleCodes.has("R-BLD-01") && employee.status === "busy" ? 6 : 0);

  return Math.max(35, Math.min(99, 50 + skillScore + compatibilityBonus + rulesBonus - workloadPenalty - statusPenalty - rulesPenalty));
}

export function getHoverAssignmentPreview(
  employee: Employee,
  module: CareModule,
  modules: CareModule[],
  rules: Rule[] = rulesMock,
): HoverAssignmentPreview {
  const sourceModule = modules.find((item) => item.assignedEmployeeIds.includes(employee.id));
  const advisoryRuleCodes = getAdvisoryRuleCodes(employee, module, sourceModule, rules);
  const risk = getMockSlotRisk(employee, module, rules);

  return {
    employeeName: employee.fullName,
    moduleName: module.name,
    score: getMockAssignmentScore(employee, module, rules),
    riskLevel: risk.level,
    riskHint: risk.reasons[0],
    advisoryRuleCodes,
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
}: {
  employeeId: string;
  moduleId: string;
  employees?: Employee[];
  modules?: CareModule[];
  rules?: Rule[];
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
  const normalizedRole = `${employee.roleLabel} ${employee.profile}`.toLowerCase();
  const matchesRole =
    employee.moduleIds.includes(module.id) ||
    normalizedRole.includes(module.area.toLowerCase()) ||
    normalizedRole.includes(module.name.toLowerCase());
  const matchesSkill = module.requiredSkills.some((skill) => employee.skills.includes(skill));

  if (activeRuleCodes.has("R-HRD-12") && !matchesRole) {
    return {
      valid: false,
      reason: "R-HRD-12 bloquea la asignacion: el colaborador no cumple el rol base requerido por la dependencia.",
      violatedRuleCodes: ["R-HRD-12"],
    };
  }

  if (activeRuleCodes.has("R-HRD-13") && !matchesSkill) {
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

  if (activeRuleCodes.has("R-HRD-07") && employee.weeklyHours >= 44) {
    return {
      valid: false,
      reason: "R-HRD-07 bloquea la asignacion: el colaborador ya alcanzo el limite semanal de horas del contrato.",
      violatedRuleCodes: ["R-HRD-07"],
    };
  }

  if ((activeRuleCodes.has("R-HRD-03") || activeRuleCodes.has("R-HRD-05")) && employee.assignedToday && !assignedModule) {
    return {
      valid: false,
      reason: "Las reglas R-HRD-03 y R-HRD-05 bloquean la asignacion por descanso minimo entre turnos.",
      violatedRuleCodes: ["R-HRD-03", "R-HRD-05"],
    };
  }

  const advisoryRuleCodes = getAdvisoryRuleCodes(employee, module, assignedModule, activeRules);
  const appliedRuleCodes = activeRules
    .filter((rule) => ["R-HRD-01", "R-HRD-12", "R-HRD-13", "R-HRD-14", "R-HRD-07", "R-HRD-03", "R-HRD-05"].includes(rule.code))
    .map((rule) => rule.code);

  return {
    valid: true,
    appliedRuleCodes,
    advisoryRuleCodes,
  };
}
