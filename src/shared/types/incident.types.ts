import type { BaseEntity, EntityId } from "./common.types";
import type { ShiftKind } from "./scheduling.types";

export interface Incident extends BaseEntity {
  tenantId: EntityId;
  employeeId?: EntityId;
  moduleId?: EntityId;
  title: string;
  summary: string;
  kind: "incapacidad" | "ausencia" | "permiso";
  date?: string;
  shift?: ShiftKind;
  severity: "media" | "alta" | "critica";
  status: "pendiente" | "en_revision" | "resuelta";
}
