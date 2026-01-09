import { Header } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { ServicesSection } from "@/components/landing/services-section"
import { AdvantagesSection } from "@/components/landing/advantages-section"
import { VisionSection } from "@/components/landing/vision-section"
import { CTASection } from "@/components/landing/cta-section"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <ServicesSection />
      <AdvantagesSection />
      <VisionSection />
      <CTASection />
      <Footer />
    </main>
  )
}