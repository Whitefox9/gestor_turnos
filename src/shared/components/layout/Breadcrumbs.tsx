interface BreadcrumbsProps {
  items: string[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item}-${index}`}>
          {index > 0 ? " / " : ""}
          {item}
        </span>
      ))}
    </div>
  );
}
