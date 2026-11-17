/**
 * ERP motion contract.
 *
 * Keep motion subtle and functional. Components should normally use the CSS
 * utilities backed by these token names instead of inventing durations/easing.
 */
export const ERP_MOTION_TOKENS = {
  duration: {
    fast: "--motion-fast",
    normal: "--motion-normal",
    slow: "--motion-slow",
  },
  easing: {
    standard: "--motion-ease-standard",
    enter: "--motion-ease-enter",
    exit: "--motion-ease-exit",
  },
} as const;

export const ERP_MOTION_CLASSES = {
  interactive: "erp-motion-interactive",
  enter: "erp-motion-enter",
  selection: "erp-motion-selection",
} as const;
