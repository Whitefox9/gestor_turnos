import type { BaseEntity, EntityId } from "./common.types";

export interface Employee extends BaseEntity {
  tenantId: EntityId;
  fullName: string;
  avatarUrl?: string;
  document: string;
  profile: string;
  roleLabel: string;
  skills: string[];
  moduleIds: EntityId[];
  weeklyHours: number;
  assignedToday: boolean;
  status: "available" | "busy" | "off";
}
