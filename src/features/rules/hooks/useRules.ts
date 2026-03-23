import { useQuery } from "@tanstack/react-query";
import { rulesService } from "../services/rules.service";

export function useRules() {
  return useQuery({
    queryKey: ["rules"],
    queryFn: () => rulesService.getByTenant(),
  });
}
