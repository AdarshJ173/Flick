import { cn } from "@/lib/utils";

export function LivePulse({ className, size = 10 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full bg-primary animate-pulse-ring"
        style={{ filter: "blur(0.5px)" }}
      />
      <span
        className="relative rounded-full bg-primary animate-pulse-dot"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
