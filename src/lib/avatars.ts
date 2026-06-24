export const DICEBEAR_STYLES = [
  { key: "avataaars", label: "Avataaars" },
  { key: "lorelei", label: "Lorelei" },
  { key: "notionists", label: "Notionists" },
  { key: "micah", label: "Micah" },
  { key: "pixel-art", label: "Pixel" },
  { key: "bottts", label: "Bottts" },
  { key: "thumbs", label: "Thumbs" },
  { key: "open-peeps", label: "Open Peeps" },
  { key: "fun-emoji", label: "Fun Emoji" },
  { key: "adventurer", label: "Adventurer" },
  { key: "big-smile", label: "Big Smile" },
  { key: "personas", label: "Personas" },
] as const;

export type DicebearStyle = (typeof DICEBEAR_STYLES)[number]["key"];

export const DEFAULT_DICEBEAR_STYLE: DicebearStyle = "lorelei";

export function dicebearUrl(seed: string, style: DicebearStyle = DEFAULT_DICEBEAR_STYLE): string {
  const s = (seed || "flick").trim() || "flick";
  return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(s)}`;
}

export function isDicebearUrl(value: string | null | undefined): boolean {
  return !!value && /^https?:\/\//.test(value);
}

export function randomSeed(): string {
  const a = Math.random().toString(36).slice(2, 8);
  const b = Math.random().toString(36).slice(2, 6);
  return `${a}${b}`;
}
