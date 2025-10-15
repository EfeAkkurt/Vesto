"use client"

import type React from "react"

import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"

// Inline icons to avoid external deps
const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
)
const Wallet = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a3 3 0 0 0-3-3H4v5" />
    <path d="M18 12h2" />
  </svg>
)

function HeroParallaxCard() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [-48, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.911893, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [12.335, 0]);

  return (
    <div className="relative mx-auto max-w-3xl p-4 [perspective:1200px]">
      <motion.div
        style={{ y, scale, rotateX, willChange: "transform" }}
        className="rounded-[33px] overflow-hidden [transform-style:preserve-3d] border border-white/20 bg-white/10 backdrop-blur-md"
      >
          <div className="relative aspect-[16/10] flex items-center justify-center">
          <div className="text-white/40 text-center">
            <div className="w-24 h-24 mx-auto mb-4 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
              <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm">Image placeholder</p>
            <p className="text-xs mt-1">Resim daha sonra eklenecek</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-background.png"
          alt="Hero Background"
          fill
          className="object-cover scale-x-[1.8] scale-y-[1.8] [transform-origin:center]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black" />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute top-0 left-0 right-0 z-20 px-6 py-6"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">V</span>
            </div>
            <span className="text-2xl font-bold text-white">Vesto</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden md:flex items-center gap-8"
          >
            <a href="#tokenize" className="text-sm text-white/80 hover:text-white transition-colors">
              Tokenize
            </a>
            <a href="#custodian" className="text-sm text-white/80 hover:text-white transition-colors">
              Custodian
            </a>
            <a href="#proof" className="text-sm text-white/80 hover:text-white transition-colors">
              Proof
            </a>
            <a href="#bridge" className="text-sm text-white/80 hover:text-white transition-colors">
              Bridge
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Button variant="outline" size="sm" className="gap-2">
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </Button>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        {/* Announcement Badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white mb-8"
        >
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">Powered by Stellar Network</span>
          <ArrowRight className="w-3 h-3" />
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold text-white text-balance mb-6 leading-tight"
        >
          Tokenize Real-World
          <br />
          <span className="text-violet-400">Assets On-Chain</span>
        </motion.h1>

        {/* Hero Parallax Card Placeholder */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <HeroParallaxCard />
        </motion.div>



      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="w-6 h-10 border-2 border-primary/30 rounded-full flex items-start justify-center p-2"
        >
          <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  )
}

