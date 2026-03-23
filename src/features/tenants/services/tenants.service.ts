import { apiClient } from "@/services/api/client";
import { tenantsMock } from "@/services/mocks/tenants.mock";

export const tenantsService = {
  async getAll() {
    return apiClient.simulate(tenantsMock);
  },
};
