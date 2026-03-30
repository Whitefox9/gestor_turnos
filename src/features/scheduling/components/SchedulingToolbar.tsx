import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import type { ShiftKind } from "@/shared/types/scheduling.types";

const weekDayLabels = ["L", "M", "M", "J", "V", "S", "D"];

export function SchedulingToolbar({
  currentPlanningDate,
  currentPlanningShift,
  activeDependencyName,
  weekDays,
  weekDayStatuses,
  planningRangeStart,
  planningRangeEnd,
  onSelectDate,
  onSelectShift,
  onSelectRange,
}: {
  currentPlanningDate: string;
  currentPlanningShift: ShiftKind;
  activeDependencyName: string;
  weekDays: Array<{ date: string; label: string }>;
  weekDayStatuses: Array<{ date: string; isComplete: boolean; hasAnyAssignments: boolean }>;
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
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <ContextSummaryCard label="Semana activa" value={`${formatShortDate(weekDays[0]?.date ?? currentPlanningDate)} - ${formatShortDate(weekDays[6]?.date ?? currentPlanningDate)}`} />
        <ContextSummaryCard label="Día seleccionado" value={formatDate(currentPlanningDate)} />
        <ContextSummaryCard label="Jornada activa" value={getShiftLabel(currentPlanningShift)} tone="info" />
        <ContextSummaryCard label="Dependencia activa" value={activeDependencyName} tone="success" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{formatMonthTitle(monthStart)}</p>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona el día operativo dentro de la semana activa. La jornada se gestiona desde la dependencia activa en el board.
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

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
          <div className="flex items-center gap-2 text-slate-800">
            <CalendarDays className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Semana activa</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatShortDate(weekDays[0]?.date ?? planningRangeStart)} → {formatShortDate(weekDays[6]?.date ?? planningRangeEnd)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {weekDays.map((day) => {
              const dayStatus = weekDayStatuses.find((item) => item.date === day.date);
              const isSelected = currentPlanningDate === day.date;

              return (
                <Button
                  key={day.date}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "rounded-xl",
                    dayStatus?.isComplete && !isSelected && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                    dayStatus?.hasAnyAssignments && !dayStatus?.isComplete && !isSelected && "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
                  )}
                  onClick={() => {
                    onSelectRange(weekDays[0]?.date ?? day.date, weekDays[6]?.date ?? day.date);
                    onSelectDate(day.date);
                  }}
                >
                  {day.label}
                  {dayStatus?.isComplete ? " · OK" : dayStatus?.hasAnyAssignments ? " · En curso" : ""}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextSummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "info" | "success";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{value}</p>
        {tone === "info" ? <Badge variant="info">Activa</Badge> : null}
        {tone === "success" ? <Badge variant="success">Foco</Badge> : null}
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
