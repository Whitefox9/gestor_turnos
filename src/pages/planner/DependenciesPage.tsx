import { useMemo, useState } from "react";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { useAuthStore } from "@/app/store/auth.store";
import { useModuleCatalogStore } from "@/app/store/module-catalog.store";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";

const areaOptions = ["UCI", "Hospitalizacion", "Enfermeria", "Biologia", "Urgencias", "Imagenologia", "Farmacia"];

export function DependenciesPage() {
  const tenantId = useAuthStore((state) => state.session?.user.tenantId ?? "tenant-hsj");
  const modules = useModuleCatalogStore((state) => state.modules).filter((module) => module.tenantId === tenantId);
  const addModule = useModuleCatalogStore((state) => state.addModule);
  const removeModule = useModuleCatalogStore((state) => state.removeModule);
  const [name, setName] = useState("");
  const [area, setArea] = useState(areaOptions[0]);
  const [capacity, setCapacity] = useState("6");
  const [skills, setSkills] = useState("");

  const summary = useMemo(
    () => ({
      modules: modules.length,
      totalCapacity: modules.reduce((sum, module) => sum + module.capacity, 0),
    }),
    [modules],
  );

  function handleCreate() {
    if (!name.trim()) {
      return;
    }

    const parsedSkills = skills
      .split(",")
      .map((skill) => skill.trim().toLowerCase())
      .filter(Boolean);

    addModule({
      tenantId,
      name: name.trim(),
      area,
      capacity: Math.max(1, Number(capacity) || 6),
      requiredSkills: parsedSkills.length > 0 ? parsedSkills : getDefaultSkillsForArea(area),
    });

    setName("");
    setArea(areaOptions[0]);
    setCapacity("6");
    setSkills("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dependencias"
        subtitle="Administración institucional de dependencias visibles en el board operativo. Las nuevas dependencias quedan disponibles de inmediato en programación."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 bg-white/95">
          <CardContent className="space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Resumen</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{summary.modules} dependencias</Badge>
              <Badge variant="warning">{summary.totalCapacity} cupos base</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/95">
          <CardContent className="grid gap-3 p-5 md:grid-cols-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la dependencia" />
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Área</span>
              <select
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-cyan-100"
              >
                {areaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <Input value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="Capacidad base" />
            <Input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Skills separadas por coma" />
            <div className="md:col-span-2">
              <Button type="button" className="rounded-xl" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Crear dependencia
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 bg-white/95">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-slate-900">
            <Boxes className="h-4 w-4 text-primary" />
            <p className="font-semibold">Dependencias activas en el board</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {modules.map((module) => (
              <div key={module.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{module.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{module.area}</p>
                  </div>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => removeModule(module.id)}>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="warning">{module.capacity} cupos</Badge>
                  {module.requiredSkills.map((skill) => (
                    <Badge key={`${module.id}-${skill}`} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getDefaultSkillsForArea(area: string) {
  const normalized = area.toLowerCase();

  if (normalized.includes("uci")) {
    return ["uci"];
  }
  if (normalized.includes("hospital")) {
    return ["hospitalizacion"];
  }
  if (normalized.includes("enfer")) {
    return ["medicacion"];
  }
  if (normalized.includes("biolog")) {
    return ["biologia"];
  }
  if (normalized.includes("urgenc")) {
    return ["triage"];
  }
  if (normalized.includes("imagen")) {
    return ["muestras"];
  }
  if (normalized.includes("farm")) {
    return ["medicacion"];
  }

  return [];
}
