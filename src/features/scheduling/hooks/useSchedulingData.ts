import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/app/store/auth.store";
import { useUIStore } from "@/app/store/ui.store";
import { schedulingService } from "../services/scheduling.service";

export function useSchedulingData() {
  const tenantId = useAuthStore((state) => state.session?.user.tenantId);
  const search = useUIStore((state) => state.schedulingSearch);
  const targetFilter = useUIStore((state) => state.schedulingTargetFilter);

  const query = useQuery({
    queryKey: ["planning-board", tenantId],
    queryFn: () => schedulingService.getPlanningBoard(tenantId),
  });

  const filteredEmployees = useMemo(() => {
    const employees = query.data?.employees ?? [];
    const modules = query.data?.modules ?? [];
    const normalized = search.trim().toLowerCase();
    const selectedModule = modules.find((module) => module.id === targetFilter);

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

      return employee.moduleIds.includes(selectedModule.id) ||
        selectedModule.requiredSkills.some((skill) => employee.skills.includes(skill));
    });
  }, [query.data?.employees, query.data?.modules, search, targetFilter]);

  return {
    ...query,
    filteredEmployees,
  };
}
