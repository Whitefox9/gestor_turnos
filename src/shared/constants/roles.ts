import type { UserRole } from "../types/common.types";

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Superadmin",
  admin_institucional: "Admin institucional",
  planificador: "Planificador",
  coordinador: "Coordinador",
  empleado: "Empleado",
  consulta: "Consulta",
};

export const PLATFORM_ROLES = Object.keys(ROLE_LABELS) as UserRole[];
