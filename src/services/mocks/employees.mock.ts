import type { Employee } from "@/shared/types/employee.types";

const baseEmployees: Employee[] = [
  {
    id: "emp-001",
    tenantId: "tenant-hsj",
    fullName: "Paula Medina",
    avatarUrl: "/avatars/paula-medina.svg",
    document: "1029384756",
    profile: "Enfermera jefe",
    roleLabel: "Enfermeria",
    skills: ["triage", "uci", "medicacion"],
    moduleIds: ["mod-uci-a", "mod-enf-a"],
    weeklyHours: 36,
    assignedToday: false,
    status: "available",
    createdAt: "2026-03-10T08:00:00.000Z",
    updatedAt: "2026-03-22T12:00:00.000Z",
  },
  {
    id: "emp-002",
    tenantId: "tenant-hsj",
    fullName: "Luis Herrera",
    avatarUrl: "/avatars/luis-herrera.svg",
    document: "876543219",
    profile: "Auxiliar de enfermeria",
    roleLabel: "Hospitalizacion",
    skills: ["hospitalizacion", "curaciones"],
    moduleIds: ["mod-hosp-a", "mod-enf-a"],
    weeklyHours: 42,
    assignedToday: false,
    status: "available",
    createdAt: "2026-03-10T08:00:00.000Z",
    updatedAt: "2026-03-22T12:00:00.000Z",
  },
  {
    id: "emp-003",
    tenantId: "tenant-hsj",
    fullName: "Natalia Sarmiento",
    avatarUrl: "/avatars/natalia-sarmiento.svg",
    document: "764534123",
    profile: "Terapeuta respiratoria",
    roleLabel: "UCI",
    skills: ["uci", "ventilacion"],
    moduleIds: ["mod-uci-a"],
    weeklyHours: 32,
    assignedToday: true,
    status: "busy",
    createdAt: "2026-03-10T08:00:00.000Z",
    updatedAt: "2026-03-22T12:00:00.000Z",
  },
  {
    id: "emp-004",
    tenantId: "tenant-hsj",
    fullName: "Jorge Saavedra",
    avatarUrl: "/avatars/jorge-saavedra.svg",
    document: "1122334455",
    profile: "Instrumentador",
    roleLabel: "Apoyo clinico",
    skills: ["esterilizacion", "hospitalizacion", "biologia"],
    moduleIds: ["mod-hosp-a", "mod-bio-a"],
    weeklyHours: 40,
    assignedToday: false,
    status: "available",
    createdAt: "2026-03-10T08:00:00.000Z",
    updatedAt: "2026-03-22T12:00:00.000Z",
  },
  {
    id: "emp-005",
    tenantId: "tenant-hsj",
    fullName: "Camila Pardo",
    avatarUrl: "/avatars/camila-pardo.svg",
    document: "9988776655",
    profile: "Enfermera profesional",
    roleLabel: "UCI",
    skills: ["uci", "medicacion"],
    moduleIds: ["mod-uci-a", "mod-uci-b"],
    weeklyHours: 30,
    assignedToday: false,
    status: "available",
    createdAt: "2026-03-10T08:00:00.000Z",
    updatedAt: "2026-03-22T12:00:00.000Z",
  },
];

const generatedEmployeeNames = buildGeneratedNames(100);

const generatedRoleTemplates = [
  {
    profile: "Enfermera profesional",
    roleLabel: "Enfermeria",
    skills: ["medicacion", "triage"],
    moduleIds: ["mod-enf-a"],
  },
  {
    profile: "Auxiliar asistencial",
    roleLabel: "Hospitalizacion",
    skills: ["hospitalizacion", "curaciones"],
    moduleIds: ["mod-hosp-a"],
  },
  {
    profile: "Terapeuta respiratorio",
    roleLabel: "UCI",
    skills: ["uci", "ventilacion"],
    moduleIds: ["mod-uci-a"],
  },
  {
    profile: "Analista de laboratorio",
    roleLabel: "Biologia",
    skills: ["biologia", "muestras"],
    moduleIds: ["mod-bio-a"],
  },
  {
    profile: "Enfermera jefe",
    roleLabel: "Enfermeria",
    skills: ["medicacion", "uci"],
    moduleIds: ["mod-enf-a", "mod-uci-a"],
  },
];

const avatarPool = [
  "/avatars/paula-medina.svg",
  "/avatars/luis-herrera.svg",
  "/avatars/natalia-sarmiento.svg",
  "/avatars/jorge-saavedra.svg",
  "/avatars/camila-pardo.svg",
];

const generatedEmployees: Employee[] = generatedEmployeeNames.map((fullName, index) => {
  const template = generatedRoleTemplates[index % generatedRoleTemplates.length];
  const employeeNumber = index + 6;

  return {
    id: `emp-${employeeNumber.toString().padStart(3, "0")}`,
    tenantId: "tenant-hsj",
    fullName,
    avatarUrl: avatarPool[index % avatarPool.length],
    document: `10${(employeeNumber + 300000000).toString()}`,
    profile: template.profile,
    roleLabel: template.roleLabel,
    skills: template.skills,
    moduleIds: template.moduleIds,
    weeklyHours: 30 + (index % 4) * 4,
    assignedToday: false,
    status: "available",
    createdAt: "2026-03-10T08:00:00.000Z",
    updatedAt: "2026-03-22T12:00:00.000Z",
  };
});

export const employeesMock: Employee[] = [...baseEmployees, ...generatedEmployees];

function buildGeneratedNames(total: number) {
  const firstNames = [
    "Andrea",
    "Mateo",
    "Valentina",
    "Sergio",
    "Laura",
    "Daniela",
    "Julian",
    "Mariana",
    "Felipe",
    "Sara",
    "Carlos",
    "Tatiana",
    "Sebastian",
    "Paola",
    "Andres",
    "Nicolas",
    "Adriana",
    "Juan Camilo",
    "Luisa Fernanda",
    "David",
  ];
  const lastNames = [
    "Lozano",
    "Cardenas",
    "Duarte",
    "Beltran",
    "Quintana",
    "Rojas",
    "Forero",
    "Correa",
    "Ospina",
    "Bernal",
  ];

  return firstNames.flatMap((firstName) => lastNames.map((lastName) => `${firstName} ${lastName}`)).slice(0, total);
}
