import { Suspense, lazy } from "react";
import { Navigate, RouteObject } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth.store";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { EmployeeLayout } from "@/app/layouts/EmployeeLayout";
import { PlannerLayout } from "@/app/layouts/PlannerLayout";
import { AuthGuard } from "@/app/guards/AuthGuard";
import { RoleGuard } from "@/app/guards/RoleGuard";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { ROUTES } from "@/shared/constants/routes";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const MySchedulePage = lazy(() => import("@/pages/employee/MySchedulePage").then((module) => ({ default: module.MySchedulePage })));
const ControlCenterPage = lazy(() => import("@/pages/planner/ControlCenterPage").then((module) => ({ default: module.ControlCenterPage })));
const IncidentsPage = lazy(() => import("@/pages/planner/IncidentsPage").then((module) => ({ default: module.IncidentsPage })));
const PeoplePage = lazy(() => import("@/pages/planner/PeoplePage").then((module) => ({ default: module.PeoplePage })));
const PublicationHistoryPage = lazy(() => import("@/pages/planner/PublicationHistoryPage").then((module) => ({ default: module.PublicationHistoryPage })));
const RulesPage = lazy(() => import("@/pages/planner/RulesPage").then((module) => ({ default: module.RulesPage })));
const SchedulingPage = lazy(() => import("@/pages/planner/SchedulingPage").then((module) => ({ default: module.SchedulingPage })));
const TenantsPage = lazy(() => import("@/pages/superadmin/TenantsPage").then((module) => ({ default: module.TenantsPage })));

export const routes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      {
        path: ROUTES.login,
        element: <LoadablePage><LoginPage /></LoadablePage>,
      },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <RoleHomeRedirect />,
          },
          {
            element: <RoleGuard allowedRoles={["planificador", "coordinador", "admin_institucional"]} />,
            children: [
              {
                element: <PlannerLayout />,
                children: [
                  { path: ROUTES.plannerControlCenter, element: <LoadablePage><ControlCenterPage /></LoadablePage> },
                  { path: ROUTES.plannerScheduling, element: <LoadablePage><SchedulingPage /></LoadablePage> },
                  { path: ROUTES.plannerIncidents, element: <LoadablePage><IncidentsPage /></LoadablePage> },
                  { path: ROUTES.plannerPeople, element: <LoadablePage><PeoplePage /></LoadablePage> },
                  { path: ROUTES.plannerPublications, element: <LoadablePage><PublicationHistoryPage /></LoadablePage> },
                  { path: ROUTES.plannerRules, element: <LoadablePage><RulesPage /></LoadablePage> },
                ],
              },
            ],
          },
          {
            element: <RoleGuard allowedRoles={["empleado"]} />,
            children: [
              {
                element: <EmployeeLayout />,
                children: [{ path: ROUTES.employeeSchedule, element: <LoadablePage><MySchedulePage /></LoadablePage> }],
              },
            ],
          },
          {
            element: <RoleGuard allowedRoles={["superadmin"]} />,
            children: [{ path: ROUTES.superadminTenants, element: <LoadablePage><TenantsPage /></LoadablePage> }],
          },
        ],
      },
    ],
  },
];

function RoleHomeRedirect() {
  const role = useAuthStore((state) => state.session?.user.role);

  switch (role) {
    case "superadmin":
      return <Navigate to={ROUTES.superadminTenants} replace />;
    case "empleado":
      return <Navigate to={ROUTES.employeeSchedule} replace />;
    default:
      return <Navigate to={ROUTES.plannerControlCenter} replace />;
  }
}

function LoadablePage({ children }: { children: JSX.Element }) {
  return <Suspense fallback={<LoadingState label="Cargando vista..." />}>{children}</Suspense>;
}
