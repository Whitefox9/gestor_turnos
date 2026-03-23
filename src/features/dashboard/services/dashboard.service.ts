import { apiClient } from "@/services/api/client";
import { aiInsightsMock } from "@/services/mocks/ai.mock";
import { dashboardMock } from "@/services/mocks/dashboard.mock";
import { incidentsMock } from "@/services/mocks/incidents.mock";

export const dashboardService = {
  async getSummary() {
    return apiClient.simulate({
      ...dashboardMock,
      latestIncidents: incidentsMock.slice(0, 2),
      insights: aiInsightsMock,
    });
  },
};
