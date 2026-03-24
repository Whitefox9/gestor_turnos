import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { modulesMock } from "@/services/mocks/modules.mock";
import type { CareModule } from "@/shared/types/module.types";

type ModuleDraft = {
  tenantId: string;
  name: string;
  area: string;
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
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
