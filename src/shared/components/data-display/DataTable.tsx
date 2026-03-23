import type { ReactNode } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";

interface DataTableProps<T> {
  items: T[];
  renderHeader: ReactNode;
  renderRow: (item: T) => ReactNode;
}

export function DataTable<T>({ items, renderHeader, renderRow }: DataTableProps<T>) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-4 gap-4 border-b px-6 py-4 text-sm font-medium text-muted-foreground">
          {renderHeader}
        </div>
        <div className="divide-y">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 px-6 py-4 text-sm">
              {renderRow(item)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
