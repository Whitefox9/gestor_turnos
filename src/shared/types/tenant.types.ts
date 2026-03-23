import type { BaseEntity } from "./common.types";

export interface Tenant extends BaseEntity {
  name: string;
  code: string;
  city: string;
  active: boolean;
  employeeCount: number;
}
