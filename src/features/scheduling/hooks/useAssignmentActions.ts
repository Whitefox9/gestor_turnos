import { useEffect, useRef, useState } from "react";
import { usePlanningHistoryStore } from "@/app/store/planning-history.store";
import type { AuditEntry, PublicationSimulationResult, PublicationVersion } from "@/shared/types/scheduling.types";
import type { Employee } from "@/shared/types/employee.types";
import type { CareModule } from "@/shared/types/module.types";
import type { Rule } from "@/shared/types/rule.types";
import { schedulingService } from "../services/scheduling.service";

type AssignmentFeedback = {
  tone: "success" | "error";
  message: string;
  ruleCodes?: string[];
  advisoryRuleCodes?: string[];
  details?: string[];
} | null;

export function useAssignmentActions() {
  const publicationVersions = usePlanningHistoryStore((state) => state.publicationVersions);
  const auditEntries = usePlanningHistoryStore((state) => state.auditEntries);
  const currentPlanningShift = usePlanningHistoryStore((state) => state.currentPlanningShift);
  const addPublicationVersion = usePlanningHistoryStore((state) => state.addPublicationVersion);
  const addAuditEntry = usePlanningHistoryStore((state) => state.addAuditEntry);
  const [feedback, setFeedback] = useState<AssignmentFeedback>(null);
  const [lastRejectedModuleId, setLastRejectedModuleId] = useState<string | null>(null);
  const [lastAcceptedModuleId, setLastAcceptedModuleId] = useState<string | null>(null);
  const [lastAcceptedTargetId, setLastAcceptedTargetId] = useState<string | null>(null);
  const [lastReleasedTargetId, setLastReleasedTargetId] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<PublicationSimulationResult | null>(null);
  const acceptTimerRef = useRef<number | null>(null);
  const rejectTimerRef = useRef<number | null>(null);
  const releaseTimerRef = useRef<number | null>(null);

  function queueAcceptedHighlight(moduleId: string, targetId?: string | null) {
    setLastRejectedModuleId(null);
    setLastAcceptedModuleId(moduleId);
    setLastAcceptedTargetId(targetId ?? null);
    setLastReleasedTargetId(null);
    if (acceptTimerRef.current) {
      window.clearTimeout(acceptTimerRef.current);
    }
    acceptTimerRef.current = window.setTimeout(() => {
      setLastAcceptedModuleId(null);
      setLastAcceptedTargetId(null);
    }, 1600);
  }

  function queueReleasedHighlight(targetId: string) {
    setLastReleasedTargetId(targetId);
    if (releaseTimerRef.current) {
      window.clearTimeout(releaseTimerRef.current);
    }
    releaseTimerRef.current = window.setTimeout(() => {
      setLastReleasedTargetId(null);
    }, 1800);
  }

  async function validate({
    employeeId,
    moduleId,
    employees,
    modules,
    targetId,
    rules,
  }: {
    employeeId: string;
    moduleId: string;
    employees: Employee[];
    modules: CareModule[];
    targetId: string;
    rules: Rule[];
  }) {
    const result = await schedulingService.validateAssignment({
      employeeId,
      moduleId,
      employees,
      modules,
      rules,
    });

    if (!result.valid) {
      setFeedback({
        tone: "error",
        message: result.reason ?? "Asignacion invalida.",
        ruleCodes: result.violatedRuleCodes,
        details: undefined,
      });
      setLastRejectedModuleId(moduleId);
      setLastAcceptedModuleId(null);
      setLastAcceptedTargetId(null);
      if (rejectTimerRef.current) {
        window.clearTimeout(rejectTimerRef.current);
      }
      rejectTimerRef.current = window.setTimeout(() => {
        setLastRejectedModuleId(null);
      }, 1400);
      return false;
    }

    const employee = employees.find((item) => item.id === employeeId);
    const module = modules.find((item) => item.id === moduleId);
    const sourceModule = modules.find((item) => item.assignedEmployeeIds.includes(employeeId));
    const message = sourceModule && sourceModule.id !== moduleId
      ? `${employee?.fullName ?? "Empleado"} reubicado de ${sourceModule.name} a ${module?.name ?? "modulo"}.`
      : `${employee?.fullName ?? "Empleado"} asignado correctamente a ${module?.name ?? "modulo"}.`;

    setFeedback({
      tone: "success",
      message,
      ruleCodes: result.appliedRuleCodes,
      advisoryRuleCodes: result.advisoryRuleCodes,
      details: undefined,
    });
    queueAcceptedHighlight(moduleId, targetId);
    return true;
  }

  function appendAuditEntry({
    action,
    actorName,
    status,
    detail,
  }: {
    action: "simular" | "publicar";
    actorName: string;
    status: "success" | "blocked";
    detail: string;
  }) {
    const timestamp = new Date().toISOString();
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      actorName,
      status,
      detail,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    addAuditEntry(entry);
  }

  async function simulatePublication({
    employees,
    modules,
    rules,
    actorName,
  }: {
    employees: Employee[];
    modules: CareModule[];
    rules: Rule[];
    actorName?: string;
  }) {
    const result = await schedulingService.simulatePublication({
      employees,
      modules,
      rules,
    });

    setSimulation(result);
    setFeedback({
      tone: result.canPublish ? "success" : "error",
      message: result.summary,
      ruleCodes: result.blockedRuleCodes,
      advisoryRuleCodes: result.warningRuleCodes,
    });
    if (actorName) {
      appendAuditEntry({
        action: "simular",
        actorName,
        status: result.canPublish ? "success" : "blocked",
        detail: result.summary,
      });
    }

    if (result.canPublish) {
      setLastRejectedModuleId(null);
      setLastAcceptedModuleId(null);
      setLastAcceptedTargetId(null);
    } else {
      setLastRejectedModuleId(result.affectedModuleIds[0] ?? null);
      setLastAcceptedModuleId(null);
      setLastAcceptedTargetId(null);
    }

    return result;
  }

  async function publishSchedule({
    employees,
    modules,
    rules,
    actorName,
  }: {
    employees: Employee[];
    modules: CareModule[];
    rules: Rule[];
    actorName: string;
  }) {
    const result = await schedulingService.simulatePublication({
      employees,
      modules,
      rules,
    });

    setSimulation(result);

    if (!result.canPublish) {
      setFeedback({
        tone: "error",
        message: `Publicación bloqueada. ${result.summary}`,
        ruleCodes: result.blockedRuleCodes,
        advisoryRuleCodes: result.warningRuleCodes,
      });
      setLastRejectedModuleId(result.affectedModuleIds[0] ?? null);
      appendAuditEntry({
        action: "publicar",
        actorName,
        status: "blocked",
        detail: result.summary,
      });
      return { result, version: null };
    }

    const timestamp = new Date().toISOString();
    const versionNumber = publicationVersions.length + 1;
    const version: PublicationVersion = {
      id: `publication-${versionNumber}`,
      versionLabel: `v${versionNumber}.0`,
      shift: currentPlanningShift,
      publishedBy: actorName,
      status: "pendiente",
      rulesUsed: rules.filter((rule) => rule.enabled).map((rule) => rule.code),
      readinessScore: result.readinessScore,
      moduleIds: modules.map((module) => module.id),
      summary: result.summary,
      modulesSnapshot: modules.map((module) => ({
        id: module.id,
        name: module.name,
        area: module.area,
        shiftLabel: module.shiftLabel,
        capacity: module.capacity,
        assignedEmployeeIds: [...module.assignedEmployeeIds],
      })),
      notifiedEmployeeIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    addPublicationVersion(version);
    setFeedback({
      tone: "success",
      message: `Cronograma publicado como ${version.versionLabel}. ${result.summary}`,
      ruleCodes: [],
      advisoryRuleCodes: result.warningRuleCodes,
    });
    setLastRejectedModuleId(null);
    appendAuditEntry({
      action: "publicar",
      actorName,
      status: "success",
      detail: `Se publicó ${version.versionLabel} con readiness ${result.readinessScore}.`,
    });

    return { result, version };
  }

  function reportSuccess({
    message,
    moduleId,
    targetId,
    details,
  }: {
    message: string;
    moduleId?: string | null;
    targetId?: string | null;
    details?: string[];
  }) {
    setFeedback({
      tone: "success",
      message,
      ruleCodes: undefined,
      advisoryRuleCodes: undefined,
      details,
    });

    if (moduleId) {
      queueAcceptedHighlight(moduleId, targetId);
      return;
    }

    setLastRejectedModuleId(null);
    setLastAcceptedModuleId(null);
    setLastAcceptedTargetId(null);
    setLastReleasedTargetId(null);
  }

  function reportRelease({
    message,
    moduleId,
    targetId,
  }: {
    message: string;
    moduleId: string;
    targetId: string;
  }) {
    setFeedback({
      tone: "success",
      message,
      ruleCodes: undefined,
      advisoryRuleCodes: undefined,
      details: undefined,
    });
    setLastRejectedModuleId(null);
    setLastAcceptedModuleId(moduleId);
    setLastAcceptedTargetId(null);
    queueReleasedHighlight(targetId);
    if (acceptTimerRef.current) {
      window.clearTimeout(acceptTimerRef.current);
    }
    acceptTimerRef.current = window.setTimeout(() => {
      setLastAcceptedModuleId(null);
    }, 1600);
  }

  function clearFeedback() {
    setFeedback(null);
    setLastRejectedModuleId(null);
    setLastAcceptedModuleId(null);
    setLastAcceptedTargetId(null);
    setLastReleasedTargetId(null);
  }

  useEffect(() => {
    return () => {
      if (acceptTimerRef.current) {
        window.clearTimeout(acceptTimerRef.current);
      }
      if (rejectTimerRef.current) {
        window.clearTimeout(rejectTimerRef.current);
      }
      if (releaseTimerRef.current) {
        window.clearTimeout(releaseTimerRef.current);
      }
    };
  }, []);

  return {
    validate,
    simulatePublication,
    publishSchedule,
    reportSuccess,
    reportRelease,
    clearFeedback,
    feedback,
    simulation,
    publicationVersions,
    auditEntries,
    lastRejectedModuleId,
    lastAcceptedModuleId,
    lastAcceptedTargetId,
    lastReleasedTargetId,
  };
}
