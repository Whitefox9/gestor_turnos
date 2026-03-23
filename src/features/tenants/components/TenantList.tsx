import { Building2, Users } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { Tenant } from "@/shared/types/tenant.types";

export function TenantList({ tenants }: { tenants: Tenant[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {tenants.map((tenant) => (
        <Card key={tenant.id}>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{tenant.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tenant.code} · {tenant.city}
                  </p>
                </div>
              </div>
              <Badge variant={tenant.active ? "success" : "secondary"}>{tenant.active ? "Activo" : "Inactivo"}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {tenant.employeeCount} empleados registrados
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
