import { Card, CardContent } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/feedback/StatusBadge";
import type { Incident } from "@/shared/types/incident.types";

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <Card key={incident.id}>
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div>
              <h3 className="font-semibold">{incident.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{incident.summary}</p>
            </div>
            <div className="space-y-2 text-right">
              <StatusBadge label={incident.status} />
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{incident.severity}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
