import {
  Coffee,
  Footprints,
  Laptop,
  Utensils,
  GlassWater,
  MessageSquare,
  BookOpen,
  Music,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type Intent = {
  key: string;
  label: string;
  icon: LucideIcon;
  prompt: string;
};

export const INTENTS: Intent[] = [
  {
    key: "coffee",
    label: "Coffee",
    icon: Coffee,
    prompt: "Looking to share a coffee with someone interesting",
  },
  {
    key: "walk",
    label: "A walk",
    icon: Footprints,
    prompt: "Wandering — happy to walk + talk with someone",
  },
  {
    key: "work",
    label: "Co-work",
    icon: Laptop,
    prompt: "Working from a cafe — open to a quiet co-work neighbor",
  },
  {
    key: "food",
    label: "A meal",
    icon: Utensils,
    prompt: "Hungry — would rather not eat alone",
  },
  {
    key: "drink",
    label: "A drink",
    icon: GlassWater,
    prompt: "Up for a drink and a real conversation",
  },
  {
    key: "talk",
    label: "Just talk",
    icon: MessageSquare,
    prompt: "Open to a 20-minute conversation with a stranger",
  },
  {
    key: "read",
    label: "Read together",
    icon: BookOpen,
    prompt: "Reading — open to a parallel reader nearby",
  },
  {
    key: "music",
    label: "Live music",
    icon: Music,
    prompt: "Looking for someone to catch live music with tonight",
  },
];

export function intentByKey(key: string): Intent {
  return INTENTS.find((i) => i.key === key) ?? { key, label: key, icon: Sparkles, prompt: "" };
}

