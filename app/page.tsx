import { HeroSection, FeaturesSection, ServicesSection, StatsSection, FinalSection } from "@/components";

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <ServicesSection />
      <StatsSection />
      <FinalSection />
    </main>
  );
}
