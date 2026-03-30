import type { ReactNode } from "react";
import { BedDouble, Building, HeartPulse, ShieldCheck, Sparkles, Stethoscope, Users2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import type { CareModule } from "@/shared/types/module.types";
import type { Employee } from "@/shared/types/employee.types";
import type { Rule } from "@/shared/types/rule.types";
import type { HoverAssignmentPreview, LocalizedIncidentImpact, ShiftAssignment, ShiftKind } from "@/shared/types/scheduling.types";
import { DroppableAssignmentSlot } from "./DroppableAssignmentSlot";
import { getHoverAssignmentPreview, getMockAssignmentScore, getMockModuleRisk, getMockModuleScore, getMockSlotRisk, getModuleDailyShiftSummary, getRestAssignmentReason } from "../services/scheduling.service";

const areaIcons = {
  UCI: HeartPulse,
  Hospitalizacion: BedDouble,
  Intermedios: Stethoscope,
};

export function ModuleCard({
  module,
  modules,
  employees,
  assignedEmployees,
  activeRules,
  previewEmployee,
  hoveredTargetId,
  selectedTargetId,
  planningDate,
  planningShift,
  weeklyAssignments,
  weekStartDate,
  successTargetId,
  releasedTargetId,
  invalidAssignedEmployeeIds,
  incidentImpacts,
  onSelectIncidentImpact,
  onSelectTarget,
  onSelectModule,
  onSelectShift,
}: {
  module: CareModule;
  modules: CareModule[];
  employees: Employee[];
  assignedEmployees: Employee[];
  activeRules: Rule[];
  previewEmployee?: Employee | null;
  hoveredTargetId?: string | null;
  selectedTargetId?: string | null;
  planningDate: string;
  planningShift: ShiftKind;
  weeklyAssignments: ShiftAssignment[];
  weekStartDate: string;
  successTargetId?: string | null;
  releasedTargetId?: string | null;
  invalidAssignedEmployeeIds: string[];
  incidentImpacts: LocalizedIncidentImpact[];
  onSelectIncidentImpact: (incidentId: string) => void;
  onSelectTarget: (targetId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onSelectShift: (moduleId: string, shift: ShiftKind) => void;
}) {
  const Icon = areaIcons[module.area as keyof typeof areaIcons] ?? Building;
  const isModuleSelected = selectedTargetId === `module::${module.id}`;
  const occupancyRatio = assignedEmployees.length / module.capacity;
  const status =
    assignedEmployees.length === 0 ? "Sin cobertura" : occupancyRatio >= 1 ? "Cubierto" : "Cobertura parcial";
  const statusVariant = assignedEmployees.length === 0 ? "warning" : occupancyRatio >= 1 ? "success" : "info";
  const assignmentState =
    assignedEmployees.length === 0
      ? "Pendiente por asignar"
      : occupancyRatio >= 1
        ? "Dependencia asignada completa"
        : "Dependencia asignada parcialmente";
  const slots = Array.from({ length: module.capacity }, (_, index) => assignedEmployees[index] ?? null);
  const occupiedSlots = slots.filter(Boolean).length;
  const emptySlots = slots.length - occupiedSlots;
  const moduleScore = getMockModuleScore(module, assignedEmployees, activeRules);
  const moduleRisk = getMockModuleRisk(module, assignedEmployees, activeRules);
  const dailyShiftSummary = getModuleDailyShiftSummary({
    moduleId: module.id,
    assignments: weeklyAssignments,
    planningDate,
  }).map((entry) =>
    entry.shift === planningShift
      ? {
          ...entry,
          count: assignedEmployees.length,
        }
      : entry,
  );
  const assistanceShiftSummary = dailyShiftSummary.filter((entry) => entry.shift !== "descanso_remunerado");
  const restShiftSummary = dailyShiftSummary.find((entry) => entry.shift === "descanso_remunerado");
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));

  return (
    <div
      className={`space-y-5 rounded-[26px] px-1 py-1 transition ${
        isModuleSelected ? "ring-2 ring-cyan-200 ring-offset-2 ring-offset-white" : ""
      }`}
      onClick={() => onSelectModule(module.id)}
    >
      <div className="h-2 rounded-full" style={{ backgroundColor: module.displayColor }} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-2xl p-3" style={{ backgroundColor: `${module.displayColor}33`, color: "#0f172a" }}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight text-slate-900 sm:text-lg">
                {module.name}
              </p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                {module.area} · {module.shiftLabel}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={statusVariant} className="shrink-0">
            {status}
          </Badge>
          {moduleRisk.level !== "none" ? (
            <Badge variant={moduleRisk.level === "high" ? "danger" : moduleRisk.level === "medium" ? "warning" : "info"}>
              {moduleRisk.level === "high" ? "Riesgo alto" : moduleRisk.level === "medium" ? "Riesgo medio" : "Riesgo bajo"}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Estado de asignación</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{assignmentState}</p>
            </div>
            <Badge variant={statusVariant}>{assignedEmployees.length}/{module.capacity}</Badge>
          </div>
        </div>
        <SummaryMetric label="Cobertura" value={`${assignedEmployees.length}/${module.capacity}`} icon={<ShieldCheck className="h-4 w-4" />} />
        <SummaryMetric label="Turno" value={module.shiftLabel} icon={<Users2 className="h-4 w-4" />} />
        <SummaryMetric label="Score mock" value={`${moduleScore}`} icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Jornadas asistenciales del día</p>
          <p className="text-xs text-slate-500">Convenciones: M · T · N · NL</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {assistanceShiftSummary.map((entry) => {
            const previewNames = entry.employeeIds
              .slice(0, 2)
              .map((employeeId) => employeesById.get(employeeId)?.fullName.split(" ")[0] ?? "N/A");

            return (
            <button
              key={`${module.id}-${entry.shift}`}
              type="button"
              className={`rounded-2xl border px-2 py-2 text-center ${
                entry.shift === planningShift
                  ? "border-primary bg-cyan-50 text-cyan-900"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectShift(module.id, entry.shift);
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                {entry.shift === "manana"
                  ? "M"
                  : entry.shift === "tarde"
                    ? "T"
                    : entry.shift === "noche"
                      ? "N"
                      : "NL"}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {`${entry.count}/${module.capacity}`}
              </p>
              <div className="mt-2 min-h-8 space-y-1">
                {previewNames.length > 0 ? (
                  <>
                    {previewNames.map((name) => (
                      <p key={`${module.id}-${entry.shift}-${name}`} className="truncate text-[10px] leading-tight text-slate-500">
                        {name}
                      </p>
                    ))}
                    {entry.employeeIds.length > 2 ? (
                      <p className="text-[10px] leading-tight text-slate-400">+{entry.employeeIds.length - 2}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[10px] leading-tight text-slate-400">Sin cobertura</p>
                )}
              </div>
            </button>
          )})}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Descansos del día</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {restShiftSummary?.count ?? 0} personas protegidas con libre o compensatorio
              </p>
            </div>
            <Badge variant="secondary">{restShiftSummary?.count ?? 0}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {restShiftSummary && restShiftSummary.employeeIds.length > 0 ? (
              restShiftSummary.employeeIds.slice(0, 4).map((employeeId) => (
                <span key={`${module.id}-rest-${employeeId}`} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                  {employeesById.get(employeeId)?.fullName.split(" ").slice(0, 2).join(" ") ?? "N/A"}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">Todavía no hay descansos asignados para esta dependencia.</span>
            )}
            {restShiftSummary && restShiftSummary.employeeIds.length > 4 ? (
              <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">
                +{restShiftSummary.employeeIds.length - 4} más
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {moduleRisk.reasons.length > 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Reglas con impacto:</span> {moduleRisk.reasons.join(" · ")}
        </div>
      ) : null}

      {incidentImpacts.length > 0 ? (
        <button
          type="button"
          className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 transition hover:border-amber-300"
          onClick={(event) => {
            event.stopPropagation();
            onSelectIncidentImpact(incidentImpacts[0].incidentId);
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
              <div className="min-w-0">
                <p className="font-medium">Incidencia localizada</p>
                <p className="truncate text-amber-800">
                  {incidentImpacts[0].employeeName} fuera
                </p>
              </div>
            </div>
            <Badge variant="warning">{incidentImpacts.length}</Badge>
          </div>
        </button>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Slots del turno activo</p>
          <p className="text-sm text-slate-500">{occupiedSlots} ocupados · {emptySlots} libres</p>
        </div>
        <div className="grid gap-3">
          {slots.map((employee, index) => {
            const slotRisk = getMockSlotRisk(employee, module, activeRules);
            const slotTargetId = `${module.id}::slot-${index}`;
            const restReason =
              planningShift === "descanso_remunerado" && employee
                ? getRestAssignmentReason({
                    employee,
                    assignments: weeklyAssignments,
                    weekStartDate,
                  })
                : null;
            const preview: HoverAssignmentPreview | null =
              previewEmployee && hoveredTargetId === slotTargetId
                ? getHoverAssignmentPreview(previewEmployee, module, modules, activeRules)
                : null;

            return (
              <DroppableAssignmentSlot
                key={slotTargetId}
                droppableId={slotTargetId}
                slotIndex={index}
                employeeName={employee?.fullName}
                score={employee ? getMockAssignmentScore(employee, module, activeRules) : undefined}
                isSuccessful={successTargetId === slotTargetId}
                isReleased={releasedTargetId === slotTargetId}
                compact={!employee}
                riskLevel={slotRisk.level}
                riskHint={restReason?.detail ?? slotRisk.reasons[0]}
                previewCandidateName={preview?.employeeName}
                previewScore={preview?.score}
                previewAdvisoryCodes={preview?.advisoryRuleCodes}
                isSelected={selectedTargetId === slotTargetId}
                onSelect={onSelectTarget}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Personal asignado</p>
          <p className="text-sm text-slate-500">{assignedEmployees.length} resumido</p>
        </div>
          {assignedEmployees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assignedEmployees.map((employee) => {
                const restReason =
                  planningShift === "descanso_remunerado"
                    ? getRestAssignmentReason({
                        employee,
                        assignments: weeklyAssignments,
                        weekStartDate,
                      })
                    : null;

                return (
                  <div
                    key={employee.id}
                    className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate">{employee.fullName}</span>
                      <Badge variant="info">Fit {getMockAssignmentScore(employee, module, activeRules)}</Badge>
                      {restReason ? <Badge variant={restReason.tone}>{restReason.label}</Badge> : null}
                      {invalidAssignedEmployeeIds.includes(employee.id) ? <Badge variant="warning">Inválido</Badge> : null}
                    </div>
                    {restReason ? <p className="mt-2 text-xs text-slate-500">{restReason.detail}</p> : null}
                  </div>
                );
              })}
            </div>
          ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
            Sin personal asignado todavía. El módulo queda listo para recibir colaboradores.
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-4">
      <div className="flex items-start gap-2 text-slate-500">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-slate-500 sm:text-[11px]">
          {label}
        </p>
      </div>
      <p className="mt-2 break-words text-sm font-medium leading-tight text-slate-800">{value}</p>
    </div>
  );
}
