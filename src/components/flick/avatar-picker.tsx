import { useEffect, useState } from "react";
import { Shuffle, RefreshCw } from "lucide-react";
import {
  DICEBEAR_STYLES,
  DEFAULT_DICEBEAR_STYLE,
  dicebearUrl,
  randomSeed,
  type DicebearStyle,
} from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function AvatarPicker({
  initialUrl,
  initialSeed,
  initialStyle,
  name,
  onChange,
}: {
  initialUrl?: string | null;
  initialSeed?: string | null;
  initialStyle?: DicebearStyle | null;
  name?: string;
  onChange: (url: string, seed: string, style: DicebearStyle) => void;
}) {
  const [style, setStyle] = useState<DicebearStyle>(initialStyle || DEFAULT_DICEBEAR_STYLE);
  const [seed, setSeed] = useState<string>(
    initialSeed ||
      (initialUrl ? extractSeed(initialUrl) : "") ||
      name?.toLowerCase().replace(/\s+/g, "-") ||
      randomSeed(),
  );
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!seed) setSeed(randomSeed());
  }, [seed]);

  const url = dicebearUrl(seed, style);

  useEffect(() => {
    onChange(url, seed, style);
  }, [url, seed, style, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div
            className="h-28 w-28 overflow-hidden rounded-3xl border border-white/10 bg-surface-2 shadow-xl ring-2 ring-primary/30"
            key={`${style}:${seed}:${version}`}
          >
            <img
              src={url}
              alt="Your avatar"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSeed(randomSeed())}
          className="no-tap flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground active:scale-95"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Shuffle
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DICEBEAR_STYLES.map((s) => {
          const previewUrl = dicebearUrl(seed, s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStyle(s.key)}
              className={cn(
                "no-tap relative overflow-hidden rounded-2xl border bg-surface-2 p-1.5 transition active:scale-95",
                style === s.key ? "border-primary ring-2 ring-primary/40" : "border-border",
              )}
              aria-label={`Use ${s.label} style`}
            >
              <div className="overflow-hidden rounded-xl bg-surface">
                <img
                  src={previewUrl}
                  alt={s.label}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
              </div>
              <div
                className={cn(
                  "mt-1 truncate text-center text-[10px] font-medium uppercase tracking-wide",
                  style === s.key ? "text-primary" : "text-muted-foreground",
                )}
              >
                {s.label}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={seed}
          onChange={(e) => setSeed(e.target.value || randomSeed())}
          placeholder="Seed"
          maxLength={32}
          className="h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVersion((v) => v + 1)}
          className="no-tap flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground active:scale-95"
          aria-label="Reload avatar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function extractSeed(url: string): string {
  try {
    const u = new URL(url);
    return u.searchParams.get("seed") || "";
  } catch {
    return "";
  }
}
