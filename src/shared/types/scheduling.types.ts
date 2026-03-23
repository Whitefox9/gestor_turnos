import type { BaseEntity, EntityId } from "./common.types";
import type { CareModule } from "./module.types";

export interface ShiftAssignment extends BaseEntity {
  employeeId: EntityId;
  moduleId: EntityId;
  date: string;
  shift: ShiftKind;
  valid: boolean;
}

export type ShiftKind = "manana" | "tarde" | "noche";

export interface AssignmentValidationResult {
  valid: boolean;
  reason?: string;
  violatedRuleCodes?: string[];
  advisoryRuleCodes?: string[];
  appliedRuleCodes?: string[];
}

export interface PublicationSimulationResult {
  canPublish: boolean;
  readinessScore: number;
  blockedRuleCodes: string[];
  warningRuleCodes: string[];
  affectedModuleIds: string[];
  summary: string;
}

export interface PublicationVersion extends BaseEntity {
  versionLabel: string;
  shift: ShiftKind;
  publishedBy: string;
  status: "pendiente" | "aprobada";
  rulesUsed: string[];
  readinessScore: number;
  moduleIds: EntityId[];
  summary: string;
  modulesSnapshot: PublishedModuleSnapshot[];
  approvedAt?: string;
  notifiedEmployeeIds: EntityId[];
}

export interface AuditEntry extends BaseEntity {
  action: "simular" | "publicar";
  actorName: string;
  status: "success" | "blocked";
  detail: string;
}

export interface HoverAssignmentPreview {
  employeeName: string;
  moduleName: string;
  score: number;
  riskLevel: "none" | "low" | "medium" | "high";
  riskHint?: string;
  advisoryRuleCodes: string[];
}

export interface PublishedModuleSnapshot
  extends Pick<CareModule, "id" | "name" | "area" | "shiftLabel" | "capacity" | "assignedEmployeeIds"> {}

export interface EmployeeScheduleNotification extends BaseEntity {
  employeeId: EntityId;
  publicationVersionId: EntityId;
  title: string;
  message: string;
  shift: ShiftKind;
  read: boolean;
}
