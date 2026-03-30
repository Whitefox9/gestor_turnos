import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { modulesMock } from "@/services/mocks/modules.mock";
import type { CareModule } from "@/shared/types/module.types";

type ModuleDraft = {
  tenantId: string;
  name: string;
  area: string;
  displayColor: string;
  capacity: number;
  requiredSkills: string[];
};

interface ModuleCatalogState {
  modules: CareModule[];
  addModule: (draft: ModuleDraft) => CareModule;
  removeModule: (moduleId: string) => void;
}

export const useModuleCatalogStore = create<ModuleCatalogState>()(
  persist(
    (set, get) => ({
      modules: modulesMock,
      addModule: (draft) => {
        const now = new Date().toISOString();
        const nextIndex = get().modules.length + 1;
        const nextModule: CareModule = {
          id: `mod-dyn-${nextIndex.toString().padStart(3, "0")}`,
          tenantId: draft.tenantId,
          name: draft.name,
          area: draft.area,
          shiftLabel: "Turno mañana",
          displayColor: draft.displayColor,
          capacity: draft.capacity,
          assignedEmployeeIds: [],
          requiredSkills: draft.requiredSkills,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          modules: [...state.modules, nextModule],
        }));

        return nextModule;
      },
      removeModule: (moduleId) =>
        set((state) => ({
          modules: state.modules.filter((module) => module.id !== moduleId),
        })),
    }),
    {
      name: "module-catalog",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = persistedState as ModuleCatalogState | undefined;

        if (!state?.modules?.length) {
          return {
            modules: modulesMock,
          };
        }

        const dynamicModules = state.modules.filter((module) => module.id.startsWith("mod-dyn-"));

        return {
          modules: [
            ...modulesMock,
            ...dynamicModules.map((module) => ({
              ...module,
              displayColor: module.displayColor ?? getDefaultColorForArea(module.area),
            })),
          ],
        };
      },
    },
  ),
);

function getDefaultColorForArea(area: string) {
  const normalized = area.toLowerCase();

  if (normalized.includes("uci")) {
    return "#19D5E8";
  }
  if (normalized.includes("inter")) {
    return "#C7E6A3";
  }
  if (normalized.includes("hospital")) {
    return "#F3E61D";
  }

  return "#D9E2EC";
}
