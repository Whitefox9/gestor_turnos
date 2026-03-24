import { useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { useModuleCatalogStore } from "@/app/store/module-catalog.store";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { Avatar } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function PeoplePage() {
  const { data, isLoading } = useEmployees();
  const modules = useModuleCatalogStore((state) => state.modules);
  const [search, setSearch] = useState("");
  const [dependencyFilter, setDependencyFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const people = data ?? [];

  const availableSkills = useMemo(
    () => Array.from(new Set(people.flatMap((employee) => employee.skills))).sort(),
    [people],
  );

  const filteredPeople = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return people.filter((employee) => {
      const matchesSearch =
        !normalized ||
        [employee.fullName, employee.profile, employee.roleLabel, ...employee.skills].join(" ").toLowerCase().includes(normalized);
      const matchesDependency = dependencyFilter === "all" || employee.moduleIds.includes(dependencyFilter);
      const matchesSkill = skillFilter === "all" || employee.skills.includes(skillFilter);
      const matchesStatus = statusFilter === "all" || employee.status === statusFilter;

      return matchesSearch && matchesDependency && matchesSkill && matchesStatus;
    });
  }, [people, dependencyFilter, search, skillFilter, statusFilter]);

  if (isLoading || !data) {
    return <LoadingState label="Cargando personas..." />;
  }

  const availableCount = filteredPeople.filter((employee) => employee.status === "available").length;
  const busyCount = filteredPeople.filter((employee) => employee.status === "busy").length;
  const offCount = filteredPeople.filter((employee) => employee.status === "off").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personas"
        subtitle="Directorio operativo de la dotacion por perfil, disponibilidad y compatibilidad con dependencias."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total personas" value={`${filteredPeople.length}`} tone="secondary" />
        <MetricCard label="Disponibles" value={`${availableCount}`} tone="success" />
        <MetricCard label="En operacion" value={`${busyCount}`} tone="warning" />
        <MetricCard label="No disponibles" value={`${offCount}`} tone="secondary" />
      </section>

      <Card className="border-slate-200 bg-white/95">
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, perfil o skill" />
          <FilterSelect
            label="Dependencia"
            value={dependencyFilter}
            onChange={setDependencyFilter}
            options={[{ value: "all", label: "Todas" }, ...modules.map((module) => ({ value: module.id, label: module.name }))]}
          />
          <FilterSelect
            label="Skill"
            value={skillFilter}
            onChange={setSkillFilter}
            options={[{ value: "all", label: "Todas" }, ...availableSkills.map((skill) => ({ value: skill, label: skill }))]}
          />
          <FilterSelect
            label="Estado"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Todos" },
              { value: "available", label: "Disponibles" },
              { value: "busy", label: "Ocupados" },
              { value: "off", label: "No disponibles" },
            ]}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        {filteredPeople.map((employee) => (
          <Card key={employee.id} className="border-slate-200 bg-white/90">
            <CardContent className="flex items-start gap-4 p-4">
              <Avatar src={employee.avatarUrl} alt={employee.fullName} fallback={getInitials(employee.fullName)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">{employee.fullName}</p>
                  <Badge variant={getStatusVariant(employee.status)}>{getStatusLabel(employee.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{employee.profile}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">{employee.roleLabel}</Badge>
                  <Badge variant="info">{employee.weeklyHours}h</Badge>
                  {employee.skills.slice(0, 3).map((skill) => (
                    <Badge key={`${employee.id}-${skill}`} variant="info">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <UsersRound className="h-4 w-4 text-slate-400" />
                  <span>{employee.moduleIds.length} dependencias compatibles</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-cyan-100"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "secondary" | "success" | "warning";
}) {
  return (
    <Card className="border-slate-200 bg-white/90">
      <CardContent className="space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <Badge variant={tone} className="w-fit">
          {value}
        </Badge>
      </CardContent>
    </Card>
  );
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getStatusVariant(status: "available" | "busy" | "off") {
  if (status === "busy") {
    return "warning" as const;
  }

  if (status === "off") {
    return "secondary" as const;
  }

  return "success" as const;
}

function getStatusLabel(status: "available" | "busy" | "off") {
  if (status === "busy") {
    return "Ocupado";
  }

  if (status === "off") {
    return "No disponible";
  }

  return "Disponible";
}
