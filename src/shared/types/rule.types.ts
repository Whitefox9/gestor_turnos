import type { BaseEntity } from "./common.types";

export interface Rule extends BaseEntity {
  code: string;
  name: string;
  description: string;
  enabled: boolean;
  valuation: "critica" | "alta" | "media";
  ruleType: "dura" | "blanda";
  editable: boolean;
  deletable: boolean;
  institutionConfigurable: boolean;
  category: string;
}
