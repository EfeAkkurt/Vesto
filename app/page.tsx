import { HeroSection, FeaturesSection, StatsSection, FinalSection } from "@/components";
import NavbarLanding from "@/components/NavbarLanding";
import FooterLanding from "@/components/FooterLanding";
import AnimatedTitle from "@/src/components/features/AnimatedTitle";
import FeatureAccordionGrid from "@/src/components/features/FeatureAccordionGrid";

export default function Home() {
  return (
    <main className="min-h-screen">
      <NavbarLanding />
      <HeroSection />
      <FeaturesSection />
      <section id="features" className="py-14 md:py-20">
        <AnimatedTitle rightWord="Features" leftColor="purple" subtitle="Infrastructure designed for institutional real-world asset issuance, custody, and reporting." />
        <FeatureAccordionGrid />
      </section>
      <StatsSection />
      <FinalSection />
      <FooterLanding />
    </main>
  );
}
