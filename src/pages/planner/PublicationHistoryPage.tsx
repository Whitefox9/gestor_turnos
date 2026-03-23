import { useMemo, useState } from "react";
import { ArrowRightLeft, Download, History, Megaphone, ShieldCheck, ShieldX, Trash2 } from "lucide-react";
import { usePlanningHistoryStore } from "@/app/store/planning-history.store";
import { employeesMock } from "@/services/mocks/employees.mock";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function PublicationHistoryPage() {
  const publicationVersions = usePlanningHistoryStore((state) => state.publicationVersions);
  const auditEntries = usePlanningHistoryStore((state) => state.auditEntries);
  const currentBoardSnapshot = usePlanningHistoryStore((state) => state.currentBoardSnapshot);
  const approvePublication = usePlanningHistoryStore((state) => state.approvePublication);
  const notifyEmployeesForPublication = usePlanningHistoryStore((state) => state.notifyEmployeesForPublication);
  const clearHistory = usePlanningHistoryStore((state) => state.clearHistory);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(publicationVersions[0]?.id ?? null);
  const selectedVersion = publicationVersions.find((version) => version.id === selectedVersionId) ?? publicationVersions[0];
  const comparisonRows = useMemo(() => {
    if (!selectedVersion) {
      return [];
    }

    const currentMap = new Map(currentBoardSnapshot.map((module) => [module.id, module]));

    return selectedVersion.modulesSnapshot.map((historicalModule) => {
      const currentModule = currentMap.get(historicalModule.id);
      const historicalSet = new Set(historicalModule.assignedEmployeeIds);
      const currentSet = new Set(currentModule?.assignedEmployeeIds ?? []);
      const changedAssignments = [
        ...historicalModule.assignedEmployeeIds.filter((employeeId) => !currentSet.has(employeeId)),
        ...(currentModule?.assignedEmployeeIds ?? []).filter((employeeId) => !historicalSet.has(employeeId)),
      ].length;

      return {
        moduleName: historicalModule.name,
        historicalCoverage: historicalModule.assignedEmployeeIds.length,
        currentCoverage: currentModule?.assignedEmployeeIds.length ?? 0,
        changedAssignments,
      };
    });
  }, [currentBoardSnapshot, selectedVersion]);
  const changedModulesCount = comparisonRows.filter((row) => row.changedAssignments > 0).length;
  const assignmentRows = useMemo(() => {
    if (!selectedVersion) {
      return [];
    }

    return selectedVersion.modulesSnapshot.map((module) => ({
      moduleId: module.id,
      moduleName: module.name,
      shiftLabel: module.shiftLabel,
      employees: module.assignedEmployeeIds.map((employeeId) => {
        const employee = employeesMock.find((item) => item.id === employeeId);
        return employee?.fullName ?? employeeId;
      }),
    }));
  }, [selectedVersion]);

  function handleApproveSelectedVersion() {
    if (!selectedVersion || selectedVersion.status === "aprobada") {
      return;
    }

    approvePublication(selectedVersion.id);
  }

  function handleNotifySelectedVersion() {
    if (!selectedVersion) {
      return;
    }

    notifyEmployeesForPublication(selectedVersion.id);
  }

  function handleExportSelectedVersion() {
    if (!selectedVersion) {
      return;
    }

    const rows = [
      ["Version", selectedVersion.versionLabel],
      ["Turno", selectedVersion.shift],
      ["Estado", selectedVersion.status],
      ["Responsable", selectedVersion.publishedBy],
      [],
      ["Dependencia", "Turno", "Empleado"],
      ...selectedVersion.modulesSnapshot.flatMap((module) =>
        module.assignedEmployeeIds.length > 0
          ? module.assignedEmployeeIds.map((employeeId) => [
              module.name,
              module.shiftLabel,
              employeesMock.find((item) => item.id === employeeId)?.fullName ?? employeeId,
            ])
          : [[module.name, module.shiftLabel, "Sin asignación"]],
      ),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedVersion.versionLabel}-${selectedVersion.shift}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publicaciones"
        subtitle="Histórico mock persistido de versiones publicadas y auditoría operativa del cronograma."
        actions={
          <Button type="button" variant="outline" className="rounded-xl" onClick={clearHistory}>
            <Trash2 className="h-4 w-4" />
            Limpiar histórico
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Versiones" value={publicationVersions.length} variant="info" />
        <SummaryCard
          label="Publicaciones exitosas"
          value={auditEntries.filter((entry) => entry.action === "publicar" && entry.status === "success").length}
          variant="success"
        />
        <SummaryCard
          label="Bloqueos registrados"
          value={auditEntries.filter((entry) => entry.status === "blocked").length}
          variant="danger"
        />
      </section>

      {selectedVersion ? (
        <Card className="border-slate-200 bg-white/95">
          <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {selectedVersion.versionLabel} · {selectedVersion.shift}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Estado {selectedVersion.status}. Desde aquí puedes aprobar, exportar y notificar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={handleApproveSelectedVersion}
                disabled={selectedVersion.status === "aprobada"}
              >
                <ShieldCheck className="h-4 w-4" />
                {selectedVersion.status === "aprobada" ? "Aprobada" : "Aprobar"}
              </Button>
              <Button type="button" variant="outline" className="rounded-xl" onClick={handleExportSelectedVersion}>
                <Download className="h-4 w-4" />
                Excel CSV
              </Button>
              <Button type="button" variant="outline" className="rounded-xl" onClick={handleNotifySelectedVersion}>
                <Megaphone className="h-4 w-4" />
                Informar empleados
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-slate-200 bg-white/95">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <History className="h-4 w-4 text-primary" />
              <p className="font-semibold">Versiones publicadas</p>
            </div>

            {publicationVersions.length === 0 ? (
              <EmptyState
                title="Sin publicaciones"
                description="Cuando publiques un cronograma mock, la versión aparecerá aquí y quedará persistida."
              />
            ) : (
              <div className="space-y-3">
                {publicationVersions.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setSelectedVersionId(version.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedVersion?.id === version.id
                        ? "border-cyan-200 bg-cyan-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">{version.versionLabel}</Badge>
                      <Badge variant="success">Readiness {version.readinessScore}</Badge>
                      <Badge variant="secondary">{version.moduleIds.length} módulos</Badge>
                      {selectedVersion?.id === version.id ? <Badge variant="info">Seleccionada</Badge> : null}
                    </div>
                    <p className="mt-3 font-medium text-slate-900">{version.summary}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Publicado por {version.publishedBy} el {formatDate(version.createdAt)}.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {version.rulesUsed.slice(0, 8).map((ruleCode) => (
                        <Badge key={`${version.id}-${ruleCode}`} variant="secondary">
                          {ruleCode}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/95">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              <p className="font-semibold">Comparación con tablero actual</p>
            </div>

            {!selectedVersion ? (
              <EmptyState
                title="Sin versión seleccionada"
                description="Selecciona una versión para comparar su snapshot con el tablero actual."
              />
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{selectedVersion.versionLabel}</Badge>
                    <Badge variant={changedModulesCount > 0 ? "warning" : "success"}>
                      {changedModulesCount} módulos con diferencia
                    </Badge>
                    <Badge variant="secondary">{currentBoardSnapshot.length} módulos actuales</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Se compara el snapshot publicado contra el tablero actual persistido desde programación.
                  </p>
                </div>
                {comparisonRows.map((row) => (
                  <div key={`${selectedVersion.id}-${row.moduleName}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{row.moduleName}</p>
                      <Badge variant={row.changedAssignments > 0 ? "warning" : "success"}>
                        {row.changedAssignments > 0 ? `${row.changedAssignments} cambios` : "Sin cambios"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Histórica {row.historicalCoverage} / Actual {row.currentCoverage}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 bg-white/95">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-slate-900">
            <History className="h-4 w-4 text-primary" />
            <p className="font-semibold">Asignación completa</p>
          </div>

          {!selectedVersion ? (
            <EmptyState
              title="Sin asignación seleccionada"
              description="Selecciona una versión para revisar la distribución completa por dependencia y colaborador."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {assignmentRows.map((row) => (
                <div key={row.moduleId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{row.moduleName}</p>
                    <Badge variant="info">{row.shiftLabel}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {row.employees.map((employeeName) => (
                      <div key={`${row.moduleId}-${employeeName}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        {employeeName}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white/95">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="font-semibold">Auditoría visible</p>
          </div>

          {auditEntries.length === 0 ? (
            <EmptyState
              title="Sin auditoría"
              description="Las simulaciones y publicaciones dejarán rastro aquí aunque cambies de vista."
            />
          ) : (
            <div className="space-y-3">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {entry.status === "success" ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ShieldX className="h-4 w-4 text-rose-600" />
                      )}
                      <p className="font-medium capitalize text-slate-900">{entry.action}</p>
                    </div>
                    <Badge variant={entry.status === "success" ? "success" : "danger"}>{entry.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{entry.detail}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {entry.actorName} · {formatDate(entry.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "info" | "success" | "danger";
}) {
  return (
    <Card className="border-slate-200 bg-white/90">
      <CardContent className="space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <Badge variant={variant} className="w-fit">
          {value}
        </Badge>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
