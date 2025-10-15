"use client"

import type React from "react"
import { motion } from "framer-motion"

export function GradientCard({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={`box-border flex flex-row justify-center items-center p-10 shadow-[0_4px_34px_0_rgba(0,0,0,0.05)]
      bg-[radial-gradient(95%_95%_at_6%_5%,#191624_0%,#0A090D_100%)] overflow-visible content-center flex-nowrap
      gap-[10px] rounded-[40px] border border-[#1a1822] w-[531px] h-[499px] ${className}`}
    >
      {children}
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section className="relative min-h-[200vh] bg-black py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Title */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-32"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Revolutionary Features
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Experience the future of asset tokenization with our cutting-edge platform built on the Stellar Network
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="space-y-64">
          {/* Card 1 - Left */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-16"
          >
            <div className="text-left max-w-lg">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Seamless Tokenization
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Transform your real-world assets into digital tokens with our streamlined process.
                From real estate to commodities, unlock liquidity like never before.
              </p>
            </div>
            <GradientCard className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-violet-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <p className="text-white font-semibold">Tokenize</p>
              </div>
            </GradientCard>
          </motion.div>

          {/* Card 2 - Right */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-16"
          >
            <GradientCard className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-white font-semibold">Secure Custody</p>
              </div>
            </GradientCard>
            <div className="text-left max-w-lg">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Bank-Grade Security
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Your assets are protected by institutional-grade custody solutions.
                Multi-signature wallets and cold storage ensure maximum security.
              </p>
            </div>
          </motion.div>

          {/* Card 3 - Left */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-16"
          >
            <div className="text-left max-w-lg">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Instant Verification
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Leverage blockchain technology for transparent and immutable proof of ownership.
                Verify transactions instantly without intermediaries.
              </p>
            </div>
            <GradientCard className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-white font-semibold">Proof of Ownership</p>
              </div>
            </GradientCard>
          </motion.div>
        </div>
      </div>
    </section>
  )
}