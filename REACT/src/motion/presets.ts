import type { Transition, Variants } from 'framer-motion';

// Framer callers gate these variants with useReducedMotion; CSS also covers prefers-reduced-motion.
export const motionEase = {
  entrance: [0.22, 1, 0.36, 1],
  exit: [0.4, 0, 1, 1],
} as const;

export const motionSpring = {
  layout: { type: 'spring', stiffness: 300, damping: 30 },
  panel: { type: 'spring', stiffness: 300, damping: 30 },
} as const satisfies Record<string, Transition>;

export const stagger = {
  grid: 0.06,
  list: 0.08,
  editorialText: 0.12,
  groupMax: 0.5,
} as const;

export const spring: Record<'snappy' | 'ui' | 'panel' | 'drawer' | 'modal' | 'gentle', Transition> = {
  snappy: { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 },
  ui: { type: 'spring', stiffness: 380, damping: 30, mass: 1 },
  panel: motionSpring.panel,
  drawer: { type: 'spring', stiffness: 180, damping: 22, mass: 1.2 },
  modal: { type: 'spring', stiffness: 160, damping: 20, mass: 1 },
  gentle: { type: 'spring', stiffness: 120, damping: 18, mass: 1 },
};

export const pageReveal: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0.6, y: -4 },
};

export const heroReveal: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.988 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export const textReveal: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export const scrollReveal: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.994 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
};

export const panelReveal: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.996 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export const cardReveal: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.992 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export const rowReveal: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export const hoverLift: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -3, scale: 1.006 },
  tap: { y: 0, scale: 0.992 },
};

export const modalBlur: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.99 },
};

export function staggerTransition(index: number, step = 0.035, cap = 10, base: Transition = spring.gentle): Transition {
  return { ...base, delay: Math.min(index, cap) * step };
}

export function cappedStagger(index: number, step: number, max = stagger.groupMax): number {
  return Math.min(index * step, max);
}

export const instantTransition: Transition = { duration: 0.001 };
