"use client";

import { motion, useReducedMotion } from "framer-motion";

const ease = [0.33, 1, 0.68, 1] as const;

type AnimatedTitleProps = {
  rightWord?: "Features" | "Delivers";
  leftColor?: "lime" | "purple";
  subtitle?: string;
};

const LEFT_COLOR_MAP = {
  lime: "text-[#ADD015]",
  purple: "text-[#7E88E6]",
} as const;

export default function AnimatedTitle({
  rightWord = "Features",
  leftColor = "purple",
  subtitle,
}: AnimatedTitleProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.08,
          },
        },
      } as const;

  const leftVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: { x: -40, opacity: 0 },
        show: { x: 0, opacity: 1, transition: { duration: 0.6, ease } },
      } as const;

  const rightVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: { x: 40, opacity: 0 },
        show: { x: 0, opacity: 1, transition: { duration: 0.6, ease } },
      } as const;

  const leftClass = LEFT_COLOR_MAP[leftColor] ?? LEFT_COLOR_MAP.purple;

  return (
    <section className="mx-auto my-12 max-w-6xl px-4 text-center md:my-16">
      <motion.h1
        className="text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl"
        initial={prefersReducedMotion ? { opacity: 0 } : "hidden"}
        animate={prefersReducedMotion ? { opacity: 1 } : "show"}
        variants={containerVariants}
      >
        <motion.span className={leftClass} variants={leftVariants}>
          VESTO
        </motion.span>
        <motion.span className="ml-3 text-white" variants={rightVariants}>
          {rightWord}
        </motion.span>
      </motion.h1>
      {subtitle ? (
        <motion.p
          className="mt-4 text-base text-muted-foreground md:text-lg"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {subtitle}
        </motion.p>
      ) : null}
    </section>
  );
}
