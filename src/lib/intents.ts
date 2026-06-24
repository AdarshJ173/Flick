export type Intent = {
  key: string;
  label: string;
  emoji: string;
  prompt: string;
};

export const INTENTS: Intent[] = [
  { key: "coffee",  label: "Coffee",       emoji: "☕", prompt: "Looking to share a coffee with someone interesting" },
  { key: "walk",    label: "A walk",       emoji: "🚶", prompt: "Wandering — happy to walk + talk with someone" },
  { key: "work",    label: "Co-work",      emoji: "💻", prompt: "Working from a cafe — open to a quiet co-work neighbor" },
  { key: "food",    label: "A meal",       emoji: "🍜", prompt: "Hungry — would rather not eat alone" },
  { key: "drink",   label: "A drink",      emoji: "🍻", prompt: "Up for a drink and a real conversation" },
  { key: "talk",    label: "Just talk",    emoji: "💬", prompt: "Open to a 20-minute conversation with a stranger" },
  { key: "read",    label: "Read together",emoji: "📖", prompt: "Reading — open to a parallel reader nearby" },
  { key: "music",   label: "Live music",   emoji: "🎶", prompt: "Looking for someone to catch live music with tonight" },
];

export function intentByKey(key: string): Intent {
  return INTENTS.find((i) => i.key === key) ?? { key, label: key, emoji: "✨", prompt: "" };
}
