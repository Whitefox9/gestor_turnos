import { apiClient } from "@/services/api/client";
import { incidentsMock } from "@/services/mocks/incidents.mock";

export const incidentsService = {
  async getInbox(tenantId?: string) {
    return apiClient.simulate(incidentsMock.filter((incident) => !tenantId || incident.tenantId === tenantId));
  },
};
