export default function Skeleton({
  className = "",
  lines = 1,
  variant = "text",
}: {
  className?: string;
  lines?: number;
  variant?: "card" | "text" | "circle";
}) {
  if (variant === "circle") {
    return (
      <div className={`rounded-full bg-genome-border animate-pulse ${className}`} />
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-xl bg-genome-card border border-genome-border animate-pulse ${className}`}
      />
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 rounded bg-genome-border animate-pulse ${
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          }`}
        />
      ))}
    </div>
  );
}
