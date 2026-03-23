import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth.store";
import { ROUTES } from "@/shared/constants/routes";
import { canAccessRole } from "@/shared/utils/permissions";
import type { UserRole } from "@/shared/types/common.types";

export function RoleGuard({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const currentRole = useAuthStore((state) => state.session?.user.role);

  if (!canAccessRole(currentRole, allowedRoles)) {
    return <Navigate to={ROUTES.root} replace />;
  }

  return <Outlet />;
}
