"use client";

import { useAnimationControls, motion } from "framer-motion";
import { useCallback, useEffect } from "react";

export type VestoLogoProps = {
  className?: string;
  size?: number;
};

const ease = [0.33, 1, 0.68, 1] as const;

export function VestoLogo({ className, size = 40 }: VestoLogoProps) {
  const controls = useAnimationControls();
  const reset = useCallback(() => {
    void controls.start({ rotate: 0, transition: { duration: 0.001 } });
  }, [controls]);

  useEffect(() => {
    reset();
  }, [reset]);

  const spin = useCallback(
    async (rotations: number, duration: number) => {
      await controls.start({ rotate: 360 * rotations, transition: { duration, ease } });
      reset();
    },
    [controls, reset],
  );

  const handleHover = useCallback(() => {
    void spin(1, 0.8);
  }, [spin]);

  const handleClick = useCallback(() => {
    void spin(5, 1.2);
  }, [spin]);

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      animate={controls}
      onHoverStart={handleHover}
      onTap={handleClick}
      onHoverEnd={reset}
      tabIndex={-1}
      aria-hidden
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="vestoGrad" x1="20" y1="10" x2="180" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B5BD6" />
          <stop offset="55%" stopColor="#7E88E6" />
          <stop offset="100%" stopColor="#ADD015" />
        </linearGradient>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <path
          id="roundedTri"
          d="M100 24C95 24 92 26 90 31L55 110C53 115 53 118 55 123C57 128 60 130 65 132H145C150 132 153 130 155 125C157 120 156 116 154 112L119 33C117 28 114 24 108 24C104 24 102 24 100 24Z"
        />
      </defs>
      <use
        xlinkHref="#roundedTri"
        transform="rotate(-6 100 100) scale(1 1) translate(0 0)"
        stroke="url(#vestoGrad)"
        strokeWidth="10"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        filter="url(#softGlow)"
      />
      <use
        xlinkHref="#roundedTri"
        transform="rotate(0 100 100) scale(0.986 0.986) translate(1 1)"
        stroke="url(#vestoGrad)"
        strokeWidth="10"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <use
        xlinkHref="#roundedTri"
        transform="rotate(7 100 100) scale(0.972 0.972) translate(2 2)"
        stroke="url(#vestoGrad)"
        strokeWidth="10"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
    </motion.svg>
  );
}

export default VestoLogo;
