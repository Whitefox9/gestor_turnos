import type { UserRole } from "../types/common.types";

export function canAccessRole(currentRole: UserRole | undefined, allowed: UserRole[]) {
  return !!currentRole && allowed.includes(currentRole);
}
