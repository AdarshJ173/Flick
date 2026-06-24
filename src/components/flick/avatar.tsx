import { cn } from "@/lib/utils";

const GRADIENTS = {
  "gradient-1": {
    colors: ["#F43F5E", "#F97316"],
  },
  "gradient-2": {
    colors: ["#4F46E5", "#7C3AED"],
  },
  "gradient-3": {
    colors: ["#10B981", "#14B8A6"],
  },
  "gradient-4": {
    colors: ["#06B6D4", "#3B82F6"],
  },
  "gradient-5": {
    colors: ["#EC4899", "#E11D48"],
  },
  "gradient-6": {
    colors: ["#F59E0B", "#EA580C"],
  },
};

export function FlickAvatar({
  emoji,
  name,
  className,
}: {
  emoji: string;
  name: string;
  className?: string;
}) {
  const theme = GRADIENTS[emoji as keyof typeof GRADIENTS] || GRADIENTS["gradient-2"];
  const initial = (name || "S").charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative overflow-hidden flex items-center justify-center select-none shadow-xl border border-white/10",
        className,
      )}
    >
      {/* Background SVG representing glassmorphic abstract shapes */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`grad-${emoji}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.colors[0]} />
            <stop offset="100%" stopColor={theme.colors[1]} />
          </linearGradient>
        </defs>

        {/* Base Gradient Layer */}
        <rect width="100" height="100" fill={`url(#grad-${emoji})`} />

        {/* Abstract Glassmorphic Overlay Shapes */}
        {emoji === "gradient-1" && (
          <>
            <circle cx="30" cy="30" r="28" fill="white" fillOpacity="0.12" />
            <circle cx="75" cy="70" r="35" fill="white" fillOpacity="0.08" />
            <path
              d="M10 80 Q 40 40 80 80"
              stroke="white"
              strokeWidth="2"
              strokeOpacity="0.15"
              fill="none"
            />
          </>
        )}
        {emoji === "gradient-2" && (
          <>
            <rect
              x="15"
              y="15"
              width="50"
              height="50"
              rx="25"
              transform="rotate(45 40 40)"
              fill="white"
              fillOpacity="0.12"
            />
            <circle cx="80" cy="20" r="18" fill="white" fillOpacity="0.08" />
            <path
              d="M-10 50 Q 50 100 110 50"
              stroke="white"
              strokeWidth="1.5"
              strokeOpacity="0.15"
              fill="none"
            />
          </>
        )}
        {emoji === "gradient-3" && (
          <>
            <polygon points="50,15 85,75 15,75" fill="white" fillOpacity="0.1" />
            <circle cx="50" cy="55" r="22" fill="white" fillOpacity="0.08" />
            <line
              x1="10"
              y1="90"
              x2="90"
              y2="10"
              stroke="white"
              strokeWidth="1.5"
              strokeOpacity="0.15"
            />
          </>
        )}
        {emoji === "gradient-4" && (
          <>
            <circle
              cx="50"
              cy="50"
              r="32"
              stroke="white"
              strokeWidth="3"
              strokeOpacity="0.12"
              fill="none"
            />
            <circle cx="50" cy="50" r="20" fill="white" fillOpacity="0.08" />
            <circle cx="20" cy="20" r="12" fill="white" fillOpacity="0.15" />
          </>
        )}
        {emoji === "gradient-5" && (
          <>
            <path
              d="M20,20 C40,40 10,70 50,80 C90,90 60,60 80,20"
              fill="white"
              fillOpacity="0.08"
            />
            <circle
              cx="50"
              cy="35"
              r="24"
              stroke="white"
              strokeWidth="2"
              strokeOpacity="0.12"
              fill="none"
            />
          </>
        )}
        {emoji === "gradient-6" && (
          <>
            <rect
              x="20"
              y="20"
              width="60"
              height="60"
              rx="12"
              stroke="white"
              strokeWidth="2"
              strokeOpacity="0.1"
              fill="none"
            />
            <circle cx="50" cy="50" r="15" fill="white" fillOpacity="0.15" />
            <path d="M0 0 L100 100" stroke="white" strokeWidth="1" strokeOpacity="0.15" />
          </>
        )}
      </svg>

      {/* Glassmorphic border glow reflection */}
      <div className="absolute inset-0.5 rounded-[inherit] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

      {/* Styled letter in front */}
      <span className="relative z-10 font-display text-[0.45em] tracking-tight font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
        {initial}
      </span>
    </div>
  );
}
