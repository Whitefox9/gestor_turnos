export type EntityId = string;

export type UserRole =
  | "superadmin"
  | "admin_institucional"
  | "planificador"
  | "coordinador"
  | "empleado"
  | "consulta";

export interface BaseEntity {
  id: EntityId;
  createdAt: string;
  updatedAt: string;
}

export interface Option {
  label: string;
  value: string;
}
