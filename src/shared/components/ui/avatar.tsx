interface AvatarProps {
  fallback: string;
  src?: string;
  alt?: string;
}

export function Avatar({ fallback, src, alt }: AvatarProps) {
  return (
    <div className="flex h-10 w-10 overflow-hidden rounded-2xl bg-primary/10 text-sm font-semibold text-primary shadow-sm">
      {src ? (
        <img src={src} alt={alt ?? fallback} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">{fallback}</div>
      )}
    </div>
  );
}
