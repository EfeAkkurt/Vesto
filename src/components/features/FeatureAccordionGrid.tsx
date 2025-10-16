"use client";

import { useState, type ComponentType, type ReactElement, type SVGProps } from "react";
import FeaturePill from "@/src/components/features/FeaturePill";
import { features } from "@/src/lib/featuresData";

type IconComponent = ComponentType<{ className?: string }>;

const svgFactory = (render: (props: SVGProps<SVGSVGElement>) => ReactElement): IconComponent => {
  return ({ className, ...rest }) => {
    const mergedClass = ["h-5 w-5", className].filter(Boolean).join(" ");
    return render({ ...rest, className: mergedClass });
  };
};

const ICONS: Record<string, IconComponent> = {
  Layers: svgFactory((props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M12 3L3 8L12 13L21 8L12 3Z" />
      <path d="M3 12L12 17L21 12" />
      <path d="M3 16L12 21L21 16" />
    </svg>
  )),
  ShieldCheck: svgFactory((props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M12 3L4 6V11C4 16.52 7.58 21.35 12 22C16.42 21.35 20 16.52 20 11V6L12 3Z" />
      <path d="M9 12L11 14L15 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )),
  Users: svgFactory((props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <circle cx="9" cy="7" r="4" />
      <path d="M17 11C19.2091 11 21 9.20914 21 7C21 4.79086 19.2091 3 17 3" />
      <path d="M4 21V19C4 16.7909 5.79086 15 8 15H10C12.2091 15 14 16.7909 14 19V21" />
      <path d="M16 15H17C19.2091 15 21 16.7909 21 19V21" />
    </svg>
  )),
  Eye: svgFactory((props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M1 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 23 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )),
  ArrowLeftRight: svgFactory((props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M8 3L4 7L8 11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3L20 7L16 11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 7H20" strokeLinecap="round" />
      <path d="M4 17L8 21L12 17" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17L16 13L20 17" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17H20" strokeLinecap="round" />
    </svg>
  )),
  FileCheck2: svgFactory((props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
      <path d="M14 2V8H20" />
      <path d="M9 15L11 17L15 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )),
  Share2: svgFactory((props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51L15.42 17.49" />
      <path d="M15.41 6.51L8.59 10.49" />
    </svg>
  )),
};

const getIcon = (name: string) => ICONS[name] ?? ICONS.Layers;

export default function FeatureAccordionGrid() {
  const [openId, setOpenId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 md:grid-cols-2 md:gap-7 xl:grid-cols-3">
      {features.map((feature) => (
        <FeaturePill
          key={feature.id}
          id={feature.id}
          title={feature.title}
          desc={feature.desc}
          Icon={getIcon(feature.icon)}
          isOpen={openId === feature.id}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
