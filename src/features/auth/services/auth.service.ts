import { apiClient } from "@/services/api/client";
import { mockUsers } from "@/services/mocks/auth.mock";
import { tenantsMock } from "@/services/mocks/tenants.mock";
import type { AuthSession } from "@/shared/types/auth.types";

export const authService = {
  async listUsers() {
    return apiClient.simulate(mockUsers, 120);
  },
  async login(selectedUserId: string): Promise<AuthSession> {
    const user = mockUsers.find((item) => item.id === selectedUserId);

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    const tenant = user.tenantId ? tenantsMock.find((item) => item.id === user.tenantId) : undefined;

    return apiClient.simulate(
      {
        accessToken: `mock-token-${user.id}`,
        user,
        tenant,
      },
      240,
    );
  },
};
