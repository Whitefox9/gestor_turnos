import { CalendarDays, Eye, Layers3 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

const modules = [
  { name: "Hospitalización 7 CD", tone: "bg-amber-400" },
  { name: "UCI Coronaria", tone: "bg-emerald-400" },
  { name: "UCI 6", tone: "bg-cyan-400" },
  { name: "Cuarto Piso Intermedios", tone: "bg-sky-400" },
];

const days = [
  { day: "20", status: ["bg-slate-300", "bg-amber-300", "bg-emerald-300"], coverage: "estable" },
  { day: "21", status: ["bg-sky-300", "bg-emerald-300", "bg-slate-300"], coverage: "estable" },
  { day: "22", status: ["bg-amber-300", "bg-slate-300", "bg-sky-300"], coverage: "parcial" },
  { day: "23", status: ["bg-cyan-300", "bg-emerald-300", "bg-amber-300"], coverage: "estable" },
  { day: "24", status: ["bg-sky-300", "bg-sky-300", "bg-slate-300"], coverage: "vigilado" },
  { day: "25", status: ["bg-amber-300", "bg-emerald-300", "bg-slate-300"], coverage: "estable" },
  { day: "26", status: ["bg-slate-300", "bg-amber-300", "bg-rose-300"], coverage: "crítico" },
];

export function ShiftBoxOverviewPanel() {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Caja de turnos</p>
          <CardTitle className="mt-2 text-base">Resumen visual del horario general</CardTitle>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Vista consolidada por módulos y días para anticipar cobertura, tensión operativa y focos de seguimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">
            <Layers3 className="mr-1.5 h-3.5 w-3.5" />
            4 módulos visibles
          </Badge>
          <Badge variant="warning">18 alertas</Badge>
          <Badge variant="danger">1 sin asignar</Badge>
          <Button variant="outline" size="sm" className="rounded-xl">
            <Eye className="h-4 w-4" />
            Ver consolidado
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap gap-2">
          {modules.map((module) => (
            <div key={module.name} className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className={`h-2.5 w-2.5 rounded-full ${module.tone}`} />
              {module.name}
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-slate-50/80 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-600">
            <CalendarDays className="h-4 w-4 text-primary" />
            Preview semanal de cobertura
          </div>

          <div className="grid gap-3 md:grid-cols-7">
            {days.map((item) => (
              <div key={item.day} className="rounded-2xl border border-slate-200 bg-white px-3 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Abr</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{item.day}</p>
                  </div>
                  <Badge
                    variant={
                      item.coverage === "crítico"
                        ? "danger"
                        : item.coverage === "vigilado"
                          ? "warning"
                          : item.coverage === "parcial"
                            ? "info"
                            : "success"
                    }
                    className="capitalize"
                  >
                    {item.coverage}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex gap-1.5">
                    {item.status.map((tone, index) => (
                      <span key={`${item.day}-m-${index}`} className={`h-2 flex-1 rounded-full ${tone}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Mañana · Tarde · Noche</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
