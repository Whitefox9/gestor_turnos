import type { Tenant } from "./tenant.types";
import type { UserRole } from "./common.types";

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  area?: string;
  avatarFallback: string;
}

export interface AuthSession {
  accessToken: string;
  user: SessionUser;
  tenant?: Tenant;
}

export interface LoginFormValues {
  selectedUserId: string;
}
