import type { Variants, Transition } from "framer-motion";

export const transitions = {
  fast: { duration: 0.15, ease: [0.33, 1, 0.68, 1] } satisfies Transition,
  base: { duration: 0.25, ease: [0.33, 1, 0.68, 1] } satisfies Transition,
  slow: { duration: 0.4, ease: [0.33, 1, 0.68, 1] } satisfies Transition,
  springHover: { type: "spring", stiffness: 400, damping: 30 },
} as const;

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

export const stagger = (staggerChildren = 0.06, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};

export const withReducedMotion = (prefersReducedMotion: boolean, variants: Variants): Variants => {
  if (!prefersReducedMotion) return variants;
  return Object.keys(variants).reduce<Variants>((acc, key) => {
    acc[key] = { opacity: 1, y: 0, scale: 1 };
    return acc;
  }, {} as Variants);
};
