"use client"

import type React from "react"
import { motion } from "framer-motion"

export function GradientPanel({
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
      style={style}
      className={`box-border flex flex-col justify-center items-center p-8 shadow-[0_4px_33px_0_rgba(0,0,0,0.05)]
      bg-[radial-gradient(95%_95%_at_6%_5%,#191624_0%,#0A090D_100%)] overflow-visible content-center flex-nowrap
      gap-[35px] absolute rounded-[33px] border border-[#1a1822] w-[393px] h-min ${className}`}
    >
      {children}
    </div>
  );
}

export function ServicesSection() {
  return (
    <section className="relative min-h-screen bg-black py-32 overflow-hidden">
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
            Our Services
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Comprehensive solutions for your digital asset journey
          </p>
        </motion.div>

        {/* Three Panels Container */}
        <div className="relative h-[600px] flex items-center justify-center">
          {/* Panel 1 */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
            className="absolute left-0"
          >
            <GradientPanel>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Fast Transactions</h3>
                <p className="text-gray-400 leading-relaxed">
                  Lightning-fast settlement times with Stellar network&#39;s optimized infrastructure
                </p>
              </div>
            </GradientPanel>
          </motion.div>

          {/* Panel 2 */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="absolute"
          >
            <GradientPanel>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Secure Storage</h3>
                <p className="text-gray-400 leading-relaxed">
                  Enterprise-grade security with multi-layer protection for your digital assets
                </p>
              </div>
            </GradientPanel>
          </motion.div>

          {/* Panel 3 */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="absolute right-0"
          >
            <GradientPanel>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Analytics</h3>
                <p className="text-gray-400 leading-relaxed">
                  Real-time insights and detailed analytics for informed decision making
                </p>
              </div>
            </GradientPanel>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-32"
        >
          <button className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors duration-300">
            Get Started Today
          </button>
        </motion.div>
      </div>
    </section>
  )
}
