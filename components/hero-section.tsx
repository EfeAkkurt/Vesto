"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Wallet, Shield, TrendingUp } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Hero-AlWBxwnaNTfCaoOnNUcGhInxyqwgi9.png"
          alt="Hero Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
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
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">V</span>
            </div>
            <span className="text-2xl font-bold text-foreground">Vesto</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden md:flex items-center gap-8"
          >
            <a href="#tokenize" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Tokenize
            </a>
            <a href="#custodian" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Custodian
            </a>
            <a href="#proof" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Proof
            </a>
            <a href="#bridge" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Bridge
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
        >
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm text-primary font-medium">Powered by Stellar Network</span>
          <ArrowRight className="w-3 h-3 text-primary" />
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold text-balance mb-6 leading-tight"
        >
          Tokenize Real-World
          <br />
          <span className="text-primary">Assets On-Chain</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 text-balance leading-relaxed"
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
          <Button
            size="lg"
            className="gap-2 text-base px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Start Tokenizing
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6 bg-transparent">
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
      className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 text-left hover:border-primary/30 transition-colors"
    >
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  )
}