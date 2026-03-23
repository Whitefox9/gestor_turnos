import { ArrowRight, BellDot } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface AlertsPanelProps {
  alertsCount: number;
}

export function AlertsPanel({ alertsCount }: AlertsPanelProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/85">
      <CardHeader className="border-b border-amber-100 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">Alertas</p>
            <CardTitle className="mt-2 flex items-center gap-2 text-slate-900">
              <BellDot className="h-5 w-5 text-amber-500" />
              Riesgos operativos
            </CardTitle>
          </div>
          <Badge variant="warning">{alertsCount} activas</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        <AlertLine title="Hospitalización 2" meta="3 personas con sobrecarga" />
        <AlertLine title="Cuarto Piso Intermedios" meta="Desbalance proyectado por franja" />
        <AlertLine title="Enfermería Central" meta="Riesgo de sobretiempo" />
        <Button variant="outline" className="mt-2 w-full justify-between border-amber-200 bg-white">
          Revisar alertas
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function AlertLine({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-white/85 px-4 py-3">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{meta}</p>
    </div>
  );
}
