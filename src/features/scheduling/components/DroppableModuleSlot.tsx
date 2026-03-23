import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/shared/utils/cn";

export function DroppableModuleSlot({
  moduleId,
  isInvalid,
  isSuccessful,
  riskLevel,
  children,
}: {
  moduleId: string;
  isInvalid?: boolean;
  isSuccessful?: boolean;
  riskLevel?: "none" | "low" | "medium" | "high";
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: moduleId,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-[28px] border p-4 transition-all",
        isOver ? "border-primary bg-cyan-50 shadow-soft" : "border-border bg-white/90",
        riskLevel === "low" && "border-cyan-200 bg-cyan-50/40",
        riskLevel === "medium" && "border-amber-200 bg-amber-50/40",
        riskLevel === "high" && "border-rose-200 bg-rose-50/50",
        isInvalid && "border-rose-300 bg-rose-50 shadow-none",
        isSuccessful && "border-emerald-300 bg-emerald-50/80 shadow-sm animate-pulse",
      )}
    >
      {children}
      <div className="pointer-events-none mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
        Zona preparada para asignación
      </div>
    </div>
  );
}
