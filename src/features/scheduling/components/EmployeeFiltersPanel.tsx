import { usePlanningHistoryStore } from "@/app/store/planning-history.store";
import { Button } from "@/shared/components/ui/button";
import { FilterBar } from "@/shared/components/data-display/FilterBar";
import type { CareModule } from "@/shared/types/module.types";

export function EmployeeFiltersPanel({ modules }: { modules: CareModule[] }) {
  const activeDependencyId = usePlanningHistoryStore((state) => state.activePlanningDependencyId);
  const setActivePlanningDependency = usePlanningHistoryStore((state) => state.setActivePlanningDependency);

  return (
    <FilterBar>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeDependencyId === "all" ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => setActivePlanningDependency("all")}
        >
          Todas
        </Button>
        {modules.map((module) => (
          <Button
            key={module.id}
            type="button"
            size="sm"
            variant={activeDependencyId === module.id ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setActivePlanningDependency(module.id)}
          >
            {module.name}
          </Button>
        ))}
      </div>
    </FilterBar>
  );
}
