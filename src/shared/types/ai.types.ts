import type { BaseEntity } from "./common.types";

export interface AIInsight extends BaseEntity {
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface AIChatMessage extends BaseEntity {
  role: "assistant" | "user";
  content: string;
}
