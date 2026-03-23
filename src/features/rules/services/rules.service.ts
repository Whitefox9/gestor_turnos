import { apiClient } from "@/services/api/client";
import { rulesMock } from "@/services/mocks/rules.mock";

export const rulesService = {
  async getByTenant() {
    return apiClient.simulate(rulesMock);
  },
};
