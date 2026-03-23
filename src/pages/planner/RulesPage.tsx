import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useRules } from "@/features/rules/hooks/useRules";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import type { Rule } from "@/shared/types/rule.types";

type RuleDraft = {
  code: string;
  name: string;
  description: string;
  category: string;
  valuation: Rule["valuation"];
  ruleType: Rule["ruleType"];
  enabled: boolean;
  institutionConfigurable: boolean;
};

const emptyDraft: RuleDraft = {
  code: "",
  name: "",
  description: "",
  category: "",
  valuation: "media",
  ruleType: "blanda",
  enabled: true,
  institutionConfigurable: true,
};

export function RulesPage() {
  const { data, isLoading } = useRules();
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<Rule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [valuationFilter, setValuationFilter] = useState("all");

  useEffect(() => {
    if (data) {
      setRules(data);
    }
  }, [data]);

  const summary = useMemo(() => {
    const hardRules = rules.filter((rule) => rule.ruleType === "dura").length;
    const softRules = rules.filter((rule) => rule.ruleType === "blanda").length;
    const criticalRules = rules.filter((rule) => rule.valuation === "critica").length;

    return { hardRules, softRules, criticalRules };
  }, [rules]);

  const availableCategories = useMemo(
    () => Array.from(new Set(rules.map((rule) => rule.category))).sort(),
    [rules],
  );

  const filteredRules = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return rules.filter((rule) => {
      const matchesSearch =
        !normalized ||
        [rule.code, rule.name, rule.description, rule.category].join(" ").toLowerCase().includes(normalized);
      const matchesCategory = categoryFilter === "all" || rule.category === categoryFilter;
      const matchesType = typeFilter === "all" || rule.ruleType === typeFilter;
      const matchesValuation = valuationFilter === "all" || rule.valuation === valuationFilter;

      return matchesSearch && matchesCategory && matchesType && matchesValuation;
    });
  }, [rules, search, categoryFilter, typeFilter, valuationFilter]);

  if (isLoading || !data) {
    return <LoadingState label="Cargando reglas..." />;
  }

  function syncRules(nextRules: Rule[]) {
    setRules(nextRules);
    queryClient.setQueryData(["rules"], nextRules);
  }

  function handleStartCreate() {
    setEditingRuleId(null);
    setDraft({
      ...emptyDraft,
      code: `R-LOC-${String(rules.filter((rule) => rule.code.startsWith("R-LOC-")).length + 1).padStart(2, "0")}`,
    });
    setIsCreating(true);
  }

  function handleStartEdit(rule: Rule) {
    setIsCreating(false);
    setEditingRuleId(rule.id);
    setDraft({
      code: rule.code,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      valuation: rule.valuation,
      ruleType: rule.ruleType,
      enabled: rule.enabled,
      institutionConfigurable: rule.institutionConfigurable,
    });
  }

  function handleCancelForm() {
    setIsCreating(false);
    setEditingRuleId(null);
    setDraft(emptyDraft);
  }

  function handleSubmit() {
    if (!draft.code.trim() || !draft.name.trim() || !draft.description.trim() || !draft.category.trim()) {
      return;
    }

    const now = new Date().toISOString();

    if (editingRuleId) {
      syncRules(
        rules.map((rule) =>
          rule.id === editingRuleId
            ? {
                ...rule,
                ...draft,
                updatedAt: now,
              }
            : rule,
        ),
      );
      handleCancelForm();
      return;
    }

    syncRules([
      {
        id: `rule-local-${Date.now()}`,
        ...draft,
        editable: true,
        deletable: true,
        createdAt: now,
        updatedAt: now,
      },
      ...rules,
    ]);
    handleCancelForm();
  }

  function handleDelete(ruleId: string) {
    syncRules(rules.filter((rule) => rule.id !== ruleId));
    if (editingRuleId === ruleId) {
      handleCancelForm();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reglas"
        subtitle="Catalogo institucional de reglas duras y blandas para gestion de turnos. El rulebook debe ser configurable por institucion."
        actions={
          <Button type="button" className="rounded-xl" onClick={handleStartCreate}>
            <Plus className="h-4 w-4" />
            Agregar regla
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Reglas duras" value={summary.hardRules} variant="danger" />
        <SummaryCard label="Reglas blandas" value={summary.softRules} variant="warning" />
        <SummaryCard label="Criticas" value={summary.criticalRules} variant="danger" />
      </section>

      <Card className="border-slate-200 bg-slate-50/90">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="font-semibold">Insight del SaaS</p>
          </div>
          <p className="text-sm text-slate-600">
            Este catalogo no debe quedar codificado fijo. Cada institucion debe poder activar, desactivar o ajustar sus
            reglas blandas y parametros operativos desde su propio rulebook.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white/95">
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, nombre o categoría" />
          <SelectField
            label="Categoria"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[{ value: "all", label: "Todas" }, ...availableCategories.map((category) => ({ value: category, label: category }))]}
          />
          <SelectField
            label="Tipo"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "Todos" },
              { value: "dura", label: "Duras" },
              { value: "blanda", label: "Blandas" },
            ]}
          />
          <SelectField
            label="Criticidad"
            value={valuationFilter}
            onChange={setValuationFilter}
            options={[
              { value: "all", label: "Todas" },
              { value: "critica", label: "Criticas" },
              { value: "alta", label: "Altas" },
              { value: "media", label: "Medias" },
            ]}
          />
        </CardContent>
      </Card>

      {(isCreating || editingRuleId) ? (
        <Card className="border-slate-200 bg-white/95">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{editingRuleId ? "Editar regla" : "Nueva regla"}</p>
              <Badge variant={draft.ruleType === "dura" ? "danger" : "warning"}>
                {draft.ruleType === "dura" ? "Dura" : "Blanda"}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} placeholder="Codigo" />
              <Input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Categoria" />
            </div>

            <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre de la regla" />

            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Descripcion operativa de la regla"
              className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-cyan-100"
            />

            <div className="grid gap-4 md:grid-cols-4">
              <SelectField
                label="Tipo"
                value={draft.ruleType}
                onChange={(value) => setDraft((current) => ({ ...current, ruleType: value as Rule["ruleType"] }))}
                options={[
                  { value: "dura", label: "Dura" },
                  { value: "blanda", label: "Blanda" },
                ]}
              />
              <SelectField
                label="Valoracion"
                value={draft.valuation}
                onChange={(value) => setDraft((current) => ({ ...current, valuation: value as Rule["valuation"] }))}
                options={[
                  { value: "critica", label: "Critica" },
                  { value: "alta", label: "Alta" },
                  { value: "media", label: "Media" },
                ]}
              />
              <SelectField
                label="Estado"
                value={draft.enabled ? "enabled" : "disabled"}
                onChange={(value) => setDraft((current) => ({ ...current, enabled: value === "enabled" }))}
                options={[
                  { value: "enabled", label: "Activa" },
                  { value: "disabled", label: "Inactiva" },
                ]}
              />
              <SelectField
                label="Rulebook"
                value={draft.institutionConfigurable ? "configurable" : "fixed"}
                onChange={(value) => setDraft((current) => ({ ...current, institutionConfigurable: value === "configurable" }))}
                options={[
                  { value: "configurable", label: "Configurable" },
                  { value: "fixed", label: "Fija" },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" className="rounded-xl" onClick={handleSubmit}>
                {editingRuleId ? "Guardar cambios" : "Crear regla"}
              </Button>
              <Button type="button" variant="outline" className="rounded-xl" onClick={handleCancelForm}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        {filteredRules.map((rule) => (
          <Card key={rule.id} className="border-slate-200 bg-white/90">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{rule.code}</Badge>
                    <p className="font-semibold text-slate-900">{rule.name}</p>
                    <Badge variant={getValuationVariant(rule.valuation)}>{getValuationLabel(rule.valuation)}</Badge>
                    <Badge variant={rule.ruleType === "dura" ? "danger" : "warning"}>
                      {rule.ruleType === "dura" ? "Dura" : "Blanda"}
                    </Badge>
                    {!rule.editable ? (
                      <Badge variant="secondary">
                        <Lock className="mr-1 h-3 w-3" />
                        Fija
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{rule.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{rule.category}</Badge>
                  <Badge variant={rule.enabled ? "success" : "secondary"}>{rule.enabled ? "Activa" : "Inactiva"}</Badge>
                  <Badge variant={rule.institutionConfigurable ? "info" : "secondary"}>
                    {rule.institutionConfigurable ? "Rulebook configurable" : "Fija del sistema"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  {rule.ruleType === "dura" ? (
                    <>
                      <ShieldAlert className="h-4 w-4 text-rose-500" />
                      <span>Bloquea publicacion si se incumple</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      <span>Permite advertencia o justificacion</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => handleStartEdit(rule)}
                    disabled={!rule.editable}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-rose-600"
                    onClick={() => handleDelete(rule.id)}
                    disabled={!rule.deletable}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "danger" | "warning";
}) {
  return (
    <Card className="border-slate-200 bg-white/90">
      <CardContent className="space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <Badge variant={variant} className="w-fit">
          {value}
        </Badge>
      </CardContent>
    </Card>
  );
}

function SelectField({
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

function getValuationVariant(valuation: Rule["valuation"]) {
  if (valuation === "critica") {
    return "danger" as const;
  }

  if (valuation === "alta") {
    return "warning" as const;
  }

  return "info" as const;
}

function getValuationLabel(valuation: Rule["valuation"]) {
  if (valuation === "critica") {
    return "Critica";
  }

  if (valuation === "alta") {
    return "Alta";
  }

  return "Media";
}
