import { DndContext, DragOverlay, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/app/store/auth.store";
import { usePlanningHistoryStore } from "@/app/store/planning-history.store";
import { AIChatPanelCompact } from "@/features/ai-assistant/components/AIChatPanel";
import { useRules } from "@/features/rules/hooks/useRules";
import { ContextDetailPanel } from "@/features/scheduling/components/ContextDetailPanel";
import { EmployeeCard } from "@/features/scheduling/components/EmployeeCard";
import { EmployeeFiltersPanel } from "@/features/scheduling/components/EmployeeFiltersPanel";
import { EmployeeListPanel } from "@/features/scheduling/components/EmployeeListPanel";
import { ModuleBoard } from "@/features/scheduling/components/ModuleBoard";
import { SchedulingToolbar } from "@/features/scheduling/components/SchedulingToolbar";
import { ShiftHistoryStrip } from "@/features/scheduling/components/ShiftHistoryStrip";
import { useAssignmentActions } from "@/features/scheduling/hooks/useAssignmentActions";
import { useSchedulingData } from "@/features/scheduling/hooks/useSchedulingData";
import { getHoverAssignmentPreview, getMockModuleRisk, getSoftRuleInsights, schedulingService } from "@/features/scheduling/services/scheduling.service";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { PlannerTopBar } from "@/shared/components/layout/PlannerTopBar";
import type { CareModule } from "@/shared/types/module.types";
import type { Employee } from "@/shared/types/employee.types";

export function SchedulingPage() {
  const { data, isLoading, filteredEmployees } = useSchedulingData();
  const { data: rulesData } = useRules();
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
  const currentBoardSnapshot = usePlanningHistoryStore((state) => state.currentBoardSnapshot);
  const setCurrentBoardSnapshot = usePlanningHistoryStore((state) => state.setCurrentBoardSnapshot);
  const currentPlanningShift = usePlanningHistoryStore((state) => state.currentPlanningShift);
  const boardResetVersion = usePlanningHistoryStore((state) => state.boardResetVersion);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [modulesState, setModulesState] = useState<CareModule[] | null>(null);

  const modules = modulesState ?? data?.modules ?? [];
  const employees = data?.employees ?? [];
  const activeRules = (rulesData ?? []).filter((rule) => rule.enabled);
  const visibleEmployees = filteredEmployees.filter(
    (employee) => !modules.some((module) => module.assignedEmployeeIds.includes(employee.id)),
  );
  const totalSlots = modules.reduce((sum, module) => sum + module.capacity, 0);
  const assignedSlots = modules.reduce((sum, module) => sum + module.assignedEmployeeIds.length, 0);
  const coverage = totalSlots > 0 ? Math.round((assignedSlots / totalSlots) * 100) : 0;
  const alertModules = modules.filter((module) => module.assignedEmployeeIds.length < module.capacity).length;
  const unassignedEmployees = employees.filter(
    (employee) => !modules.some((module) => module.assignedEmployeeIds.includes(employee.id)),
  ).length;

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
      ? getHoverAssignmentPreview(activeEmployee, hoveredModule, modules, activeRules)
      : null;
  const aiInsights = getSoftRuleInsights({
    employees,
    modules,
    rules: activeRules,
  });
  if (hoverPreview) {
    aiInsights.unshift({
      id: `hover-preview-${activeEmployee?.id ?? "unknown"}`,
      title: "Candidato en evaluación",
      message: `${hoverPreview.employeeName} tiene fit ${hoverPreview.score} para ${hoverPreview.moduleName}.`,
      severity: hoverPreview.riskLevel === "high" ? "warning" : "info",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  const [isSimulating, setIsSimulating] = useState(false);
  const actorName = session?.user.fullName ?? "Planificador mock";

  useEffect(() => {
    if (modules.length === 0) {
      return;
    }

    setCurrentBoardSnapshot(
      modules.map((module) => ({
        id: module.id,
        name: module.name,
        area: module.area,
        shiftLabel: module.shiftLabel,
        capacity: module.capacity,
        assignedEmployeeIds: [...module.assignedEmployeeIds],
      })),
    );
  }, [modules, setCurrentBoardSnapshot]);

  useEffect(() => {
    if (currentBoardSnapshot.length === 0) {
      return;
    }

    setModulesState(
      currentBoardSnapshot.map((module) => ({
        ...module,
        tenantId: data?.modules.find((item) => item.id === module.id)?.tenantId ?? session?.user.tenantId ?? "tenant-hsj",
        requiredSkills: data?.modules.find((item) => item.id === module.id)?.requiredSkills ?? [],
        createdAt: data?.modules.find((item) => item.id === module.id)?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    );
  }, [boardResetVersion, currentBoardSnapshot, data?.modules, session?.user.tenantId]);

  async function handleValidateRules() {
    setIsSimulating(true);
    try {
      await simulatePublication({
        employees,
        modules,
        rules: activeRules,
        actorName,
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
      });
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleAutoAssign(targetModuleId?: string) {
    setIsSimulating(true);
    try {
      const currentModules = modulesState ?? data?.modules ?? [];
      const plan = schedulingService.buildAutoAssignmentPlan({
        employees,
        modules: currentModules,
        rules: activeRules,
        targetModuleId,
      });

      setModulesState(plan.modules);
      reportSuccess({
        message:
          plan.assignments.length > 0
            ? `Autoasignación completada: ${plan.assignments.length} coberturas aplicadas. ${plan.skipped.length > 0 ? `${plan.skipped.length} dependencias siguen pendientes por reglas activas.` : "No quedaron bloqueos nuevos."}`
            : "La autoasignación no encontró candidatos válidos con las reglas activas.",
        details: [
          ...plan.assignments.slice(0, 6).map((assignment) => `${assignment.employeeName} -> ${assignment.moduleName} (Fit ${assignment.score})`),
          ...plan.skipped.slice(0, 4).map((item) => `${item.moduleName}: ${item.reason}`),
        ],
      });
    } finally {
      setIsSimulating(false);
    }
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
    const currentModules = modulesState ?? data?.modules ?? [];
    const isValid = await validate({
      employeeId: employee.id,
      moduleId,
      employees,
      modules: currentModules,
      targetId,
      rules: activeRules,
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

    setModulesState(nextModules);
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
    await applyAssignment(employee, `${moduleId}::quick-assign`);
  }

  async function handleReassign(employeeId: string, moduleId: string) {
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) {
      return;
    }

    clearFeedback();
    await applyAssignment(employee, `${moduleId}::reassign`);
  }

  function handleUnassign(employeeId: string, moduleId: string) {
    const currentModules = modulesState ?? data?.modules ?? [];
    const module = currentModules.find((item) => item.id === moduleId);
    const employee = employees.find((item) => item.id === employeeId);

    if (!module || !employee || !module.assignedEmployeeIds.includes(employeeId)) {
      return;
    }
    const slotIndex = module.assignedEmployeeIds.indexOf(employeeId);

    setModulesState(
      currentModules.map((item) =>
        item.id === moduleId
          ? {
              ...item,
              assignedEmployeeIds: item.assignedEmployeeIds.filter((assignedId) => assignedId !== employeeId),
            }
          : item,
      ),
    );
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
        subtitle={`Asigna empleados a UCI, Hospitalizacion, Enfermeria y Biologia con validación mock para ${currentPlanningShift}.`}
      />
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/80 shadow-soft backdrop-blur">
        <PlannerTopBar
          periodLabel="Abril 2026"
          coverage={`${coverage}%`}
          alertsCount={alertModules}
          incidentsCount={data.assignments.length}
          unassignedCount={unassignedEmployees}
          peopleCount={employees.length}
          rulesAlertsCount={ruleRiskAlerts}
          searchedShiftsCount={modules.length}
          actionMessage={simulation?.summary}
          actionTone={simulation ? (simulation.canPublish ? "success" : "error") : "neutral"}
          onValidateRules={handleValidateRules}
          onAutoAssign={() => handleAutoAssign()}
          onSimulate={handleSimulate}
          onPublish={handlePublish}
          isSimulating={isSimulating}
        />
      </section>
      <ShiftHistoryStrip />
      <SchedulingToolbar />
      <EmployeeFiltersPanel modules={modules} />

      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
          <section className="flex min-h-0 flex-col gap-2 self-start xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pool de empleados</h2>
              <p className="mt-1 text-sm text-slate-500">Se organiza por prioridad operativa para evitar una lista plana cuando la dotación escala.</p>
            </div>
            <EmployeeListPanel
              employees={visibleEmployees}
              modules={modules}
              activeRules={activeRules}
              hoveredModuleId={hoveredModule?.id}
              onQuickAssign={handleQuickAssign}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Módulos</h2>
                <p className="mt-1 text-sm text-slate-500">Centro operativo de dependencias y cobertura por turno.</p>
              </div>
            </div>
            <ModuleBoard
              modules={modules}
              employees={Array.from(employeeMap.values())}
              activeRules={activeRules}
              previewEmployee={activeEmployee}
              hoveredTargetId={hoveredTargetId}
              invalidModuleId={lastRejectedModuleId}
              successModuleId={lastAcceptedModuleId}
              successTargetId={lastAcceptedTargetId}
              releasedTargetId={lastReleasedTargetId}
              onUnassign={handleUnassign}
              onReassign={handleReassign}
            />
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Copiloto</h2>
              <p className="mt-1 text-sm text-slate-500">Contexto operativo y asistencia IA integrada a la programación.</p>
            </div>
            <ContextDetailPanel
              feedback={feedback}
              activeRules={activeRules}
              simulation={simulation}
              publicationVersions={publicationVersions}
              auditEntries={auditEntries}
              hoverPreview={hoverPreview}
            />
            <AIChatPanelCompact
              contextMessage={simulation?.summary ?? (hoverPreview ? `Preview activo sobre ${hoverPreview.moduleName}.` : undefined)}
              contextualInsights={aiInsights}
              onAutoAssign={() => handleAutoAssign(hoveredModule?.id)}
            />
          </section>
        </div>

        <DragOverlay>{activeEmployee ? <EmployeeCard employee={activeEmployee} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
