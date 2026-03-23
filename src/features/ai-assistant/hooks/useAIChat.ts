import { useQuery } from "@tanstack/react-query";
import { aiService } from "../services/ai.service";

export function useAIChat() {
  return useQuery({
    queryKey: ["ai-panel"],
    queryFn: aiService.getPanelData,
  });
}
