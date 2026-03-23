import { CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function SchedulingToolbar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-white/80 p-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4 text-primary" />
        Jornada del 23 de marzo de 2026 · Turno dia
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline">Guardar borrador</Button>
        <Button>
          <Sparkles className="h-4 w-4" />
          Sugerir ajustes
        </Button>
      </div>
    </div>
  );
}
