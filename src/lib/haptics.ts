/**
 * Helper to trigger PWA haptic feedback using Web Vibrations API
 */
export const haptics = {
  /**
   * Subtle tick for standard button taps, keypresses, or slider adjustments
   */
  light: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch (err) {
        console.debug("Haptics blocked:", err);
      }
    }
  },

  /**
   * Medium tick for successful toggle actions, list filters, or navigation
   */
  medium: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch (err) {
        console.debug("Haptics blocked:", err);
      }
    }
  },

  /**
   * Heavy feedback for primary actions
   */
  heavy: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(70);
      } catch (err) {
        console.debug("Haptics blocked:", err);
      }
    }
  },

  /**
   * Double-pulse feedback for matches, successful wave sent, or completions
   */
  success: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([40, 45, 40]);
      } catch (err) {
        console.debug("Haptics blocked:", err);
      }
    }
  },

  /**
   * Longer vibration for going live/flicking
   */
  flick: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([100, 60, 150]);
      } catch (err) {
        console.debug("Haptics blocked:", err);
      }
    }
  },

  /**
   * Error or failure alert feedback (triple pulse)
   */
  error: () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([50, 50, 50, 50, 100]);
      } catch (err) {
        console.debug("Haptics blocked:", err);
      }
    }
  }
};
