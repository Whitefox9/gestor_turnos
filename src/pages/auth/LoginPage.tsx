import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { ROLE_LABELS } from "@/shared/constants/roles";

const loginSchema = z.object({
  selectedUserId: z.string().min(1, "Selecciona un usuario para continuar."),
});

type LoginSchema = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { usersQuery, loginMutation } = useLogin();
  const users = usersQuery.data ?? [];
  const primaryUsers = users.filter((user) => user.role !== "superadmin" && user.role !== "consulta");
  const secondaryUsers = users.filter((user) => user.role === "superadmin" || user.role === "consulta");
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      selectedUserId: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values.selectedUserId);
  });

  return (
    <Card className="border-white/70 bg-white/90 backdrop-blur">
      <CardHeader className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <CardTitle className="text-2xl">Ingreso al MVP</CardTitle>
          <CardDescription>
            Selecciona un usuario mock para validar navegacion, permisos y vistas multi-tenant.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="selectedUserId">
              Usuario de acceso
            </label>
            <select
              id="selectedUserId"
              className="flex h-10 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("selectedUserId")}
            >
              <option value="">Selecciona un usuario</option>
              {primaryUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} · {ROLE_LABELS[user.role]}
                </option>
              ))}
            </select>
            {form.formState.errors.selectedUserId ? (
              <p className="text-sm text-rose-600">{form.formState.errors.selectedUserId.message}</p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Accesos disponibles</p>
            <p className="mt-2">Incluye admin institucional, planificador, coordinador y empleado. Superadmin y consulta quedan aparte.</p>
          </div>

          {secondaryUsers.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-foreground">Accesos aparte</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {secondaryUsers.map((user) => (
                  <Button
                    key={user.id}
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => loginMutation.mutate(user.id)}
                  >
                    {user.fullName} · {ROLE_LABELS[user.role]}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Ingresando..." : "Continuar"}
          </Button>

          {loginMutation.isError ? (
            <Input readOnly value="No fue posible iniciar sesion con el usuario seleccionado." className="border-rose-200 bg-rose-50 text-rose-700" />
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
