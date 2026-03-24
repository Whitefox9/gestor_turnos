import type { Incident } from "@/shared/types/incident.types";

export const incidentsMock: Incident[] = [
  {
    id: "inc-001",
    tenantId: "tenant-hsj",
    employeeId: "emp-003",
    moduleId: "mod-uci-a",
    title: "Incapacidad reportada en UCI",
    summary: "Natalia Sarmiento no puede cubrir UCI durante la mañana del lunes por incapacidad médica.",
    kind: "incapacidad",
    date: "2026-03-23",
    shift: "manana",
    severity: "alta",
    status: "pendiente",
    createdAt: "2026-03-23T05:20:00.000Z",
    updatedAt: "2026-03-23T05:20:00.000Z",
  },
  {
    id: "inc-002",
    tenantId: "tenant-hsj",
    employeeId: "emp-004",
    moduleId: "mod-bio-a",
    title: "Permiso operativo en Biología",
    summary: "Jorge Saavedra solicita permiso para la noche del miércoles en Biología Clínica.",
    kind: "permiso",
    date: "2026-03-25",
    shift: "noche",
    severity: "critica",
    status: "en_revision",
    createdAt: "2026-03-23T06:10:00.000Z",
    updatedAt: "2026-03-23T06:10:00.000Z",
  },
];
