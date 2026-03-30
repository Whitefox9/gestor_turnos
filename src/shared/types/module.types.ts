import type { BaseEntity, EntityId } from "./common.types";

export interface CareModule extends BaseEntity {
  tenantId: EntityId;
  name: string;
  area: string;
  shiftLabel: string;
  displayColor: string;
  capacity: number;
  assignedEmployeeIds: EntityId[];
  requiredSkills: string[];
}
