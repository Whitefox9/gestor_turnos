import type { Incident } from "@/shared/types/incident.types";
import { ArrowRight, ClipboardList, Stethoscope } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface PendingIncidentsPanelProps {
  incidents: Incident[];
}

export function PendingIncidentsPanel({ incidents }: PendingIncidentsPanelProps) {
  return (
    <Card className="border-sky-200 bg-sky-50/85">
      <CardHeader className="border-b border-sky-100 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Novedades pendientes</p>
            <CardTitle className="mt-2 flex items-center gap-2 text-slate-900">
              <ClipboardList className="h-5 w-5 text-sky-500" />
              Bandeja procesable
            </CardTitle>
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
            <p className="text-2xl font-semibold text-sky-700">277</p>
            <p className="text-xs text-slate-500">por revisar</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-sky-100 p-2 text-sky-600">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{incident.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{incident.summary}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full justify-between">
          Procesar novedades
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
