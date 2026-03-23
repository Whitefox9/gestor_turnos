import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface CriticalPanelProps {
  criticalCount: number;
}

export function CriticalPanel({ criticalCount }: CriticalPanelProps) {
  return (
    <Card className="border-rose-200 bg-rose-50/90 shadow-soft xl:col-span-2">
      <CardHeader className="border-b border-rose-100 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Críticos</p>
            <CardTitle className="mt-2 flex items-center gap-2 text-slate-900">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              Situaciones de intervención inmediata
            </CardTitle>
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
            <p className="text-2xl font-semibold text-rose-600">{criticalCount}</p>
            <p className="text-xs text-slate-500">prioridades</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <CriticalItem
            title="UCI 6 · Noche sin jefe"
            description="Faltan 2 personas y la cobertura queda comprometida."
          />
          <CriticalItem
            title="Hospitalización 2"
            description="Sobrecarga por incapacidad no absorbida en la redistribución."
          />
        </div>
        <Button className="w-full justify-between bg-rose-500 hover:bg-rose-500/90">
          Resolver críticos
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function CriticalItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white/90 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-rose-100 p-2 text-rose-600">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{title}</p>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
