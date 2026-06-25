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
  templates: string[];
};

export const INTENTS: Intent[] = [
  {
    key: "work",
    label: "Co-work",
    icon: Laptop,
    prompt: "Working from a cafe — open to a quiet co-work neighbor",
    templates: [
      "Working on my startup alone — want a co-working companion for 2 hours.",
      "Quiet co-working at a local cafe. Let's block out some time together.",
      "Writing session. Looking for someone doing focused deep work.",
      "Designing UI/UX. Happy to exchange brief feedback over a desk."
    ]
  },
  {
    key: "study",
    label: "Study",
    icon: BookOpen,
    prompt: "Studying — open to a study buddy nearby",
    templates: [
      "Revising for GATE Paper 1, looking for a quiet co-study companion.",
      "Preparing for exams. Focused study block, open to a silent desk partner.",
      "Reading textbooks / papers. Open to a parallel reader nearby.",
      "Coding interview prep. Let's do a quiet study session together."
    ]
  },
  {
    key: "coffee",
    label: "Coffee",
    icon: Coffee,
    prompt: "Looking to share a coffee with someone interesting",
    templates: [
      "Taking a 20-min coffee break. Open to a quick chat about tech/design.",
      "Grabbing a filter coffee nearby. Let's chat about books or startups.",
      "Midday coffee run. Happy to share a quick conversation to clear the mind."
    ]
  },
  {
    key: "walk",
    label: "A walk",
    icon: Footprints,
    prompt: "Wandering — happy to walk + talk with someone",
    templates: [
      "Post-work walk nearby. Happy to walk + talk and get some fresh air.",
      "Exploring Hauz Khas / local parks. Let's stretch our legs and converse.",
      "Walking to clear head. Open to a wandering companion."
    ]
  },
  {
    key: "food",
    label: "A meal",
    icon: Utensils,
    prompt: "Hungry — would rather not eat alone",
    templates: [
      "Grabbing lunch nearby. Let's talk about product design or history.",
      "Dinner time. Happy to sit down for a meal and share local startup stories.",
      "Trying a new food spot nearby. Up for sharing a table?"
    ]
  },
  {
    key: "drink",
    label: "A drink",
    icon: GlassWater,
    prompt: "Up for a drink and a real conversation",
    templates: [
      "Post-work craft beer. Let's talk about philosophy or urban design.",
      "Unwinding with a drink. Looking for good conversation, no superficial chat.",
      "Grabbing a soda/mocktail nearby. Up for sharing some creative ideas."
    ]
  },
  {
    key: "music",
    label: "Live music",
    icon: Music,
    prompt: "Looking for someone to catch live music with tonight",
    templates: [
      "Catching some live music nearby tonight. Want to share the experience?",
      "Checking out a local acoustic set. Looking for a fellow music enthusiast.",
      "Gig nearby. Up for standing in the crowd and discussing the set after?"
    ]
  }
];

export function intentByKey(key: string): Intent {
  return INTENTS.find((i) => i.key === key) ?? { key, label: key, icon: Sparkles, prompt: "" };
}

export function getContextualTemplates(intentKey: string): string[] {
  const date = new Date();
  const month = date.getMonth(); // 0 = Jan, 11 = Dec
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = date.getHours();

  // 1. Seasonal context
  const isExamSeason = month >= 0 && month <= 3; // Jan to April (GATE, finals)
  const isMonsoon = month >= 5 && month <= 8; // June to Sept
  const isFestiveSeason = month >= 9 && month <= 11; // Oct to Dec

  // 2. Weekly/Daily context
  const isWeekend = day === 0 || day === 6;
  const isWorkHours = !isWeekend && hour >= 9 && hour < 18;
  const isEvening = hour >= 18 || hour < 4;

  const templates: string[] = [];

  if (intentKey === "study") {
    if (isExamSeason) {
      templates.push("Revising for GATE 2027 Paper 1, looking for a quiet co-study companion.");
      templates.push("Finals prep block. Parallel studying at a local library/desk.");
    }
    if (isWeekend) {
      templates.push("Weekend study marathon. Focused block, open to a silent desk partner.");
    } else {
      templates.push("Weekday study session. Coding interview prep or textbook reading.");
    }
  } else if (intentKey === "work") {
    if (isWorkHours) {
      templates.push("Working on my startup alone — want a co-working companion for 2 hours.");
      templates.push("Designing UI/UX. Happy to exchange brief feedback over a desk.");
    } else if (isWeekend) {
      templates.push("Weekend side-project sprint. Working from a cafe — join for quiet focus.");
    }
  } else if (intentKey === "coffee") {
    if (isWorkHours) {
      templates.push("Taking a 20-min coffee break. Open to a quick chat about tech/design.");
    }
    if (isMonsoon) {
      templates.push("Monsoon season special: grabbing filter coffee nearby. Let's chat books/startups.");
    }
  } else if (intentKey === "walk") {
    if (isEvening) {
      templates.push("Post-work walk nearby. Happy to walk + talk and get some fresh air.");
    }
    templates.push("Exploring Hauz Khas / local parks. Let's stretch our legs and converse.");
  } else if (intentKey === "food") {
    if (hour >= 11 && hour < 15) {
      templates.push("Grabbing lunch nearby. Let's talk about product design or history.");
    } else if (hour >= 19 || hour < 22) {
      templates.push("Dinner time. Happy to sit down for a meal and share local startup stories.");
    }
  } else if (intentKey === "drink") {
    if (isWeekend) {
      templates.push("Weekend unwinding. Looking for good conversation, no superficial chat.");
    }
  }

  // Get base templates
  const base = INTENTS.find(i => i.key === intentKey)?.templates || [];
  
  // Mix dynamic context-aware templates at the front, followed by unique base templates
  const combined = Array.from(new Set([...templates, ...base]));
  
  return combined;
}

export function trackUserPattern(intentKey: string, noteText: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("flick_intent_history");
    const history = raw ? JSON.parse(raw) : [];
    history.unshift({
      key: intentKey,
      note: noteText,
      timestamp: new Date().toISOString()
    });
    // Keep last 10 entries
    localStorage.setItem("flick_intent_history", JSON.stringify(history.slice(0, 10)));
  } catch (e) {
    console.warn("Could not save intent history", e);
  }
}
