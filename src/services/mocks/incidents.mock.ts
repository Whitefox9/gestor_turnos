import type { Incident } from "@/shared/types/incident.types";

export const incidentsMock: Incident[] = [
  {
    id: "inc-001",
    tenantId: "tenant-hsj",
    employeeId: "emp-002",
    title: "Ausencia por incapacidad",
    summary: "El empleado reporta incapacidad hasta el 24 de marzo.",
    severity: "alta",
    status: "pendiente",
    createdAt: "2026-03-23T05:20:00.000Z",
    updatedAt: "2026-03-23T05:20:00.000Z",
  },
  {
    id: "inc-002",
    tenantId: "tenant-hsj",
    title: "Cobertura incompleta UCI noche",
    summary: "Falta una enfermera con skill UCI para el turno noche.",
    severity: "critica",
    status: "en_revision",
    createdAt: "2026-03-23T06:10:00.000Z",
    updatedAt: "2026-03-23T06:10:00.000Z",
  },
];
