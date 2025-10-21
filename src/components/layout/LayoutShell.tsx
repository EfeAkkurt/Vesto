"use client";

import { useState, type FC } from "react";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { Topbar } from "@/src/components/layout/Topbar";
import type { WalletHook } from "@/src/hooks/useWallet";
import type { NetworkHealth } from "@/src/hooks/useNetworkHealth";
import { cn } from "@/src/utils/cn";

export type LayoutShellProps = {
  children: React.ReactNode;
  wallet: WalletHook;
  networkHealth: NetworkHealth;
};

export const LayoutShell: FC<LayoutShellProps> = ({ children, wallet, networkHealth }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setMobileNavOpen((prev) => !prev);
  const closeSidebar = () => setMobileNavOpen(false);
  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => !prev);
    setMobileNavOpen(false);
  };

  return (
    <div className="relative min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only absolute left-4 top-4 z-50 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only"
      >
        Skip to content
      </a>
      <Sidebar
        wallet={wallet}
        networkHealth={networkHealth}
        collapsed={sidebarCollapsed}
        isOpen={mobileNavOpen}
        onCloseMobile={closeSidebar}
      />
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200 ease-out",
          sidebarCollapsed ? "md:pl-0" : "md:pl-72",
          mobileNavOpen ? "pl-40" : "pl-0",
        )}
      >
        <Topbar
          networkHealth={networkHealth}
          onToggleSidebar={toggleSidebar}
          onToggleCollapse={toggleSidebarCollapse}
          isSidebarCollapsed={sidebarCollapsed}
        />
        <main id="main-content" className="relative z-10 w-full p-5 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1360px]">{children}</div>
        </main>
      </div>
      {mobileNavOpen ? (
        <button
          type="button"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
        />
      ) : null}
    </div>
  );
};
