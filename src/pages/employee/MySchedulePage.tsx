import { useMemo } from "react";
import { CalendarDays, Clock3, Megaphone } from "lucide-react";
import { useAuthStore } from "@/app/store/auth.store";
import { usePlanningHistoryStore } from "@/app/store/planning-history.store";
import { employeesMock } from "@/services/mocks/employees.mock";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function MySchedulePage() {
  const session = useAuthStore((state) => state.session);
  const publicationVersions = usePlanningHistoryStore((state) => state.publicationVersions);
  const employeeNotifications = usePlanningHistoryStore((state) => state.employeeNotifications);
  const employee = employeesMock.find((item) => item.fullName === session?.user.fullName);

  const approvedSchedules = useMemo(() => {
    if (!employee) {
      return [];
    }

    return publicationVersions
      .filter((version) => version.status === "aprobada")
      .filter((version) =>
        version.modulesSnapshot.some((module) => module.assignedEmployeeIds.includes(employee.id)),
      );
  }, [employee, publicationVersions]);

  const upcomingAssignments = useMemo(() => {
    if (!employee) {
      return [];
    }

    return approvedSchedules.flatMap((version) =>
      version.modulesSnapshot
        .filter((module) => module.assignedEmployeeIds.includes(employee.id))
        .map((module) => ({
          versionId: version.id,
          versionLabel: version.versionLabel,
          plannedDate: version.plannedDate,
          shift: version.shift,
          moduleName: module.name,
          status: version.status,
        })),
    );
  }, [approvedSchedules, employee]);

  const notifications = useMemo(() => {
    if (!employee) {
      return [];
    }

    return employeeNotifications.filter((notification) => notification.employeeId === employee.id);
  }, [employee, employeeNotifications]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi horario"
        subtitle="Vista del colaborador con asignaciones aprobadas, turnos notificados y contexto operativo."
      />

      {!employee ? (
        <EmptyState title="Empleado no encontrado" description="No se encontró un perfil operativo asociado a esta sesión." />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Último turno aprobado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {upcomingAssignments[0] ? (
                  <>
                    <p className="font-medium text-foreground">{upcomingAssignments[0].moduleName}</p>
                    <p>{formatDate(upcomingAssignments[0].plannedDate)}</p>
                    <p>{getShiftLabel(upcomingAssignments[0].shift)}</p>
                    <Badge variant="success">{upcomingAssignments[0].versionLabel}</Badge>
                  </>
                ) : (
                  <p>Tu asignación aprobada aparecerá aquí cuando el planificador la publique y la apruebe.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-primary" />
                  Próximos movimientos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {upcomingAssignments.slice(0, 3).length > 0 ? (
                  upcomingAssignments.slice(0, 3).map((assignment) => (
                    <div key={`${assignment.versionId}-${assignment.moduleName}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="font-medium text-foreground">{assignment.moduleName}</p>
                      <p>{formatDate(assignment.plannedDate)}</p>
                      <p>{getShiftLabel(assignment.shift)}</p>
                    </div>
                  ))
                ) : (
                  <p>Aún no tienes movimientos confirmados.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Notificaciones de publicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length > 0 ? (
                notifications.slice(0, 6).map((notification) => (
                  <div key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{notification.title}</p>
                      <Badge variant="info">{getShiftLabel(notification.shift)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Sin notificaciones"
                  description="Cuando una publicación aprobada te incluya, verás la notificación aquí."
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function getShiftLabel(shift: ShiftKind) {
  if (shift === "manana") {
    return "Turno mañana";
  }
  if (shift === "tarde") {
    return "Turno tarde";
  }
  if (shift === "noche") {
    return "Turno noche";
  }
  if (shift === "noche_larga") {
    return "Turno noche larga";
  }
  return "Descanso remunerado";
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}
import type { ShiftKind } from "@/shared/types/scheduling.types";
