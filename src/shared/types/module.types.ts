import type { BaseEntity, EntityId } from "./common.types";

export interface CareModule extends BaseEntity {
  tenantId: EntityId;
  name: string;
  area: "UCI" | "Hospitalizacion" | "Enfermeria" | "Biologia";
  shiftLabel: string;
  capacity: number;
  assignedEmployeeIds: EntityId[];
  requiredSkills: string[];
}
