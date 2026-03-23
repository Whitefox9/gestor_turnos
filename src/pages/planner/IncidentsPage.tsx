import { useIncidents } from "@/features/incidents/hooks/useIncidents";
import { IncidentList } from "@/features/incidents/components/IncidentList";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function IncidentsPage() {
  const { data, isLoading } = useIncidents();

  if (isLoading || !data) {
    return <LoadingState label="Cargando novedades..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bandeja de novedades"
        subtitle="Ausencias, incidencias y eventos operativos con impacto en la programacion."
      />
      <IncidentList incidents={data} />
    </div>
  );
}
