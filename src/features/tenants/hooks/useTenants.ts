import { useQuery } from "@tanstack/react-query";
import { tenantsService } from "../services/tenants.service";

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: tenantsService.getAll,
  });
}
