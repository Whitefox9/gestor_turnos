import { Card, CardContent } from "@/shared/components/ui/card";

export function ShiftHistoryStrip() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 overflow-x-auto p-4 text-sm text-muted-foreground">
        <span className="rounded-full bg-slate-100 px-3 py-1">Sab 21: 94%</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Dom 22: 89%</span>
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-800">Lun 23: 91%</span>
      </CardContent>
    </Card>
  );
}
