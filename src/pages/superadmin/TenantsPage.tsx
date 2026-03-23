import { useTenants } from "@/features/tenants/hooks/useTenants";
import { TenantList } from "@/features/tenants/components/TenantList";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function TenantsPage() {
  const { data, isLoading } = useTenants();

  if (isLoading || !data) {
    return <LoadingState label="Cargando tenants..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="Gestion de instituciones conectadas a la plataforma multi-tenant."
      />
      <TenantList tenants={data} />
    </div>
  );
}
