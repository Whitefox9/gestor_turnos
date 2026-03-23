import { useUIStore } from "@/app/store/ui.store";
import { Button } from "@/shared/components/ui/button";
import { FilterBar } from "@/shared/components/data-display/FilterBar";
import { SearchInput } from "@/shared/components/data-display/SearchInput";
import type { CareModule } from "@/shared/types/module.types";

export function EmployeeFiltersPanel({ modules }: { modules: CareModule[] }) {
  const search = useUIStore((state) => state.schedulingSearch);
  const targetFilter = useUIStore((state) => state.schedulingTargetFilter);
  const setSearch = useUIStore((state) => state.setSchedulingSearch);
  const setTargetFilter = useUIStore((state) => state.setSchedulingTargetFilter);

  return (
    <FilterBar>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre, perfil o skill"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={targetFilter === "all" ? "default" : "outline"}
          className="rounded-xl"
          onClick={() => setTargetFilter("all")}
        >
          Todas
        </Button>
        {modules.map((module) => (
          <Button
            key={module.id}
            type="button"
            size="sm"
            variant={targetFilter === module.id ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setTargetFilter(module.id)}
          >
            {module.name}
          </Button>
        ))}
      </div>
    </FilterBar>
  );
}
