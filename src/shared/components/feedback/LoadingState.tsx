import { LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Cargando informacion..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-white/80 p-4 text-sm text-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
