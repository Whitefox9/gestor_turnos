import { apiClient } from "@/services/api/client";
import { aiChatMessagesMock, aiInsightsMock } from "@/services/mocks/ai.mock";

export const aiService = {
  async getPanelData() {
    return apiClient.simulate({
      insights: aiInsightsMock,
      messages: aiChatMessagesMock,
    });
  },
};
