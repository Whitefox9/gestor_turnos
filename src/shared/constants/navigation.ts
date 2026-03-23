import { LayoutDashboard, Building2, CalendarRange, ClipboardList, History, Stethoscope, UsersRound, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ROUTES } from "./routes";
import type { UserRole } from "../types/common.types";

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: "Centro de control",
    path: ROUTES.plannerControlCenter,
    icon: LayoutDashboard,
    roles: ["planificador", "coordinador"],
  },
  {
    label: "Programacion",
    path: ROUTES.plannerScheduling,
    icon: CalendarRange,
    roles: ["planificador", "coordinador"],
  },
  {
    label: "Novedades",
    path: ROUTES.plannerIncidents,
    icon: ClipboardList,
    roles: ["planificador", "coordinador", "admin_institucional"],
  },
  {
    label: "Personas",
    path: ROUTES.plannerPeople,
    icon: UsersRound,
    roles: ["planificador", "coordinador", "admin_institucional"],
  },
  {
    label: "Reglas",
    path: ROUTES.plannerRules,
    icon: ShieldCheck,
    roles: ["planificador", "coordinador", "admin_institucional"],
  },
  {
    label: "Publicaciones",
    path: ROUTES.plannerPublications,
    icon: History,
    roles: ["planificador", "coordinador", "admin_institucional"],
  },
  {
    label: "Mi horario",
    path: ROUTES.employeeSchedule,
    icon: Stethoscope,
    roles: ["empleado"],
  },
  {
    label: "Tenants",
    path: ROUTES.superadminTenants,
    icon: Building2,
    roles: ["superadmin"],
  },
];
