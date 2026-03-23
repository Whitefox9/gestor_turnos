import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/app/store/auth.store";
import { employeesService } from "../services/employees.service";

export function useEmployees() {
  const tenantId = useAuthStore((state) => state.session?.user.tenantId);
  return useQuery({
    queryKey: ["employees", tenantId],
    queryFn: () => employeesService.getByTenant(tenantId),
  });
}
