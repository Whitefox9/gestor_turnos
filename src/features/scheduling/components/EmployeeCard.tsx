import type { ReactNode } from "react";
import { AlertTriangle, Clock3, GripVertical, ShieldAlert, Stethoscope } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { Employee } from "@/shared/types/employee.types";
import { cn } from "@/shared/utils/cn";

export function EmployeeCard({
  employee,
  compact = false,
  actions,
  dragHandle,
  highlightLabel,
  highlighted = false,
}: {
  employee: Employee;
  compact?: boolean;
  actions?: ReactNode;
  dragHandle?: ReactNode;
  highlightLabel?: string;
  highlighted?: boolean;
}) {
  const statusConfig = getStatusConfig(employee.status);
  const recentShifts = getRecentShiftHistory(employee);
  const alerts = getOperationalSignals(employee);

  return (
    <Card className={cn("border-white/80 bg-white/95 shadow-sm", highlighted && "border-cyan-200 bg-cyan-50/40 ring-2 ring-cyan-100")}>
      <CardContent className={compact ? "space-y-3 p-4" : "space-y-4 p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar
              src={employee.avatarUrl}
              alt={employee.fullName}
              fallback={getInitials(employee.fullName)}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-slate-900">{employee.fullName}</p>
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                {highlightLabel ? <Badge variant="info">{highlightLabel}</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{employee.profile}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dragHandle ?? (
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl p-0 text-slate-400">
                <GripVertical className="h-4 w-4" />
              </Button>
            )}
            <div className="rounded-xl bg-cyan-50 p-2 text-primary">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{employee.roleLabel}</Badge>
          <Badge variant={employee.weeklyHours >= 40 ? "warning" : "info"}>
            <Clock3 className="mr-1 h-3 w-3" />
            {employee.weeklyHours}h
          </Badge>
          {employee.skills.slice(0, compact ? 1 : 2).map((skill) => (
            <Badge key={skill} variant="info">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="rounded-2xl bg-slate-50/90 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Historial reciente</p>
            <p className="text-xs text-slate-500">{employee.moduleIds[0] ?? "Sin módulo base"}</p>
          </div>
          <div className="mt-3 flex gap-1.5">
            {recentShifts.map((shift, index) => (
              <div
                key={`${employee.id}-shift-${index}`}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-semibold ${shift.className}`}
                title={shift.label}
              >
                {shift.short}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {alerts.length > 0 ? (
            alerts.slice(0, compact ? 1 : 2).map((alert) => (
              <div
                key={alert.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${alert.className}`}
              >
                {alert.icon}
                {alert.label}
              </div>
            ))
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <ShieldAlert className="h-3.5 w-3.5" />
              Perfil estable
            </div>
          )}
        </div>

        {actions ? <div className="pt-1">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}

function getStatusConfig(status: Employee["status"]) {
  if (status === "busy") {
    return { label: "Ocupado", variant: "warning" as const };
  }

  if (status === "off") {
    return { label: "No disponible", variant: "secondary" as const };
  }

  return { label: "Disponible", variant: "success" as const };
}

function getRecentShiftHistory(employee: Employee) {
  const templates = {
    available: ["M", "T", "M", "N", "L"],
    busy: ["T", "N", "M", "T", "N"],
    off: ["L", "L", "M", "T", "L"],
  } as const;

  const classes = {
    M: "bg-sky-100 text-sky-700",
    T: "bg-emerald-100 text-emerald-700",
    N: "bg-amber-100 text-amber-700",
    L: "bg-slate-200 text-slate-500",
  } as const;

  const labels = {
    M: "Mañana",
    T: "Tarde",
    N: "Noche",
    L: "Libre",
  } as const;

  return templates[employee.status].map((short) => ({
    short,
    className: classes[short],
    label: labels[short],
  }));
}

function getOperationalSignals(employee: Employee) {
  const signals: Array<{ label: string; className: string; icon: JSX.Element }> = [];

  if (employee.assignedToday) {
    signals.push({
      label: "Ya asignado hoy",
      className: "bg-amber-50 text-amber-700",
      icon: <Clock3 className="h-3.5 w-3.5" />,
    });
  }

  if (employee.weeklyHours >= 40) {
    signals.push({
      label: "Carga alta",
      className: "bg-rose-50 text-rose-700",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    });
  }

  if (employee.status === "off") {
    signals.push({
      label: "No disponible",
      className: "bg-slate-100 text-slate-600",
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
    });
  }

  return signals;
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
