"use client"

import type React from "react"
import { motion } from "framer-motion"

export function GradientRowLarge({
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
      className={`box-border w-full h-min min-h-[455px] flex flex-row justify-start items-center p-16
      bg-[radial-gradient(95%_95%_at_6%_5%,#191624_0%,#0A090D_100%)] overflow-visible
      content-center flex-nowrap gap-0 relative rounded-[45px] border border-[#1a1822] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatsSection() {
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
            Platform Statistics
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Real-time metrics showing our growth and adoption
          </p>
        </motion.div>

        {/* Horizontal Scroll Container */}
        <div className="overflow-x-auto overflow-y-hidden pb-8 scrollbar-hide">
          <div className="flex gap-8 w-max px-8">
            {/* Card 1 - TVL & Transactions */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              className="w-[1000px] min-w-[1000px] relative"
            >
              <GradientRowLarge>
                <div className="w-full h-full flex flex-col justify-between">
                  <div className="space-y-12">
                    {/* TVL Stat */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">Total Value Locked</h3>
                          <p className="text-gray-400">Assets secured on platform</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-bold text-white">$125M+</p>
                        <p className="text-green-400 text-lg">+23.5% this month</p>
                      </div>
                    </div>

                    {/* Transactions Stat */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">Transactions Processed</h3>
                          <p className="text-gray-400">Total transaction volume</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-bold text-white">2.4M+</p>
                        <p className="text-blue-400 text-lg">+45% YoY growth</p>
                      </div>
                    </div>
                  </div>
                </div>
              </GradientRowLarge>
            </motion.div>

            {/* Card 2 - Users & Growth */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="w-[1000px] min-w-[1000px] relative"
            >
              <GradientRowLarge>
                <div className="w-full h-full flex flex-col justify-between">
                  <div className="space-y-12">
                    {/* Active Users Stat */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">Active Users</h3>
                          <p className="text-gray-400">Monthly active participants</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-bold text-white">180K+</p>
                        <p className="text-purple-400 text-lg">+12% weekly</p>
                      </div>
                    </div>

                    {/* Growth Rate */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">Growth Rate</h3>
                          <p className="text-gray-400">Monthly platform growth</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-bold text-white">34%</p>
                        <p className="text-cyan-400 text-lg">Consistent growth</p>
                      </div>
                    </div>
                  </div>
                </div>
              </GradientRowLarge>
            </motion.div>

            {/* Card 3 - Assets & Security */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="w-[1000px] min-w-[1000px] relative"
            >
              <GradientRowLarge>
                <div className="w-full h-full flex flex-col justify-between">
                  <div className="space-y-12">
                    {/* Tokenized Assets */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">Tokenized Assets</h3>
                          <p className="text-gray-400">Unique asset types</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-bold text-white">5000+</p>
                        <p className="text-yellow-400 text-lg">+200 new this month</p>
                      </div>
                    </div>

                    {/* Security Score */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">Security Score</h3>
                          <p className="text-gray-400">Platform security rating</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-bold text-white">A+</p>
                        <p className="text-red-400 text-lg">Enterprise grade</p>
                      </div>
                    </div>
                  </div>
                </div>
              </GradientRowLarge>
            </motion.div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-32"
        >
          <h3 className="text-2xl font-semibold text-white mb-4">
            Join thousands of users already tokenizing their assets
          </h3>
          <button className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105">
            Start Tokenizing Today
          </button>
        </motion.div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}