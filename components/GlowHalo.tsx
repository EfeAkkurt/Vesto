"use client";
import { motion } from "framer-motion";

type Props = {
  className?: string;        // parent container relative olmalı
  color?: string;            // varsayılan: #ADD015
  blur?: number;             // px
  intensity?: number;        // 0–1
};

export function GlowHalo({
  className = "",
  color = "#ADD015",
  blur = 28,
  intensity = 1,
}: Props) {
  const base = `pointer-events-none absolute inset-0 rounded-[33px] mix-blend-screen`;
  const bg = (sizePct: number, xPct: number, yPct: number) =>
    `radial-gradient(${sizePct}% ${sizePct}% at ${xPct}% ${yPct}%, ${color} ${Math.min(
      35 * intensity,
      80
    )}%, rgba(255,255,255,0) 100%)`;

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Outer soft halo */}
      <motion.div
        className={`${base}`}
        style={{
          background: bg(10, 75, 0.5),
          filter: `blur(${blur}px)`,
          transform: "scale(0.98)",
        }}
        initial={{ opacity: 0.35, scale: 0.98 }}
        animate={{ opacity: [0.25, 0.4, 0.28], scale: [0.98, 1.02, 0.99] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Mid halo */}
      <motion.div
        className={`${base}`}
        style={{
          background: bg(10, 52, 1),
          filter: `blur(${blur - 6}px)`,
          transform: "scale(0.9)",
        }}
        initial={{ opacity: 0.45, scale: 0.9 }}
        animate={{ opacity: [0.35, 0.55, 0.4], scale: [0.9, 0.94, 0.92] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Inner crisp rim */}
      <motion.div
        className={`${base}`}
        style={{
          background: bg(10, 44, 0),
          filter: `blur(${Math.max(blur - 16, 8)}px)`,
          transform: "scale(0.86)",
        }}
        initial={{ opacity: 0.6, scale: 0.86 }}
        animate={{ opacity: [0.5, 0.75, 0.6], scale: [0.86, 0.89, 0.87] }}
        transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}