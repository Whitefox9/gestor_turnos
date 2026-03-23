export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function formatRelativeDay(dateString: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}
