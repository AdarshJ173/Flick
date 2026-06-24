import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PREMIUM_GRADIENTS: Record<string, string> = {
  "gradient-1": "from-rose-500 to-orange-500",
  "gradient-2": "from-indigo-600 to-violet-600",
  "gradient-3": "from-emerald-500 to-teal-500",
  "gradient-4": "from-cyan-500 to-blue-500",
  "gradient-5": "from-pink-500 to-rose-600",
  "gradient-6": "from-amber-500 to-orange-600",
};

export function getAvatarStyle(avatarKey: string) {
  const gradient = PREMIUM_GRADIENTS[avatarKey] || PREMIUM_GRADIENTS["gradient-2"];
  return `bg-gradient-to-tr ${gradient} text-white font-semibold flex items-center justify-center shadow-md`;
}
