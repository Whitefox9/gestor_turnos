import { ChevronLeft, ChevronRight, CalendarDays, Moon, MoonStar, Sun, Sunset } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import type { ShiftKind } from "@/shared/types/scheduling.types";

const shiftOptions: Array<{ value: ShiftKind; label: string; icon: typeof Sun }> = [
  { value: "manana", label: "Mañana", icon: Sun },
  { value: "tarde", label: "Tarde", icon: Sunset },
  { value: "noche", label: "Noche", icon: MoonStar },
  { value: "noche_larga", label: "Noche larga", icon: Moon },
  { value: "descanso_remunerado", label: "Descanso", icon: Moon },
];

const weekDayLabels = ["L", "M", "M", "J", "V", "S", "D"];

export function SchedulingToolbar({
  currentPlanningDate,
  currentPlanningShift,
  weekDays,
  planningRangeStart,
  planningRangeEnd,
  onSelectDate,
  onSelectShift,
  onSelectRange,
}: {
  currentPlanningDate: string;
  currentPlanningShift: ShiftKind;
  weekDays: Array<{ date: string; label: string }>;
  planningRangeStart: string;
  planningRangeEnd: string;
  onSelectDate: (date: string) => void;
  onSelectShift: (shift: ShiftKind) => void;
  onSelectRange: (start: string, end: string) => void;
}) {
  const monthStart = getMonthStart(currentPlanningDate);
  const monthGrid = getMonthGrid(monthStart);

  function handleMonthChange(direction: -1 | 1) {
    const nextMonthDate = addMonths(monthStart, direction);
    onSelectDate(nextMonthDate);
    onSelectRange(nextMonthDate, nextMonthDate);
  }

  function handleDateSelection(date: string) {
    if (planningRangeStart === planningRangeEnd || date < planningRangeStart || date > planningRangeEnd) {
      const [start, end] = [planningRangeStart, date].sort();
      onSelectRange(start, end);
    } else {
      onSelectRange(date, date);
    }

    onSelectDate(date);
  }

  return (
    <div className="space-y-4 rounded-3xl border bg-white/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          Planificación mensual operando por día activo
        </div>
        <Badge variant="info">
          {formatDate(currentPlanningDate)} · {getShiftLabel(currentPlanningShift)}
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{formatMonthTitle(monthStart)}</p>
              <p className="mt-1 text-xs text-slate-500">
                Selecciona un día o arma un rango corto. El board sigue trabajando sobre el día resaltado.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-xl p-0" onClick={() => handleMonthChange(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-xl p-0" onClick={() => handleMonthChange(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {weekDayLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {monthGrid.map((day) => {
              const isSelected = day.date === currentPlanningDate;
              const inRange = day.date >= planningRangeStart && day.date <= planningRangeEnd;
              const isRangeEdge = day.date === planningRangeStart || day.date === planningRangeEnd;

              return (
                <button
                  key={day.date}
                  type="button"
                  className={cn(
                    "flex h-11 items-center justify-center rounded-xl border text-sm transition",
                    day.isCurrentMonth ? "border-slate-200 bg-white text-slate-700" : "border-slate-100 bg-slate-100/70 text-slate-400",
                    inRange && "border-cyan-200 bg-cyan-50 text-cyan-800",
                    isRangeEdge && "border-primary bg-primary text-white",
                    isSelected && "ring-2 ring-primary/20",
                  )}
                  onClick={() => handleDateSelection(day.date)}
                >
                  {day.dayNumber}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Ventana activa</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatShortDate(planningRangeStart)}
              {planningRangeStart !== planningRangeEnd ? ` → ${formatShortDate(planningRangeEnd)}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => (
              <Button
                key={day.date}
                type="button"
                variant={currentPlanningDate === day.date ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => {
                  onSelectRange(day.date, day.date);
                  onSelectDate(day.date);
                }}
              >
                {day.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-2">
            {shiftOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={currentPlanningShift === option.value ? "default" : "outline"}
                  className="justify-start rounded-xl"
                  onClick={() => onSelectShift(option.value)}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getMonthGrid(monthStart: string) {
  const firstDay = new Date(`${monthStart}T00:00:00`);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const gridStart = addDays(monthStart, -startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const dateValue = new Date(`${date}T00:00:00`);

    return {
      date,
      dayNumber: dateValue.getDate(),
      isCurrentMonth: date.slice(0, 7) === monthStart.slice(0, 7),
    };
  });
}

function getMonthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function addDays(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function addMonths(date: string, months: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setMonth(nextDate.getMonth() + months);
  nextDate.setDate(1);
  return nextDate.toISOString().slice(0, 10);
}

function formatMonthTitle(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });
}

function getShiftLabel(shift: ShiftKind) {
  if (shift === "manana") {
    return "Turno mañana";
  }
  if (shift === "tarde") {
    return "Turno tarde";
  }
  if (shift === "noche") {
    return "Turno noche";
  }
  if (shift === "noche_larga") {
    return "Turno noche larga";
  }
  return "Descanso remunerado";
}
