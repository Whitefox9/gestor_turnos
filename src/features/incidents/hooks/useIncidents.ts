import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/app/store/auth.store";
import { incidentsService } from "../services/incidents.service";

export function useIncidents() {
  const tenantId = useAuthStore((state) => state.session?.user.tenantId);
  return useQuery({
    queryKey: ["incidents", tenantId],
    queryFn: () => incidentsService.getInbox(tenantId),
  });
}
