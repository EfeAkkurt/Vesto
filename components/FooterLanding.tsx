"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function FooterLanding() {
  return (
    <footer className="relative mt-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.svg
          viewBox="0 0 1123 240"
          className="h-auto w-full select-none text-[#ADD015]"
          aria-labelledby="vesto-footer"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1.4, ease: [0.33, 1, 0.68, 1] }}
          viewport={{ once: true, amount: 0.4 }}
        >
          <title id="vesto-footer">VESTO</title>
          <motion.text
            x="0"
            y="190"
            className="font-[700]"
            style={{ fontFamily: "Inter, ui-sans-serif, system-ui", fontSize: "180px", letterSpacing: "-0.02em" }}
            fill="currentColor"
          >
            VESTO
          </motion.text>
        </motion.svg>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="h-px w-full bg-white/20" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-6 text-sm text-muted-foreground md:flex-row md:items-center">
        <p>© {new Date().getFullYear()} Vesto. All rights reserved.</p>
        <nav className="flex items-center gap-6">
          <Link href="/privacy-policy" className="text-foreground transition-colors hover:text-[#ADD015]">
            Privacy Policy
          </Link>
          <a
            href="https://stellar.org"
            target="_blank"
            rel="noreferrer"
            className="text-foreground transition-colors hover:text-[#ADD015]"
          >
            Built on Stellar
          </a>
        </nav>
      </div>
    </footer>
  );
}
