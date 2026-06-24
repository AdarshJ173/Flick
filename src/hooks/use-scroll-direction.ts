import { useEffect, useState } from "react";

type Direction = "up" | "down" | null;

const THRESHOLD = 8;

export function useScrollDirection(): Direction {
  const [direction, setDirection] = useState<Direction>(null);
  const [lastY, setLastY] = useState(0);
  const [accum, setAccum] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let ticking = false;
    let prevY = window.scrollY;
    let prevAccum = 0;

    const update = () => {
      const y = window.scrollY;
      const delta = y - prevY;
      prevY = y;
      const next = prevAccum + delta;
      if (Math.abs(next) >= THRESHOLD) {
        setDirection(next > 0 ? "down" : "up");
        prevAccum = 0;
        setAccum(0);
      } else {
        prevAccum = next;
        setAccum(next);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return direction;
}

export function useScrollY(): number {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setY(window.scrollY);
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    setY(window.scrollY);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}

export { useScrollY as _useScrollY };
