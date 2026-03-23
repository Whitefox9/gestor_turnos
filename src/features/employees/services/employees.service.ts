import { apiClient } from "@/services/api/client";
import { employeesMock } from "@/services/mocks/employees.mock";

export const employeesService = {
  async getByTenant(tenantId?: string) {
    return apiClient.simulate(employeesMock.filter((employee) => !tenantId || employee.tenantId === tenantId));
  },
};
