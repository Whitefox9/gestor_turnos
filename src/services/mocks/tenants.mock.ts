import type { Tenant } from "@/shared/types/tenant.types";

export const tenantsMock: Tenant[] = [
  {
    id: "tenant-hsj",
    name: "Hospital San Jose",
    code: "HSJ",
    city: "Bogota",
    active: true,
    employeeCount: 312,
    createdAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-03-22T10:00:00.000Z",
  },
  {
    id: "tenant-cln",
    name: "Clinica del Norte",
    code: "CLN",
    city: "Medellin",
    active: true,
    employeeCount: 246,
    createdAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-03-20T14:00:00.000Z",
  },
];
