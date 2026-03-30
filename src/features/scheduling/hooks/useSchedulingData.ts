import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/app/store/auth.store";
import { useModuleCatalogStore } from "@/app/store/module-catalog.store";
import { usePlanningHistoryStore } from "@/app/store/planning-history.store";
import { useUIStore } from "@/app/store/ui.store";
import { isEmployeeCompatibleWithModule, schedulingService } from "../services/scheduling.service";

export function useSchedulingData() {
  const tenantId = useAuthStore((state) => state.session?.user.tenantId);
  const modules = useModuleCatalogStore((state) => state.modules).filter((module) => !tenantId || module.tenantId === tenantId);
  const search = useUIStore((state) => state.schedulingSearch);
  const activeDependencyId = usePlanningHistoryStore((state) => state.activePlanningDependencyId);

  const query = useQuery({
    queryKey: ["planning-board", tenantId],
    queryFn: () => schedulingService.getPlanningBoard(tenantId),
  });

  const filteredEmployees = useMemo(() => {
    const employees = query.data?.employees ?? [];
    const normalized = search.trim().toLowerCase();
    const selectedModule = modules.find((module) => module.id === activeDependencyId);

    return employees.filter((employee) => {
      const matchesSearch = !normalized || [employee.fullName, employee.profile, employee.roleLabel, ...employee.skills]
        .join(" ")
        .toLowerCase()
        .includes(normalized);

      if (!matchesSearch) {
        return false;
      }

      if (!selectedModule) {
        return true;
      }

      return isEmployeeCompatibleWithModule(employee, selectedModule).compatible;
    });
  }, [query.data?.employees, modules, search, activeDependencyId]);

  return {
    ...query,
    data: query.data
      ? {
          ...query.data,
          modules,
        }
      : query.data,
    filteredEmployees,
  };
}
