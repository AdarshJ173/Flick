/**
 * Helper to trigger PWA haptic feedback using Web Vibrations API
 */
export const haptics = {
  /**
   * Subtle tick for standard button taps, keypresses, or slider adjustments
   */
  light: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium tick for successful toggle actions, list filters, or navigation
   */
  medium: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(35);
    }
  },

  /**
   * Heavy feedback for primary actions
   */
  heavy: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(70);
    }
  },

  /**
   * Double-pulse feedback for matches, successful wave sent, or completions
   */
  success: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 45, 40]);
    }
  },

  /**
   * Longer vibration for going live/flicking
   */
  flick: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 60, 150]);
    }
  },

  /**
   * Error or failure alert feedback (triple pulse)
   */
  error: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([50, 50, 50, 50, 100]);
    }
  }
};
