import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/app/store/auth.store";
import { ROUTES } from "@/shared/constants/routes";
import { authService } from "../services/auth.service";

export function useLogin() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  const usersQuery = useQuery({
    queryKey: ["auth-users"],
    queryFn: authService.listUsers,
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      setSession(session);
      switch (session.user.role) {
        case "superadmin":
          navigate(ROUTES.superadminTenants);
          break;
        case "empleado":
          navigate(ROUTES.employeeSchedule);
          break;
        default:
          navigate(ROUTES.plannerControlCenter);
      }
    },
  });

  return {
    usersQuery,
    loginMutation,
  };
}
