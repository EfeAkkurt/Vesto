"use client"

import type React from "react"

import { motion } from "framer-motion"
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
const Shield = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />
  </svg>
)
const TrendingUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M14 7h7v7" />
  </svg>
)

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

        {/* Subheading */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-12 text-balance leading-relaxed"
        >
          Transform invoices, subscriptions, and income streams into tradeable tokens. Transparent custody, automated
          distributions, and institutional-grade proof-of-reserve.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <Button size="lg" className="gap-2 text-base px-8 py-6">
            Start Tokenizing
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6">
            View Documentation
          </Button>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Proof-of-Reserve"
            description="Weekly attestations with IPFS-backed transparency"
            delay={0.7}
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Automated Yield"
            description="One-click distribution to token holders"
            delay={0.8}
          />
          <FeatureCard
            icon={<Wallet className="w-6 h-6" />}
            title="Multi-Chain Bridge"
            description="Seamless cross-chain asset transfers"
            delay={0.9}
          />
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

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-left hover:border-white/20 transition-colors text-white"
    >
      <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4 text-white">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-white/70 leading-relaxed">{description}</p>
    </motion.div>
  )
}
