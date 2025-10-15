"use client"

import type React from "react"
import { motion } from "framer-motion"
import { GlowHalo } from "./GlowHalo"
import Image from "next/image"

export function SectionContainer({
  children,
  className = "",
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...style,
        backgroundImage: `url("/imagefooter.png")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
      className={`box-border w-full h-[540px] flex flex-col justify-center items-center
      shadow-[0_4px_33px_0_rgba(0,0,0,0.05)] max-w-[1719px]
      overflow-visible content-center flex-nowrap gap-[10px] relative
      rounded-[33px] border border-[#1a1822] bg-black ${className}`}
    >
      {/* Black overlay */}
      <div className="absolute inset-0 bg-black/60 rounded-[33px] z-0" />

      {/* Violet glow sağdan/yukarıdan gelsin */}
      <GlowHalo className="z-0" color="#8B5CF6" intensity={0.8} />

      {/* İçerik üstte */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}

export function FinalSection() {
  return (
    <section className="relative min-h-screen bg-black py-32 overflow-hidden flex items-center justify-center">
      <div className="relative mx-auto px-6">
        <SectionContainer>
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">TEST GÖRÜNÜYOR MU?</h1>
            <p className="text-2xl text-gray-300">Arka planda imagefooter.png olmalı</p>
          </div>
        </SectionContainer>
      </div>
    </section>
  )
}