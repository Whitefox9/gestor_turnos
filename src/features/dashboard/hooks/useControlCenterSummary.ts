import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard.service";

export function useControlCenterSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardService.getSummary,
  });
}
