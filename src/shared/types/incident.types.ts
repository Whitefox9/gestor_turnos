import type { BaseEntity, EntityId } from "./common.types";

export interface Incident extends BaseEntity {
  tenantId: EntityId;
  employeeId?: EntityId;
  title: string;
  summary: string;
  severity: "media" | "alta" | "critica";
  status: "pendiente" | "en_revision" | "resuelta";
}
