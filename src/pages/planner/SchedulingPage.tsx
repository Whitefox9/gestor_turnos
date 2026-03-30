import { DndContext, DragOverlay, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/app/store/auth.store";
import { usePlanningHistoryStore } from "@/app/store/planning-history.store";
import { AICopilotPanel, type CopilotCase } from "@/features/ai-assistant/components/AICopilotPanel";
import { useIncidents } from "@/features/incidents/hooks/useIncidents";
import { useRules } from "@/features/rules/hooks/useRules";
import { ContextDetailPanel } from "@/features/scheduling/components/ContextDetailPanel";
import { EmployeeCard } from "@/features/scheduling/components/EmployeeCard";
import { EmployeeFiltersPanel } from "@/features/scheduling/components/EmployeeFiltersPanel";
import { EmployeeListPanel } from "@/features/scheduling/components/EmployeeListPanel";
import { ModuleBoard } from "@/features/scheduling/components/ModuleBoard";
import { SchedulingActionBar } from "@/features/scheduling/components/SchedulingActionBar";
import { SchedulingToolbar } from "@/features/scheduling/components/SchedulingToolbar";
import { ShiftHistoryStrip } from "@/features/scheduling/components/ShiftHistoryStrip";
import { useAssignmentActions } from "@/features/scheduling/hooks/useAssignmentActions";
import { useSchedulingData } from "@/features/scheduling/hooks/useSchedulingData";
import {
  applyIncidentsToPlanningSlice,
  buildDailyRestOperationalSummary,
  buildDailyAutoAssignmentPlan,
  buildLocalizedIncidentImpacts,
  buildModulesForPlanningSlice,
  getAssignedEmployeeIdsForDate,
  getEmployeeWeekStats,
  getHoverAssignmentPreview,
  getInvalidAssignedEmployeeIdsForModule,
  getMockAssignmentScore,
  getMockModuleRisk,
  getPlanningWeekDays,
  isEmployeeCompatibleWithModule,
  schedulingService,
} from "@/features/scheduling/services/scheduling.service";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { PlannerTopBar } from "@/shared/components/layout/PlannerTopBar";
import type { CareModule } from "@/shared/types/module.types";
import type { Employee } from "@/shared/types/employee.types";
import type { ShiftAssignment, ShiftKind } from "@/shared/types/scheduling.types";

const ASSISTANCE_SHIFTS: ShiftKind[] = ["manana", "tarde", "noche", "noche_larga"];
const DAY_SHIFTS: ShiftKind[] = [...ASSISTANCE_SHIFTS, "descanso_remunerado"];

export function SchedulingPage() {
  const { data, isLoading, filteredEmployees } = useSchedulingData();
  const { data: rulesData } = useRules();
  const { data: incidentsData } = useIncidents();
  const {
    validate,
    simulatePublication,
    publishSchedule,
    reportRelease,
    reportSuccess,
    feedback,
    simulation,
    publicationVersions,
    auditEntries,
    lastRejectedModuleId,
    lastAcceptedModuleId,
    lastAcceptedTargetId,
    lastReleasedTargetId,
    clearFeedback,
  } =
    useAssignmentActions();
  const session = useAuthStore((state) => state.session);
  const setCurrentBoardSnapshot = usePlanningHistoryStore((state) => state.setCurrentBoardSnapshot);
  const currentPlanningDate = usePlanningHistoryStore((state) => state.currentPlanningDate);
  const currentPlanningShift = usePlanningHistoryStore((state) => state.currentPlanningShift);
  const activePlanningDependencyId = usePlanningHistoryStore((state) => state.activePlanningDependencyId);
  const setPlanningDate = usePlanningHistoryStore((state) => state.setPlanningDate);
  const setPlanningShift = usePlanningHistoryStore((state) => state.setPlanningShift);
  const setActivePlanningDependency = usePlanningHistoryStore((state) => state.setActivePlanningDependency);
  const planningRangeStart = usePlanningHistoryStore((state) => state.planningRangeStart);
  const planningRangeEnd = usePlanningHistoryStore((state) => state.planningRangeEnd);
  const setPlanningRange = usePlanningHistoryStore((state) => state.setPlanningRange);
  const weekStartDate = usePlanningHistoryStore((state) => state.weekStartDate);
  const weeklyAssignments = usePlanningHistoryStore((state) => state.weeklyAssignments);
  const hydrateWeeklyAssignments = usePlanningHistoryStore((state) => state.hydrateWeeklyAssignments);
  const setSliceAssignments = usePlanningHistoryStore((state) => state.setSliceAssignments);
  const replaceWeeklyAssignments = usePlanningHistoryStore((state) => state.replaceWeeklyAssignments);
  const activeSliceKey = `${currentPlanningDate}::${currentPlanningShift}`;
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [modulesState, setModulesState] = useState<{ sliceKey: string; modules: CareModule[] } | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedBoardTargetId, setSelectedBoardTargetId] = useState<string | null>(null);
  const [autoAssignDiagnostics, setAutoAssignDiagnostics] = useState<string[] | null>(null);

  const incidents = incidentsData ?? [];
  const baseSliceModules = useMemo(
    () =>
      buildModulesForPlanningSlice({
        modules: data?.modules ?? [],
        assignments: weeklyAssignments,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
      }),
    [data?.modules, weeklyAssignments, currentPlanningDate, currentPlanningShift],
  );
  const sliceModules = useMemo(
    () =>
      applyIncidentsToPlanningSlice({
        modules: baseSliceModules,
        incidents,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
      }),
    [baseSliceModules, incidents, currentPlanningDate, currentPlanningShift],
  );
  const modules = modulesState?.sliceKey === activeSliceKey ? modulesState.modules : sliceModules;
  const employees = data?.employees ?? [];
  const activeRules = (rulesData ?? []).filter((rule) => rule.enabled);
  const effectiveWeeklyAssignments = useMemo(() => {
    if (modulesState?.sliceKey !== activeSliceKey) {
      return weeklyAssignments;
    }

    return syncAssignmentsForSlice({
      baseAssignments: weeklyAssignments,
      planningDate: currentPlanningDate,
      planningShift: currentPlanningShift,
      sliceModulesToPersist: modulesState.modules,
    });
  }, [modulesState, activeSliceKey, weeklyAssignments, currentPlanningDate, currentPlanningShift]);
  const restSummary = useMemo(
    () =>
      buildDailyRestOperationalSummary({
        employees,
        assignments: effectiveWeeklyAssignments,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
        weekStartDate,
      }),
    [employees, effectiveWeeklyAssignments, currentPlanningDate, currentPlanningShift, weekStartDate],
  );
  const localizedIncidentImpacts = useMemo(
    () =>
      buildLocalizedIncidentImpacts({
        incidents,
        modules,
        employees,
        rules: activeRules,
        assignments: effectiveWeeklyAssignments,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
        weekStartDate,
      }),
    [incidents, modules, employees, activeRules, effectiveWeeklyAssignments, currentPlanningDate, currentPlanningShift, weekStartDate],
  );
  const activeIncidentEmployeeIds = new Set(localizedIncidentImpacts.map((impact) => impact.employeeId));
  const selectedIncidentImpact = selectedIncidentId
    ? localizedIncidentImpacts.find((impact) => impact.incidentId === selectedIncidentId) ?? null
    : null;
  const activeSliceIncidentSignature = useMemo(
    () =>
      incidents
        .filter(
          (incident) =>
            incident.status !== "resuelta" &&
            incident.date === currentPlanningDate &&
            incident.shift === currentPlanningShift,
        )
        .map((incident) => `${incident.id}:${incident.status}`)
        .join("|"),
    [incidents, currentPlanningDate, currentPlanningShift],
  );
  const assignedEmployeesTodayIds = useMemo(
    () => new Set(getAssignedEmployeeIdsForDate(effectiveWeeklyAssignments, currentPlanningDate)),
    [effectiveWeeklyAssignments, currentPlanningDate],
  );
  const contextualPoolEmployees = filteredEmployees.filter((employee) => !activeIncidentEmployeeIds.has(employee.id));
  const eligiblePoolEmployees = contextualPoolEmployees.filter((employee) => !assignedEmployeesTodayIds.has(employee.id));
  const totalSlots = modules.reduce((sum, module) => sum + module.capacity, 0);
  const assignedSlots = modules.reduce((sum, module) => sum + module.assignedEmployeeIds.length, 0);
  const coverage = totalSlots > 0 ? Math.round((assignedSlots / totalSlots) * 100) : 0;
  const alertModules = modules.filter((module) => module.assignedEmployeeIds.length < module.capacity).length;
  const unassignedEmployees = eligiblePoolEmployees.length;

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );
  const ruleRiskAlerts = modules.filter((module) => {
    const assignedEmployees = employees.filter((employee) => module.assignedEmployeeIds.includes(employee.id));
    return getMockModuleRisk(module, assignedEmployees, activeRules).level !== "none";
  }).length;
  const hoveredModule = hoveredTargetId
    ? modules.find((module) => module.id === hoveredTargetId.split("::")[0])
    : null;
  const hoverPreview =
    activeEmployee && hoveredModule
      ? getHoverAssignmentPreview(activeEmployee, hoveredModule, modules, activeRules, effectiveWeeklyAssignments, currentPlanningDate, currentPlanningShift)
      : null;
  const activeBoardModule =
    activePlanningDependencyId === "all"
      ? null
      : modules.find((module) => module.id === activePlanningDependencyId) ?? null;
  const selectedBoardContext = useMemo(() => {
    if (!selectedBoardTargetId) {
      return null;
    }

    if (selectedBoardTargetId.startsWith("module::")) {
      const moduleId = selectedBoardTargetId.replace("module::", "");
      const module = modules.find((item) => item.id === moduleId);

      if (!module) {
        return null;
      }

      const invalidAssignedEmployeeIds = getInvalidAssignedEmployeeIdsForModule({
        module,
        employees,
        rules: activeRules,
        assignments: effectiveWeeklyAssignments,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
        weekStartDate,
      });
      const shiftHours = currentPlanningShift === "noche_larga" ? 12 : 8;
      const alternatives = eligiblePoolEmployees
        .filter((candidate) => isEmployeeCompatibleWithModule(candidate, module).compatible)
        .filter((candidate) => {
          const stats = getEmployeeWeekStats({
            employeeId: candidate.id,
            assignments: effectiveWeeklyAssignments,
            weekStartDate,
            throughDate: currentPlanningDate,
            throughShift: currentPlanningShift,
          });
          return stats.totalHours + shiftHours <= 36;
        })
        .map((candidate) => ({
          employee: candidate,
          score: getMockAssignmentScore(candidate, module, activeRules, effectiveWeeklyAssignments, currentPlanningDate, currentPlanningShift),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);

      return {
        type: "module" as const,
        module,
        targetId: selectedBoardTargetId,
        invalidAssignedEmployeeIds,
        assignedEmployees: employees.filter((employee) => module.assignedEmployeeIds.includes(employee.id)),
        coverageGap: Math.max(module.capacity - module.assignedEmployeeIds.length, 0),
        alternatives,
      };
    }

    const [moduleId, slotId] = selectedBoardTargetId.split("::");
    const slotIndex = Number(slotId?.replace("slot-", ""));
    const module = modules.find((item) => item.id === moduleId);

    if (!module || Number.isNaN(slotIndex)) {
      return null;
    }

    const employeeId = module.assignedEmployeeIds[slotIndex];
    const employee = employeeId ? employees.find((item) => item.id === employeeId) ?? null : null;
    const invalidAssignedEmployeeIds = getInvalidAssignedEmployeeIdsForModule({
      module,
      employees,
      rules: activeRules,
      assignments: effectiveWeeklyAssignments,
      planningDate: currentPlanningDate,
      planningShift: currentPlanningShift,
      weekStartDate,
    });
    const shiftHours = currentPlanningShift === "noche_larga" ? 12 : 8;
      const alternatives = eligiblePoolEmployees
        .filter((candidate) => isEmployeeCompatibleWithModule(candidate, module).compatible)
      .filter((candidate) => {
        const stats = getEmployeeWeekStats({
          employeeId: candidate.id,
          assignments: effectiveWeeklyAssignments,
          weekStartDate,
          throughDate: currentPlanningDate,
          throughShift: currentPlanningShift,
        });
        return stats.totalHours + shiftHours <= 36;
      })
      .map((candidate) => ({
        employee: candidate,
        score: getMockAssignmentScore(candidate, module, activeRules, effectiveWeeklyAssignments, currentPlanningDate, currentPlanningShift),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    return {
      type: "slot" as const,
      module,
      slotIndex,
      targetId: selectedBoardTargetId,
      employee,
      isGap: !employee,
      isInvalid: employee ? invalidAssignedEmployeeIds.includes(employee.id) : false,
      alternatives,
    };
  }, [
    selectedBoardTargetId,
    modules,
    employees,
    activeRules,
    effectiveWeeklyAssignments,
    currentPlanningDate,
    currentPlanningShift,
    weekStartDate,
    eligiblePoolEmployees,
  ]);
  const copilotCase = useMemo<CopilotCase | null>(() => {
    if (selectedIncidentImpact) {
      return {
        id: `incident-${selectedIncidentImpact.incidentId}`,
        label: "Novedad activa",
        title: `${selectedIncidentImpact.moduleName} · ${selectedIncidentImpact.shift}`,
        summary: `${selectedIncidentImpact.employeeName} sale del turno. La meta es cubrir solo este hueco sin tocar otras asignaciones válidas.`,
        severity: selectedIncidentImpact.severity === "critica" ? "critical" : "warning",
        meta: [
          { label: "Empleado", value: selectedIncidentImpact.employeeName, tone: "danger" },
          { label: "Dependencia", value: selectedIncidentImpact.moduleName, tone: "warning" },
          { label: "Horas liberadas", value: `${selectedIncidentImpact.removedHours}h`, tone: "info" },
        ],
        primaryRecommendation: selectedIncidentImpact.replacementSuggestions[0]
          ? {
              title: `Reemplazar con ${selectedIncidentImpact.replacementSuggestions[0].employeeName}`,
              summary: selectedIncidentImpact.replacementSuggestions[0].reason,
              impact: `Impacto en horas: ${selectedIncidentImpact.replacementSuggestions[0].currentWeeklyHours}h → ${selectedIncidentImpact.replacementSuggestions[0].projectedWeeklyHours}h. Reglas duras OK.`,
              actionLabel: "Aplicar sugerencia",
            }
          : null,
        alternatives: selectedIncidentImpact.replacementSuggestions.slice(0, 3).map((suggestion) => ({
          id: suggestion.employeeId,
          title: suggestion.employeeName,
          summary: suggestion.reason,
          meta: [
            { label: "Fit", value: `${suggestion.score}`, tone: "info" },
            { label: "Horas", value: `${suggestion.projectedWeeklyHours}h`, tone: "neutral" },
          ],
        })),
        quickPrompts: [
          "Explica por qué este reemplazo es el mejor",
          "Compara las dos mejores alternativas",
          "Simula el impacto de no reemplazar",
        ],
      };
    }

    if (!selectedBoardContext) {
      return null;
    }

    if (selectedBoardContext.type === "module") {
      const hasInvalidAssignments = selectedBoardContext.invalidAssignedEmployeeIds.length > 0;
      const hasCoverageGap = selectedBoardContext.coverageGap > 0;
      const shiftLabel =
        currentPlanningShift === "manana"
          ? "Mañana"
          : currentPlanningShift === "tarde"
            ? "Tarde"
            : currentPlanningShift === "noche"
              ? "Noche"
              : currentPlanningShift === "noche_larga"
                ? "Noche larga"
                : "Descanso remunerado";

      if (hasInvalidAssignments) {
        return {
          id: selectedBoardContext.targetId,
          label: "Módulo en revisión",
          title: `${selectedBoardContext.module.name} · ${shiftLabel}`,
          summary: "Hay asignaciones válidas que conviene preservar y un subconjunto inválido que debe limpiarse sin generar cascada.",
          severity: "critical",
          meta: [
            { label: "Inválidos", value: `${selectedBoardContext.invalidAssignedEmployeeIds.length}`, tone: "danger" },
            { label: "Cobertura", value: `${selectedBoardContext.assignedEmployees.length}/${selectedBoardContext.module.capacity}`, tone: "warning" },
            { label: "Turno", value: shiftLabel, tone: "info" },
          ],
          primaryRecommendation: {
            actionKey: "reset-invalid-module",
            title: `Vaciar inválidos de ${selectedBoardContext.module.name}`,
            summary: "Se liberan solo las asignaciones en conflicto. El resto del módulo permanece estable.",
            impact: `Se conservan ${selectedBoardContext.assignedEmployees.length - selectedBoardContext.invalidAssignedEmployeeIds.length} asignaciones válidas y se limpian ${selectedBoardContext.invalidAssignedEmployeeIds.length} slots.`,
            actionLabel: "Vaciar inválidos",
          },
          alternatives: [
            {
              id: `${selectedBoardContext.module.id}-auto`,
              actionKey: "autoassign-module",
              title: "Recompletar el módulo",
              summary: "Después de limpiar, cubrir solo los cupos faltantes con candidatos compatibles.",
            },
            {
              id: `${selectedBoardContext.module.id}-reset`,
              actionKey: "reset-module",
              title: "Vaciar módulo completo",
              summary: "Opción más agresiva. Conviene solo si el patrón completo del módulo debe rearmarse.",
            },
          ],
          quickPrompts: [
            "Explica qué reglas invalidan este módulo",
            "Simula la limpieza parcial del módulo",
            "Compara limpiar inválidos vs vaciar completo",
          ],
        };
      }

      if (hasCoverageGap) {
        return {
          id: selectedBoardContext.targetId,
          label: "Módulo con brecha",
          title: `${selectedBoardContext.module.name} · ${shiftLabel}`,
          summary: "El módulo tiene cupos pendientes. El copiloto sugiere completar solo este contexto y no tocar otras dependencias.",
          severity: "warning",
          meta: [
            { label: "Faltantes", value: `${selectedBoardContext.coverageGap}`, tone: "warning" },
            { label: "Cobertura", value: `${selectedBoardContext.assignedEmployees.length}/${selectedBoardContext.module.capacity}`, tone: "info" },
            { label: "Candidatos", value: `${selectedBoardContext.alternatives.length}`, tone: "success" },
          ],
          primaryRecommendation: {
            actionKey: "autoassign-module",
            title: `Completar ${selectedBoardContext.module.name}`,
            summary: "Cubrir solo los cupos faltantes del módulo seleccionado con los mejores candidatos disponibles.",
            impact: `No se modifican otros módulos. Se intenta cubrir hasta ${selectedBoardContext.coverageGap} cupos pendientes.`,
            actionLabel: "Autoasignar módulo",
          },
          alternatives: selectedBoardContext.alternatives.map((alternative) => ({
            id: alternative.employee.id,
            title: alternative.employee.fullName,
            summary: "Candidato elegible para cubrir este módulo sin reabrir asignaciones estables.",
            meta: [
              { label: "Fit", value: `${alternative.score}`, tone: "info" },
              {
                label: "Horas",
                value: `${getEmployeeWeekStats({
                  employeeId: alternative.employee.id,
                  assignments: effectiveWeeklyAssignments,
                  weekStartDate,
                  throughDate: currentPlanningDate,
                  throughShift: currentPlanningShift,
                }).totalHours}h`,
                tone: "neutral",
              },
            ],
          })),
          quickPrompts: [
            "Compara los mejores candidatos del módulo",
            "Explica por qué este módulo sigue descubierto",
            "Simula completar solo este contexto",
          ],
        };
      }

      return {
        id: selectedBoardContext.targetId,
        label: "Módulo estable",
        title: `${selectedBoardContext.module.name} · ${shiftLabel}`,
        summary: "El módulo está atendido. Si quieres intervenirlo, conviene hacerlo desde el copiloto y no desde botones distribuidos en el board.",
        severity: "info",
        meta: [
          { label: "Cobertura", value: `${selectedBoardContext.assignedEmployees.length}/${selectedBoardContext.module.capacity}`, tone: "success" },
          { label: "Turno", value: shiftLabel, tone: "info" },
          { label: "Estado", value: "Estable", tone: "success" },
        ],
        primaryRecommendation: {
          actionKey: "reset-module",
          title: `Vaciar ${selectedBoardContext.module.name}`,
          summary: "Devuelve al pool solo este módulo si quieres reconstruirlo manualmente o volver a autoasignarlo.",
          impact: `Se liberan ${selectedBoardContext.assignedEmployees.length} colaboradores solo en este contexto.`,
          actionLabel: "Vaciar módulo",
        },
        alternatives: [
          {
            id: `${selectedBoardContext.module.id}-preserve`,
            title: "Mantener como está",
            summary: "No intervenir el módulo y preservar el patrón vigente.",
          },
        ],
        quickPrompts: [
          "Explica por qué este módulo se considera estable",
          "Simula vaciar solo este módulo",
          "Compara mantener vs reconstruir este contexto",
        ],
      };
    }

    if (selectedBoardContext.isGap) {
      const primaryAlternative = selectedBoardContext.alternatives[0];

      return {
        id: selectedBoardContext.targetId,
        label: "Brecha operativa",
        title: `${selectedBoardContext.module.name} · Slot ${selectedBoardContext.slotIndex + 1}`,
        summary: `Hay un cupo libre en ${selectedBoardContext.module.shiftLabel}. El copiloto busca cubrirlo sin mover otras dependencias.`,
        severity: "warning",
        meta: [
          { label: "Dependencia", value: selectedBoardContext.module.name, tone: "warning" },
          { label: "Turno", value: selectedBoardContext.module.shiftLabel, tone: "info" },
          { label: "Estado", value: "Slot libre", tone: "danger" },
        ],
        primaryRecommendation: primaryAlternative
          ? {
              actionKey: "fill-slot",
              title: `Asignar a ${primaryAlternative.employee.fullName}`,
              summary: `Mejor candidato compatible para cubrir el hueco actual con fit ${primaryAlternative.score}.`,
              impact: `Impacto en horas: ${getEmployeeWeekStats({
                employeeId: primaryAlternative.employee.id,
                assignments: effectiveWeeklyAssignments,
                weekStartDate,
                throughDate: currentPlanningDate,
                throughShift: currentPlanningShift,
              }).totalHours}h → ${getEmployeeWeekStats({
                employeeId: primaryAlternative.employee.id,
                assignments: effectiveWeeklyAssignments,
                weekStartDate,
                throughDate: currentPlanningDate,
                throughShift: currentPlanningShift,
              }).totalHours + (currentPlanningShift === "noche_larga" ? 12 : 8)}h.`,
              actionLabel: "Aplicar sugerencia",
            }
          : null,
        alternatives: selectedBoardContext.alternatives.map((alternative) => ({
          id: alternative.employee.id,
          title: alternative.employee.fullName,
          summary: `${selectedBoardContext.module.area} compatible y disponible para esta slice.`,
          meta: [
            { label: "Fit", value: `${alternative.score}`, tone: "info" },
            {
              label: "Horas",
              value: `${getEmployeeWeekStats({
                employeeId: alternative.employee.id,
                assignments: effectiveWeeklyAssignments,
                weekStartDate,
                throughDate: currentPlanningDate,
                throughShift: currentPlanningShift,
              }).totalHours}h`,
              tone: "neutral",
            },
          ],
        })),
        quickPrompts: [
          "Compara los candidatos disponibles",
          "Explica por qué este hueco es crítico",
          "Simula el impacto de dejarlo vacío",
        ],
      };
    }

    if (selectedBoardContext.employee && selectedBoardContext.isInvalid) {
      return {
        id: selectedBoardContext.targetId,
        label: "Asignación en revisión",
        title: `${selectedBoardContext.employee.fullName} en ${selectedBoardContext.module.name}`,
        summary: "La asignación actual presenta conflicto con reglas activas. Conviene liberar este slot y resolverlo desde el copiloto.",
        severity: "critical",
        meta: [
          { label: "Empleado", value: selectedBoardContext.employee.fullName, tone: "danger" },
          { label: "Dependencia", value: selectedBoardContext.module.name, tone: "warning" },
          { label: "Estado", value: "Inválido", tone: "danger" },
        ],
        primaryRecommendation: {
          actionKey: "release-invalid-slot",
          title: "Liberar slot inválido",
          summary: "Retira esta asignación para evitar arrastrar una decisión inválida al resto del plan.",
          impact: "No genera cascada: solo libera este contexto para reasignación manual o sugerida.",
          actionLabel: "Liberar slot",
        },
        alternatives: selectedBoardContext.alternatives.map((alternative) => ({
          id: alternative.employee.id,
          title: alternative.employee.fullName,
          summary: "Alternativa compatible para relevar el slot si decides reemplazarlo después.",
          meta: [
            { label: "Fit", value: `${alternative.score}`, tone: "info" },
            {
              label: "Horas",
              value: `${getEmployeeWeekStats({
                employeeId: alternative.employee.id,
                assignments: effectiveWeeklyAssignments,
                weekStartDate,
                throughDate: currentPlanningDate,
                throughShift: currentPlanningShift,
              }).totalHours}h`,
              tone: "neutral",
            },
          ],
        })),
        quickPrompts: [
          "Explica qué regla invalida esta asignación",
          "Compara candidatos para relevar el slot",
          "Simula la liberación de este contexto",
        ],
      };
    }

    if (selectedBoardContext.employee) {
      return {
        id: selectedBoardContext.targetId,
        label: "Asignación estable",
        title: `${selectedBoardContext.employee.fullName} en ${selectedBoardContext.module.name}`,
        summary: "La asignación actual se ve estable. El copiloto prioriza preservar este patrón mientras no exista novedad o conflicto.",
        severity: "info",
        meta: [
          { label: "Empleado", value: selectedBoardContext.employee.fullName, tone: "success" },
          { label: "Dependencia", value: selectedBoardContext.module.name, tone: "info" },
          { label: "Estado", value: "Estable", tone: "success" },
        ],
        primaryRecommendation: {
          actionKey: "keep-slot",
          title: "Mantener asignación",
          summary: "No hay motivo operativo fuerte para intervenir este slot ahora.",
          impact: "Se preserva la estabilidad y se evita abrir cambios innecesarios en cascada.",
          actionLabel: "Mantener",
          disabled: true,
        },
        alternatives: selectedBoardContext.alternatives.map((alternative) => ({
          id: alternative.employee.id,
          title: alternative.employee.fullName,
          summary: "Alternativa potencial si aparece una novedad futura en esta dependencia.",
          meta: [
            { label: "Fit", value: `${alternative.score}`, tone: "info" },
            {
              label: "Horas",
              value: `${getEmployeeWeekStats({
                employeeId: alternative.employee.id,
                assignments: effectiveWeeklyAssignments,
                weekStartDate,
                throughDate: currentPlanningDate,
                throughShift: currentPlanningShift,
              }).totalHours}h`,
              tone: "neutral",
            },
          ],
        })),
        quickPrompts: [
          "Explica por qué se considera estable",
          "Compara con otro candidato",
          "Simula qué pasa si se libera este slot",
        ],
      };
    }

    return null;
  }, [selectedIncidentImpact, selectedBoardContext, currentPlanningShift]);
  const [isSimulating, setIsSimulating] = useState(false);
  const actorName = session?.user.fullName ?? "Planificador mock";
  const weekDays = useMemo(() => getPlanningWeekDays(weekStartDate), [weekStartDate]);
  const weekDayStatuses = useMemo(
    () =>
      weekDays.map((day) => {
        const relevantModules = data?.modules ?? [];

        const completedSlices = relevantModules.reduce((sum, module) => {
          return (
            sum +
            ASSISTANCE_SHIFTS.filter((shift) => {
              const assignedCount = effectiveWeeklyAssignments.filter(
                (assignment) =>
                  assignment.date === day.date &&
                  assignment.shift === shift &&
                  assignment.moduleId === module.id,
              ).length;

              return assignedCount >= module.capacity;
            }).length
          );
        }, 0);

        const totalSlices = relevantModules.length * ASSISTANCE_SHIFTS.length;
        const isComplete = totalSlices > 0 && completedSlices === totalSlices;
        const hasAnyAssignments = effectiveWeeklyAssignments.some((assignment) => assignment.date === day.date);

        return {
          date: day.date,
          isComplete,
          hasAnyAssignments,
        };
      }),
    [weekDays, data?.modules, effectiveWeeklyAssignments],
  );

  useEffect(() => {
    if (selectedIncidentId && !localizedIncidentImpacts.some((impact) => impact.incidentId === selectedIncidentId)) {
      setSelectedIncidentId(null);
    }
  }, [localizedIncidentImpacts, selectedIncidentId]);

  useEffect(() => {
    if (activePlanningDependencyId !== "all" && !modules.some((module) => module.id === activePlanningDependencyId)) {
      setActivePlanningDependency("all");
      setSelectedBoardTargetId(null);
    }
  }, [activePlanningDependencyId, modules, setActivePlanningDependency]);

  useEffect(() => {
    if (weeklyAssignments.length === 0 && data?.assignments?.length) {
      hydrateWeeklyAssignments(data.assignments);
    }
  }, [data?.assignments, hydrateWeeklyAssignments, weeklyAssignments.length]);

  useEffect(() => {
    if (modules.length === 0) {
      return;
    }

    const snapshot = modules.map((module) => ({
      id: module.id,
      name: module.name,
      area: module.area,
      shiftLabel: module.shiftLabel,
      capacity: module.capacity,
      assignedEmployeeIds: [...module.assignedEmployeeIds],
    }));

    setSliceAssignments(currentPlanningDate, currentPlanningShift, snapshot);
    setCurrentBoardSnapshot(
      snapshot,
    );
  }, [modules, currentPlanningDate, currentPlanningShift, setCurrentBoardSnapshot, setSliceAssignments]);

  function setLocalModules(nextModules: CareModule[]) {
    setModulesState({
      sliceKey: activeSliceKey,
      modules: nextModules,
    });
  }

  function buildSliceAssignmentsFromModules(sliceModulesToPersist: CareModule[], planningDate: string, planningShift: ShiftKind) {
    return sliceModulesToPersist.flatMap<ShiftAssignment>((module, moduleIndex) =>
      module.assignedEmployeeIds.map((employeeId, employeeIndex) => ({
        id: `assignment-${planningDate}-${planningShift}-${module.id}-${employeeId}-${moduleIndex}-${employeeIndex}`,
        employeeId,
        moduleId: module.id,
        date: planningDate,
        shift: planningShift,
        valid: true,
        createdAt: `${planningDate}T00:00:00.000Z`,
        updatedAt: `${planningDate}T00:00:00.000Z`,
      })),
    );
  }

  function syncAssignmentsForSlice({
    baseAssignments,
    planningDate,
    planningShift,
    sliceModulesToPersist,
  }: {
    baseAssignments: ShiftAssignment[];
    planningDate: string;
    planningShift: ShiftKind;
    sliceModulesToPersist: CareModule[];
  }) {
    const persistedSliceAssignments = buildSliceAssignmentsFromModules(sliceModulesToPersist, planningDate, planningShift);

    return [
      ...baseAssignments.filter(
        (assignment) => !(assignment.date === planningDate && assignment.shift === planningShift),
      ),
      ...persistedSliceAssignments,
    ];
  }

  async function handleValidateRules() {
    setIsSimulating(true);
    try {
      await simulatePublication({
        employees,
        modules,
        rules: activeRules,
        actorName,
        assignments: effectiveWeeklyAssignments,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
        weekStartDate,
      });
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleSimulate() {
    setIsSimulating(true);
    try {
      await simulatePublication({
        employees,
        modules,
        rules: activeRules,
        actorName,
        assignments: effectiveWeeklyAssignments,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
        weekStartDate,
      });
    } finally {
      setIsSimulating(false);
    }
  }

  async function handlePublish() {
    setIsSimulating(true);
    try {
      await publishSchedule({
        employees,
        modules,
        rules: activeRules,
        actorName,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
        assignments: effectiveWeeklyAssignments,
        weekStartDate,
      });
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleAutoAssign(targetModuleId?: string) {
    setIsSimulating(true);
    try {
      const effectiveTargetModuleId = targetModuleId;
      const plan = buildDailyAutoAssignmentPlan({
        employees,
        modules: data?.modules ?? [],
        rules: activeRules,
        assignments: effectiveWeeklyAssignments,
        planningDate: currentPlanningDate,
        weekStartDate,
        targetModuleId: effectiveTargetModuleId,
      });
      const nextAssignments = plan.assignments;

      const refreshedActiveSliceModules = applyIncidentsToPlanningSlice({
        modules: buildModulesForPlanningSlice({
          modules: data?.modules ?? [],
          assignments: nextAssignments,
          planningDate: currentPlanningDate,
          planningShift: currentPlanningShift,
        }),
        incidents,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
      });
      const persistedDayAssignments = nextAssignments.filter((assignment) => assignment.date === currentPlanningDate);
      const persistedVisibleSliceCount = persistedDayAssignments.filter(
        (assignment) => assignment.shift === currentPlanningShift,
      ).length;
      const boardVisibleSliceCount = refreshedActiveSliceModules.reduce(
        (sum, module) => sum + module.assignedEmployeeIds.length,
        0,
      );
      const assignedEmployeesTodayCount = new Set(persistedDayAssignments.map((assignment) => assignment.employeeId)).size;
      const diagnostics = [
        `${currentPlanningDate} · ${effectiveTargetModuleId ? activeBoardModule?.name ?? "dependencia" : "todas las dependencias"}`,
        `Generadas por el motor: ${plan.appliedAssignments.length}`,
        `Persistidas en el día activo: ${persistedDayAssignments.length}`,
        `Persistidas en la jornada visible (${getShiftLabel(currentPlanningShift)}): ${persistedVisibleSliceCount}`,
        `Leídas por el board visible: ${boardVisibleSliceCount}`,
        `Colaboradores únicos asignados hoy: ${assignedEmployeesTodayCount}`,
        ...DAY_SHIFTS.map((shift) => {
          const generated = plan.perShiftCounts.find((item) => item.shift === shift)?.count ?? 0;
          const persisted = persistedDayAssignments.filter((assignment) => assignment.shift === shift).length;
          return `${getShiftLabel(shift)} -> generadas ${generated} · persistidas ${persisted}`;
        }),
      ];

      replaceWeeklyAssignments(nextAssignments);
      setLocalModules(refreshedActiveSliceModules);
      setAutoAssignDiagnostics(diagnostics);
      reportSuccess({
        message:
          plan.appliedAssignments.length > 0
            ? effectiveTargetModuleId
              ? `Autoasignación completada: ${plan.appliedAssignments.length} asignaciones aplicadas en todas las jornadas de ${activeBoardModule?.name ?? "la dependencia seleccionada"}.`
              : `Autoasignación completada: ${plan.appliedAssignments.length} asignaciones aplicadas para el día activo completo.`
            : "La autoasignación no encontró candidatos válidos con las reglas activas.",
        details: [
          `${currentPlanningDate}: se recalculó el día activo completo con una sola bolsa operativa por fecha.`,
          ...DAY_SHIFTS.map((shift) => {
            const count = plan.perShiftCounts.find((item) => item.shift === shift)?.count ?? 0;
            return `${getShiftLabel(shift)}: ${count} asignaciones`;
          }),
          ...plan.appliedAssignments.slice(0, 8).map(
            (assignment) => `${assignment.employeeName} -> ${assignment.moduleName} · ${getShiftLabel(assignment.shift)} (Fit ${assignment.score})`,
          ),
          ...plan.skipped.slice(0, 4).map(
            (item) => `${item.moduleName} · ${getShiftLabel(item.shift)}: ${item.reason}`,
          ),
        ],
      });
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleAutoAssignOnlyEmpty() {
    setIsSimulating(true);
    try {
      const currentModules = modules;
      const plan = schedulingService.buildAutoAssignmentPlan({
        employees,
        modules: currentModules,
        rules: activeRules,
        onlyEmptyModules: true,
        assignments: effectiveWeeklyAssignments,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
        weekStartDate,
      });

      setLocalModules(plan.modules);
      reportSuccess({
        message:
          plan.assignments.length > 0
            ? currentPlanningShift === "descanso_remunerado"
              ? `Autoasignación de descansos sobre módulos vacíos completada: ${plan.assignments.length} descansos aplicados sin tocar módulos ya atendidos.`
              : `Autoasignación sobre módulos vacíos completada: ${plan.assignments.length} coberturas aplicadas sin tocar módulos ya atendidos.`
            : currentPlanningShift === "descanso_remunerado"
              ? "No se encontraron módulos vacíos con candidatos válidos para asignar descanso."
              : "No se encontraron módulos completamente vacíos con candidatos válidos para autoasignar.",
          details: [
            ...plan.assignments.slice(0, 6).map((assignment) => `${assignment.employeeName} -> ${assignment.moduleName} (Fit ${assignment.score})`),
            ...plan.skipped.slice(0, 4).map((item) => `${item.moduleName}: ${item.reason}`),
        ],
      });
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleAutoAssignHighRisk() {
    setIsSimulating(true);
    try {
      if (currentPlanningShift === "descanso_remunerado") {
        reportSuccess({
          message: "El modo crítico no aplica sobre descanso remunerado.",
          details: ["El descanso es una condición semanal de la persona, no un módulo por cubrir."],
        });
        return;
      }

      const currentModules = modules;
      const plan = schedulingService.buildAutoAssignmentPlan({
        employees,
        modules: currentModules,
        rules: activeRules,
        onlyHighRiskModules: true,
        assignments: effectiveWeeklyAssignments,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
        weekStartDate,
      });

      setLocalModules(plan.modules);
      reportSuccess({
        message:
          plan.assignments.length > 0
            ? `Autoasignación crítica completada: ${plan.assignments.length} coberturas aplicadas sobre módulos de riesgo alto.`
            : "No se encontraron módulos de riesgo alto con candidatos válidos para completar cupos pendientes.",
        details: [
          ...plan.assignments.slice(0, 6).map((assignment) => `${assignment.employeeName} -> ${assignment.moduleName} (Fit ${assignment.score})`),
          ...plan.skipped.slice(0, 4).map((item) => `${item.moduleName}: ${item.reason}`),
        ],
      });
    } finally {
      setIsSimulating(false);
    }
  }

  function handleResetAssignments() {
    const releasedAssignments = effectiveWeeklyAssignments.filter((assignment) => assignment.date === currentPlanningDate);
    const releasedCount = releasedAssignments.length;
    const affectedModules = new Set(releasedAssignments.map((assignment) => assignment.moduleId)).size;
    const affectedShifts = new Set(releasedAssignments.map((assignment) => assignment.shift)).size;

    if (releasedCount === 0) {
      reportSuccess({
        message: "No había asignaciones para devolver en el día activo.",
        details: [`${currentPlanningDate} · todas las jornadas`],
      });
      return;
    }

    replaceWeeklyAssignments(effectiveWeeklyAssignments.filter((assignment) => assignment.date !== currentPlanningDate));
    clearFeedback();
    setAutoAssignDiagnostics(null);
    setModulesState(null);
    reportSuccess({
      message: "Todas las asignaciones del día activo fueron devueltas al pool.",
      details: [
        `${releasedCount} asignaciones liberadas en ${affectedModules} dependencias y ${affectedShifts} jornadas del ${currentPlanningDate}.`,
        "El tablero quedó limpio en todas las jornadas para reasignación manual o autoasignación.",
      ],
    });
  }

  function handleResetModule(moduleId: string) {
    const currentModules = modules;
    const targetModule = currentModules.find((module) => module.id === moduleId);

    if (!targetModule || targetModule.assignedEmployeeIds.length === 0) {
      return;
    }

    setLocalModules(
      currentModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              assignedEmployeeIds: [],
            }
          : module,
      ),
    );
    clearFeedback();
    setAutoAssignDiagnostics(null);
    reportSuccess({
      message: `${targetModule.name} fue devuelto al pool.`,
      moduleId,
      details: [
        `${targetModule.assignedEmployeeIds.length} colaboradores liberados en ${currentPlanningDate} · ${currentPlanningShift}.`,
        "El módulo quedó listo para reasignación manual o autoasignación puntual.",
      ],
    });
  }

  function handleResetInvalidAssignments(moduleId: string) {
    const currentModules = modules;
    const targetModule = currentModules.find((module) => module.id === moduleId);

    if (!targetModule) {
      return;
    }

    const invalidAssignedEmployeeIds = getInvalidAssignedEmployeeIdsForModule({
      module: targetModule,
      employees,
      rules: activeRules,
      assignments: effectiveWeeklyAssignments,
      planningDate: currentPlanningDate,
      planningShift: currentPlanningShift,
      weekStartDate,
    });

    if (invalidAssignedEmployeeIds.length === 0) {
      return;
    }

    setLocalModules(
      currentModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              assignedEmployeeIds: module.assignedEmployeeIds.filter((employeeId) => !invalidAssignedEmployeeIds.includes(employeeId)),
            }
          : module,
      ),
    );
    clearFeedback();
    setAutoAssignDiagnostics(null);
    reportSuccess({
      message: `${targetModule.name} limpió ${invalidAssignedEmployeeIds.length} asignaciones inválidas.`,
      moduleId,
      details: [
        `${currentPlanningDate} · ${currentPlanningShift}`,
        "Se liberaron solo slots en conflicto con reglas duras activas.",
      ],
    });
  }

  function handleClearInvalidSlots() {
    const currentModules = modules;
    let releasedCount = 0;
    let affectedModules = 0;

    const nextModules = currentModules.map((module) => {
      const invalidAssignedEmployeeIds = getInvalidAssignedEmployeeIdsForModule({
        module,
        employees,
        rules: activeRules,
        assignments: effectiveWeeklyAssignments,
        planningDate: currentPlanningDate,
        planningShift: currentPlanningShift,
        weekStartDate,
      });

      if (invalidAssignedEmployeeIds.length === 0) {
        return module;
      }

      releasedCount += invalidAssignedEmployeeIds.length;
      affectedModules += 1;

      return {
        ...module,
        assignedEmployeeIds: module.assignedEmployeeIds.filter((employeeId) => !invalidAssignedEmployeeIds.includes(employeeId)),
      };
    });

    if (releasedCount === 0) {
      reportSuccess({
        message: "No se encontraron slots inválidos para vaciar en la slice activa.",
        details: [`${currentPlanningDate} · ${currentPlanningShift}`],
      });
      return;
    }

    setLocalModules(nextModules);
    clearFeedback();
    setAutoAssignDiagnostics(null);
    reportSuccess({
      message: `Se vaciaron ${releasedCount} slots inválidos en ${affectedModules} dependencias.`,
      details: [
        `${currentPlanningDate} · ${currentPlanningShift}`,
        "El tablero quedó listo para corrección manual o autoasignación dirigida.",
      ],
    });
  }

  async function handleApplySuggestedReplacement(incidentId: string, employeeId: string) {
    const impact = localizedIncidentImpacts.find((item) => item.incidentId === incidentId);
    const employee = employees.find((item) => item.id === employeeId);

    if (!impact || !employee) {
      return;
    }

    clearFeedback();
    setAutoAssignDiagnostics(null);
    const applied = await applyAssignment(employee, `${impact.moduleId}::incident-replacement`);

    if (!applied) {
      return;
    }

    reportSuccess({
      message: `${impact.employeeName} fue reemplazado por ${employee.fullName} en ${impact.moduleName}.`,
      moduleId: impact.moduleId,
      details: [
        `${impact.date} · ${impact.shift}`,
        `${employee.fullName} pasa de ${getEmployeeWeekStats({
          employeeId: employee.id,
          assignments: effectiveWeeklyAssignments,
          weekStartDate,
          throughDate: currentPlanningDate,
          throughShift: currentPlanningShift,
        }).totalHours}h a ${getEmployeeWeekStats({
          employeeId: employee.id,
          assignments: effectiveWeeklyAssignments,
          weekStartDate,
          throughDate: currentPlanningDate,
          throughShift: currentPlanningShift,
        }).totalHours + impact.removedHours}h semanales.`,
        "Se preservó el resto de la programación sin cambios en cascada.",
      ],
    });
  }

  function handleManualAdjustment(incidentId: string) {
    const impact = localizedIncidentImpacts.find((item) => item.incidentId === incidentId);

    if (!impact) {
      return;
    }

    reportSuccess({
      message: `Ajuste manual habilitado para ${impact.moduleName}.`,
      details: [
        `${impact.employeeName} ya fue retirado del contexto afectado.`,
        "Puedes usar drag and drop o asignación rápida sin tocar otras dependencias.",
      ],
    });
  }

  function handleSelectBoardTarget(targetId: string) {
    setSelectedBoardTargetId(targetId);
    setSelectedIncidentId(null);
  }

  function handleSelectModule(moduleId: string) {
    setActivePlanningDependency(moduleId);
    setSelectedBoardTargetId(`module::${moduleId}`);
    setSelectedIncidentId(null);
  }

  function handleSelectModuleShift(moduleId: string, shift: typeof currentPlanningShift) {
    setPlanningShift(shift);
    setActivePlanningDependency(moduleId);
    setSelectedBoardTargetId(`module::${moduleId}`);
    setSelectedIncidentId(null);
  }

  function handleChangeActiveBoardModule(moduleId: string | "all") {
    setActivePlanningDependency(moduleId);

    if (moduleId === "all") {
      setSelectedBoardTargetId(null);
      return;
    }

    setSelectedBoardTargetId(`module::${moduleId}`);
    setSelectedIncidentId(null);
  }

  function handleSelectIncidentCase(incidentId: string) {
    setSelectedIncidentId(incidentId);
    setSelectedBoardTargetId(null);
  }

  async function handleApplyCopilotPrimary() {
    if (selectedIncidentImpact?.replacementSuggestions[0]) {
      await handleApplySuggestedReplacement(
        selectedIncidentImpact.incidentId,
        selectedIncidentImpact.replacementSuggestions[0].employeeId,
      );
      return;
    }

    if (!selectedBoardContext) {
      return;
    }

    if (selectedBoardContext.type === "module") {
      const actionKey = copilotCase?.primaryRecommendation?.actionKey;

      if (actionKey === "reset-invalid-module") {
        handleResetInvalidAssignments(selectedBoardContext.module.id);
        return;
      }

      if (actionKey === "autoassign-module") {
        await handleAutoAssign(selectedBoardContext.module.id);
        return;
      }

      if (actionKey === "reset-module") {
        handleResetModule(selectedBoardContext.module.id);
      }
      return;
    }

    if (selectedBoardContext.isGap && selectedBoardContext.alternatives[0]) {
      clearFeedback();
      await applyAssignment(selectedBoardContext.alternatives[0].employee, selectedBoardContext.targetId);
      reportSuccess({
        message: `${selectedBoardContext.alternatives[0].employee.fullName} fue asignado a ${selectedBoardContext.module.name}.`,
        moduleId: selectedBoardContext.module.id,
        details: [
          `${currentPlanningDate} · ${currentPlanningShift}`,
          "La cobertura se resolvió desde el copiloto sin abrir más controles en el board.",
        ],
      });
      return;
    }

    if (selectedBoardContext.employee && selectedBoardContext.isInvalid) {
      handleUnassign(selectedBoardContext.employee.id, selectedBoardContext.module.id);
    }
  }

  function handleCompareCopilotAlternatives() {
    if (!copilotCase) {
      return;
    }

    reportSuccess({
      message: `Comparativa preparada para ${copilotCase.title}.`,
      details: copilotCase.alternatives.slice(0, 3).map((alternative) => `${alternative.title}: ${alternative.summary}`),
    });
  }

  async function handleSimulateCopilotImpact() {
    if (!copilotCase) {
      return;
    }

    await handleSimulate();
  }

  function handleExplainCopilotDecision() {
    if (!copilotCase?.primaryRecommendation) {
      return;
    }

    reportSuccess({
      message: `Decisión explicada para ${copilotCase.title}.`,
      details: [
        copilotCase.primaryRecommendation.summary,
        copilotCase.primaryRecommendation.impact,
      ],
    });
  }

  function handleCopilotPrompt(prompt: string) {
    if (!copilotCase) {
      return "Selecciona primero un caso del board o una incidencia activa para contextualizar la consulta.";
    }

    return `${copilotCase.title}: ${prompt}. Respuesta mock: el copiloto prioriza resolver el contexto actual sin alterar asignaciones estables en otras dependencias.`;
  }

  function handleDragStart(event: DragStartEvent) {
    const employee = event.active.data.current?.employee as Employee | undefined;
    setActiveEmployee(employee ?? null);
    setHoveredTargetId(null);
    clearFeedback();
  }

  function handleDragOver(event: DragOverEvent) {
    setHoveredTargetId((event.over?.id as string | undefined) ?? null);
  }

  async function applyAssignment(employee: Employee, targetId: string) {
    const moduleId = targetId.split("::")[0];
    const currentModules = modules;
    const isValid = await validate({
      employeeId: employee.id,
      moduleId,
      employees,
      modules: currentModules,
      targetId,
      rules: activeRules,
      assignments: effectiveWeeklyAssignments,
      planningDate: currentPlanningDate,
      planningShift: currentPlanningShift,
      weekStartDate,
    });

    if (!isValid) {
      return false;
    }

    const nextModules = currentModules.map((module) => {
      const alreadyAssigned = module.assignedEmployeeIds.includes(employee.id);
      const nextAssigned = module.id === moduleId && !alreadyAssigned
        ? [...module.assignedEmployeeIds, employee.id]
        : module.assignedEmployeeIds.filter((assignedId) => assignedId !== employee.id);

      return {
        ...module,
        assignedEmployeeIds: nextAssigned,
      };
    });

    setLocalModules(nextModules);
    return true;
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveEmployee(null);
    setHoveredTargetId(null);
    const employee = event.active.data.current?.employee as Employee | undefined;
    const overId = event.over?.id as string | undefined;

    if (!employee || !overId) {
      return;
    }

    await applyAssignment(employee, overId);
  }

  async function handleQuickAssign(employeeId: string, moduleId: string) {
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) {
      return;
    }

    clearFeedback();
    setAutoAssignDiagnostics(null);
    await applyAssignment(employee, `${moduleId}::quick-assign`);
  }

  function handleUnassign(employeeId: string, moduleId: string) {
    const currentModules = modules;
    const module = currentModules.find((item) => item.id === moduleId);
    const employee = employees.find((item) => item.id === employeeId);

    if (!module || !employee || !module.assignedEmployeeIds.includes(employeeId)) {
      return;
    }
    const slotIndex = module.assignedEmployeeIds.indexOf(employeeId);

    setLocalModules(
      currentModules.map((item) =>
        item.id === moduleId
          ? {
              ...item,
              assignedEmployeeIds: item.assignedEmployeeIds.filter((assignedId) => assignedId !== employeeId),
            }
          : item,
      ),
    );
    setAutoAssignDiagnostics(null);
    reportRelease({
      message: `${employee.fullName} devuelto al pool desde ${module.name}.`,
      moduleId,
      targetId: `${moduleId}::slot-${slotIndex}`,
    });
  }

  if (isLoading || !data) {
    return <LoadingState label="Cargando tablero de programacion..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programacion"
        subtitle={`Planificación semanal por persona y jornada. Día activo ${currentPlanningDate}, jornada ${currentPlanningShift} y dependencia ${activeBoardModule?.name ?? "Todas"} sincronizados en el mismo contexto operativo.`}
      />
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/80 shadow-soft backdrop-blur">
        <PlannerTopBar
          periodLabel={`Semana de ${weekDays[0]?.label ?? ""}`}
          coverage={`${coverage}%`}
          alertsCount={alertModules}
          incidentsCount={localizedIncidentImpacts.length}
          unassignedCount={unassignedEmployees}
          peopleCount={employees.length}
          rulesAlertsCount={ruleRiskAlerts}
          searchedShiftsCount={modules.length}
          actionMessage={simulation?.summary}
          actionTone={simulation ? (simulation.canPublish ? "success" : "error") : "neutral"}
          onValidateRules={handleValidateRules}
          onSimulate={handleSimulate}
          onPublish={handlePublish}
          isSimulating={isSimulating}
        />
      </section>
      <ShiftHistoryStrip />
      <SchedulingToolbar
        currentPlanningDate={currentPlanningDate}
        currentPlanningShift={currentPlanningShift}
        activeDependencyName={activeBoardModule?.name ?? "Todas"}
        weekDays={weekDays}
        weekDayStatuses={weekDayStatuses}
        planningRangeStart={planningRangeStart}
        planningRangeEnd={planningRangeEnd}
        onSelectDate={setPlanningDate}
        onSelectShift={setPlanningShift}
        onSelectRange={setPlanningRange}
      />
      <SchedulingActionBar
        currentPlanningDate={currentPlanningDate}
        currentPlanningShift={currentPlanningShift}
        activeModuleName={activeBoardModule?.name}
        onAutoAssign={handleAutoAssign}
        onResetAssignments={handleResetAssignments}
        isSimulating={isSimulating}
      />
      <EmployeeFiltersPanel modules={modules} />

      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
          <section className="flex min-h-0 flex-col gap-2 self-start xl:sticky xl:top-6 xl:max-h-[calc(100vh-1.5rem)]">
            <EmployeeListPanel
              employees={contextualPoolEmployees}
              modules={modules}
              activeRules={activeRules}
              hoveredModuleId={hoveredModule?.id}
              priorityModuleId={activeBoardModule?.id}
              assignedTodayEmployeeIds={Array.from(assignedEmployeesTodayIds)}
              onQuickAssign={handleQuickAssign}
              weeklyAssignments={effectiveWeeklyAssignments}
              weekStartDate={weekStartDate}
              planningDate={currentPlanningDate}
              planningShift={currentPlanningShift}
            />
          </section>

          <section className="space-y-4">
            <ModuleBoard
              modules={modules}
              employees={Array.from(employeeMap.values())}
              activeRules={activeRules}
              previewEmployee={activeEmployee}
              hoveredTargetId={hoveredTargetId}
              selectedTargetId={selectedBoardTargetId}
              invalidModuleId={lastRejectedModuleId}
              successModuleId={lastAcceptedModuleId}
              successTargetId={lastAcceptedTargetId}
              releasedTargetId={lastReleasedTargetId}
              planningDate={currentPlanningDate}
              planningShift={currentPlanningShift}
              weeklyAssignments={effectiveWeeklyAssignments}
              weekStartDate={weekStartDate}
              activeModuleId={activePlanningDependencyId}
              incidentImpacts={localizedIncidentImpacts}
              onChangeActiveModule={handleChangeActiveBoardModule}
              onSelectIncidentImpact={handleSelectIncidentCase}
              onSelectTarget={handleSelectBoardTarget}
              onSelectModule={handleSelectModule}
              onSelectShift={handleSelectModuleShift}
            />
          </section>

          <section className="space-y-4">
            <ContextDetailPanel
              feedback={feedback}
              activeRules={activeRules}
              simulation={simulation}
              publicationVersions={publicationVersions}
              auditEntries={auditEntries}
              diagnostics={autoAssignDiagnostics}
              restSummary={restSummary}
              hoverPreview={hoverPreview}
              incidentImpacts={localizedIncidentImpacts}
              selectedIncidentImpact={selectedIncidentImpact}
              onSelectIncidentImpact={handleSelectIncidentCase}
              onApplySuggestedReplacement={handleApplySuggestedReplacement}
              onManualAdjustment={handleManualAdjustment}
            />
            <AICopilotPanel
              activeCase={copilotCase}
              restSummary={restSummary}
              onApplyPrimary={handleApplyCopilotPrimary}
              onCompareAlternatives={handleCompareCopilotAlternatives}
              onSimulateImpact={handleSimulateCopilotImpact}
              onExplainDecision={handleExplainCopilotDecision}
              onSubmitPrompt={handleCopilotPrompt}
            />
          </section>
        </div>

        <DragOverlay>{activeEmployee ? <EmployeeCard employee={activeEmployee} /> : null}</DragOverlay>
      </DndContext>
    </div>
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
