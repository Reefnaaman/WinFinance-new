"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useState } from "react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const phoneNumber = "054-206-2693"
  const phoneNumberForWhatsapp = phoneNumber.replace(/-/g, '') // Remove dashes for WhatsApp
  const whatsappMessage = encodeURIComponent("היי אשמח לקבוע פגישת ייעוץ")

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo and company name - always visible on left */}
          <div className="flex items-center gap-3">
            <Image
              src="/winfinance-logo.png"
              alt="WinFinance Logo"
              width={50}
              height={50}
              className="w-10 h-10 md:w-12 md:h-12"
            />
            <div className="text-left">
              <div className="text-lg md:text-2xl font-bold text-foreground">WinFinance</div>
            </div>
          </div>

          {/* Desktop menu - center */}
          <ul className="hidden md:flex items-center gap-8 text-sm">
            <li>
              <a href="#contact" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                צור קשר
              </a>
            </li>
            <li>
              <a href="#advantages" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                למה אנחנו
              </a>
            </li>
            <li>
              <a href="#services" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                שירותים
              </a>
            </li>
            <li>
              <a href="#about" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                אודות
              </a>
            </li>
          </ul>

          {/* Desktop CTA button */}
          <div className="hidden md:flex items-center">
            <a
              href={`https://wa.me/972${phoneNumberForWhatsapp.slice(1)}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold">
                בואו נדבר
              </Button>
            </a>
          </div>

          {/* Mobile hamburger menu - right side */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="תפריט"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-border">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
              <Image src="/winfinance-logo.png" alt="WinFinance Logo" width={40} height={40} className="w-10 h-10" />
              <div className="text-left">
                <div className="text-xl font-bold text-foreground">WinFinance</div>
                <div className="text-xs text-muted-foreground">ווין פיננס</div>
              </div>
            </div>

            <ul className="space-y-4 mb-6">
              <li>
                <a
                  href="#about"
                  className="block text-lg text-foreground/80 hover:text-foreground transition-colors font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  אודות
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  className="block text-lg text-foreground/80 hover:text-foreground transition-colors font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  שירותים
                </a>
              </li>
              <li>
                <a
                  href="#advantages"
                  className="block text-lg text-foreground/80 hover:text-foreground transition-colors font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  למה אנחנו
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="block text-lg text-foreground/80 hover:text-foreground transition-colors font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  צור קשר
                </a>
              </li>
            </ul>

            <div className="space-y-3 pt-6 border-t border-border">
              <a
                href={`tel:${phoneNumber}`}
                className="flex items-center gap-3 text-foreground/80 hover:text-foreground transition-colors"
              >
                <span className="text-sm font-medium">📞</span>
                <span className="text-base">{phoneNumber}</span>
              </a>
              <a
                href="mailto:peleg@winfinance.co.il"
                className="flex items-center gap-3 text-foreground/80 hover:text-foreground transition-colors"
              >
                <span className="text-sm font-medium">✉️</span>
                <span className="text-base">peleg@winfinance.co.il</span>
              </a>
              <div className="flex items-center gap-3 text-foreground/80">
                <span className="text-sm font-medium">📍</span>
                <span className="text-base">רחוב הרוקמים 2, חולון</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
