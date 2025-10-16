import { HeroSection, FeaturesSection, ServicesSection, StatsSection, FinalSection } from "@/components";
import NavbarLanding from "@/components/NavbarLanding";
import FooterLanding from "@/components/FooterLanding";

export default function Home() {
  return (
    <main className="min-h-screen">
      <NavbarLanding />
      <HeroSection />
      <FeaturesSection />
      <ServicesSection />
      <StatsSection />
      <FinalSection />
      <FooterLanding />
    </main>
  );
}
