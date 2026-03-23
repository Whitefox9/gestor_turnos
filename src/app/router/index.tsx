import { useAuthStore } from "@/app/store/auth.store";
import { ROUTES } from "@/shared/constants/routes";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { routes } from "./routes";

const router = createBrowserRouter([
  ...routes,
  {
    path: "*",
    element: <RootRedirect />,
  },
]);

function RootRedirect() {
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return <Navigate to={ROUTES.login} replace />;
  }

  switch (session.user.role) {
    case "superadmin":
      return <Navigate to={ROUTES.superadminTenants} replace />;
    case "empleado":
      return <Navigate to={ROUTES.employeeSchedule} replace />;
    default:
      return <Navigate to={ROUTES.plannerControlCenter} replace />;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
