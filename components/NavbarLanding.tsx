"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import NetworkStatus from "@/components/NetworkStatus";
import VestoLogo from "@/components/VestoLogo";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Proofs", href: "/proofs" },
  { label: "Bridge", href: "/bridge" },
  { label: "Custodian", href: "/custodian" },
  { label: "Tokenize", href: "/tokenize" },
] as const;

function Logo() {
  return (
    <Link href="#hero" className="inline-flex items-center gap-3">
      <VestoLogo size={44} />
      <span className="text-lg font-semibold tracking-tight text-white">Vesto</span>
    </Link>
  );
}

export default function NavbarLanding() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onRoute = () => setOpen(false);
    window.addEventListener("hashchange", onRoute);
    return () => window.removeEventListener("hashchange", onRoute);
  }, []);

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="mt-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div
        className="relative flex items-center justify-between gap-6 rounded-[40px] border border-[rgb(36,36,36)] bg-black/70 px-4 py-3 sm:px-6 backdrop-blur-md supports-[backdrop-filter]:bg-black/60"
      >
        <Logo />

        <nav className="hidden items-center gap-0 rounded-[14px] bg-black/60 px-3 py-2 relative md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="group relative rounded-[12px] px-3.5 py-2.5 text-sm font-medium text-zinc-200 transition-all duration-300 ease-out hover:text-white overflow-hidden"
            >
              <span className="relative z-10">{label}</span>
              <div className="absolute inset-0 bg-[#ADD015] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform scale-x-0 group-hover:scale-x-100 origin-left rounded-[12px]" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <NetworkStatus />
            <ConnectWalletButton />
          </div>
          <button
            aria-label="Open menu"
            onClick={() => setOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-[58px] border border-[rgb(36,36,36)] md:hidden"
          >
            <span className="relative block h-3 w-5">
              <span
                className={`absolute inset-x-0 top-0 h-[2px] bg-white transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`}
              />
              <span
                className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white transition-opacity ${open ? "opacity-0" : "opacity-100"}`}
              />
              <span
                className={`absolute inset-x-0 bottom-0 h-[2px] bg-white transition-transform ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>

        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute left-0 right-0 top-full mx-2 mt-2 overflow-hidden rounded-[40px] border border-[rgb(36,36,36)] bg-black/80 backdrop-blur-md"
          >
            <ul className="divide-y divide-white/10">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block px-5 py-4 text-zinc-200 transition-colors hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li className="flex flex-col gap-3 border-t border-white/10 px-5 py-4">
                <NetworkStatus />
                <ConnectWalletButton />
              </li>
            </ul>
          </motion.nav>
        )}
      </div>
    </motion.header>
  );
}
