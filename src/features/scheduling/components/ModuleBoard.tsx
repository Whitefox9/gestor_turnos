import type { CareModule } from "@/shared/types/module.types";
import type { Employee } from "@/shared/types/employee.types";
import type { Rule } from "@/shared/types/rule.types";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { DroppableModuleSlot } from "./DroppableModuleSlot";
import { ModuleCard } from "./ModuleCard";
import { getMockModuleRisk } from "../services/scheduling.service";

export function ModuleBoard({
  modules,
  employees,
  activeRules,
  previewEmployee,
  hoveredTargetId,
  invalidModuleId,
  successModuleId,
  successTargetId,
  releasedTargetId,
  onUnassign,
  onReassign,
}: {
  modules: CareModule[];
  employees: Employee[];
  activeRules: Rule[];
  previewEmployee?: Employee | null;
  hoveredTargetId?: string | null;
  invalidModuleId?: string | null;
  successModuleId?: string | null;
  successTargetId?: string | null;
  releasedTargetId?: string | null;
  onUnassign: (employeeId: string, moduleId: string) => void;
  onReassign: (employeeId: string, moduleId: string) => void;
}) {
  const assignedCount = modules.reduce((total, module) => total + module.assignedEmployeeIds.length, 0);

  return (
    <Card className="border-slate-200 bg-white/90">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Board operativo</p>
            <CardTitle className="mt-2 text-xl">Módulos y dependencias del turno</CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              El foco operativo está en la cobertura por módulo, sus slots y el resumen del personal asignado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{modules.length} módulos</Badge>
            <Badge variant="info">{assignedCount} asignados</Badge>
            <Badge variant="warning">{modules.reduce((sum, module) => sum + module.capacity, 0)} slots</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid gap-4 xl:grid-cols-2">
          {modules.map((module, index) => {
            const assignedEmployees = employees.filter((employee) => module.assignedEmployeeIds.includes(employee.id));
            const moduleRisk = getMockModuleRisk(module, assignedEmployees, activeRules);

            return (
              <div
                key={module.id}
                className={modules.length % 2 !== 0 && index === modules.length - 1 ? "xl:col-span-2" : undefined}
              >
                <DroppableModuleSlot
                  moduleId={module.id}
                  isInvalid={invalidModuleId === module.id}
                  isSuccessful={successModuleId === module.id}
                  riskLevel={moduleRisk.level}
                >
                  <ModuleCard
                    module={module}
                    modules={modules}
                    assignedEmployees={assignedEmployees}
                    activeRules={activeRules}
                    previewEmployee={previewEmployee}
                    hoveredTargetId={hoveredTargetId}
                    successTargetId={successTargetId}
                    releasedTargetId={releasedTargetId}
                    onUnassign={onUnassign}
                    onReassign={onReassign}
                  />
                </DroppableModuleSlot>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
