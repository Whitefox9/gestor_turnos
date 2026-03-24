import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";

export function DroppableAssignmentSlot({
  droppableId,
  slotIndex,
  employeeName,
  score,
  isSuccessful,
  isReleased,
  compact,
  riskLevel,
  riskHint,
  previewCandidateName,
  previewScore,
  previewAdvisoryCodes,
  isSelected,
  onSelect,
  action,
}: {
  droppableId: string;
  slotIndex: number;
  employeeName?: string;
  score?: number;
  isSuccessful?: boolean;
  isReleased?: boolean;
  compact?: boolean;
  riskLevel?: "none" | "low" | "medium" | "high";
  riskHint?: string;
  previewCandidateName?: string;
  previewScore?: number;
  previewAdvisoryCodes?: string[];
  isSelected?: boolean;
  onSelect?: (targetId: string) => void;
  action?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSelect?.(droppableId)}
      className={cn(
        "cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/90 transition-all",
        compact ? "px-3 py-2.5" : "px-4 py-3",
        riskLevel === "low" && "border-cyan-200 bg-cyan-50/60",
        riskLevel === "medium" && "border-amber-200 bg-amber-50/70",
        riskLevel === "high" && "border-rose-200 bg-rose-50/70",
        isOver && "border-primary bg-cyan-50 shadow-sm",
        isSelected && "ring-2 ring-primary/20 border-primary bg-cyan-50/80",
        isSuccessful && "border-emerald-300 bg-emerald-50 animate-pulse shadow-sm",
        isReleased && "border-sky-300 bg-sky-50 shadow-sm ring-1 ring-sky-200",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Slot {slotIndex + 1}</p>
          <p className={cn("mt-1 font-medium text-slate-800", compact ? "text-[13px] leading-snug" : "text-sm")}>
            {employeeName ?? (compact ? "Disponible para asignar" : "Disponible para asignación")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {riskLevel && riskLevel !== "none" ? (
            <Badge variant={riskLevel === "high" ? "danger" : riskLevel === "medium" ? "warning" : "info"}>
              {riskLevel === "high" ? "Riesgo alto" : riskLevel === "medium" ? "Riesgo medio" : "Riesgo bajo"}
            </Badge>
          ) : null}
          {typeof score === "number" ? <Badge variant="info">Fit {score}</Badge> : null}
          {isReleased && !employeeName ? <Badge variant="info">Liberado</Badge> : null}
          <Badge variant={employeeName ? "success" : "secondary"}>{employeeName ? "Ocupado" : "Libre"}</Badge>
        </div>
      </div>
      {riskHint ? <p className="mt-2 text-xs text-slate-500">{riskHint}</p> : null}
      {previewCandidateName ? (
        <div className="mt-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-slate-600">
          <p className="font-medium text-slate-800">Preview: {previewCandidateName}</p>
          <p className="mt-1">
            Fit {previewScore ?? "--"}
            {previewAdvisoryCodes?.length ? ` · ${previewAdvisoryCodes.length} reglas blandas activas` : " · sin advertencias blandas"}
          </p>
        </div>
      ) : null}
      {action ? <div className="mt-3 border-t border-slate-200 pt-3">{action}</div> : null}
    </div>
  );
}
