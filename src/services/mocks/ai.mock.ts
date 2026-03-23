import type { AIChatMessage, AIInsight } from "@/shared/types/ai.types";

export const aiInsightsMock: AIInsight[] = [
  {
    id: "ai-001",
    title: "Riesgo de fatiga",
    message: "Dos perfiles de UCI superan 48 horas proyectadas esta semana.",
    severity: "warning",
    createdAt: "2026-03-23T06:00:00.000Z",
    updatedAt: "2026-03-23T06:00:00.000Z",
  },
  {
    id: "ai-002",
    title: "Cobertura prioritaria",
    message: "Hospitalizacion Piso 4 puede cerrarse con Luis Herrera.",
    severity: "info",
    createdAt: "2026-03-23T06:05:00.000Z",
    updatedAt: "2026-03-23T06:05:00.000Z",
  },
];

export const aiChatMessagesMock: AIChatMessage[] = [
  {
    id: "chat-001",
    role: "assistant",
    content: "Detecte dos huecos de cobertura y una posible sobrecarga en UCI.",
    createdAt: "2026-03-23T06:00:00.000Z",
    updatedAt: "2026-03-23T06:00:00.000Z",
  },
];
