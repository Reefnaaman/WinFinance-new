"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Phone, Mail, MapPin } from "lucide-react"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"

export function CTASection() {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.1,
  })

  return (
    <section
      ref={ref as any}
      id="contact"
      className={`py-16 md:py-32 bg-secondary text-secondary-foreground fade-in-section ${isVisible ? 'visible' : ''}`}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
              בואו נתחיל לבנות את העתיד שלך
            </h2>
            <p className="text-base md:text-lg text-secondary-foreground/80">
              צרו איתנו קשר עוד היום לפגישת ייעוץ ראשונית ללא התחייבות
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <Card className="p-6 md:p-8 bg-background text-foreground">
              <h3 className="text-xl md:text-2xl font-bold mb-6">שלחו לנו הודעה</h3>
              <form className="space-y-5">
                <div>
                  <Input placeholder="שם מלא" className="text-base h-12 md:h-11" />
                </div>
                <div>
                  <Input type="tel" placeholder="טלפון" className="text-base h-12 md:h-11" />
                </div>
                <div>
                  <Input type="email" placeholder="אימייל" className="text-base h-12 md:h-11" />
                </div>
                <Button className="w-full h-12 md:h-11 bg-gradient-to-r from-accent to-chart-2 hover:from-accent/90 hover:to-chart-2/90 active:from-accent/80 active:to-chart-2/80 text-white text-base md:text-lg font-semibold shadow-lg">
                  שלחו פנייה
                </Button>
              </form>
            </Card>

            <div className="space-y-4 flex flex-col justify-center">
              <a href="tel:054-206-2693" className="flex items-start gap-4 hover:opacity-80 active:opacity-70 transition-all p-3 rounded-lg min-h-[44px] hover:bg-white/5 touch-manipulation">
                <div className="bg-gradient-to-br from-accent/20 to-accent/10 w-14 h-14 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-7 h-7 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="font-bold text-base md:text-lg mb-1">טלפון</h4>
                  <p className="text-secondary-foreground/80 text-base">054-206-2693</p>
                </div>
              </a>

              <a
                href="mailto:peleg@winfinance.co.il"
                className="flex items-start gap-4 hover:opacity-80 active:opacity-70 transition-all p-3 rounded-lg min-h-[44px] hover:bg-white/5 touch-manipulation"
              >
                <div className="bg-gradient-to-br from-accent/20 to-accent/10 w-14 h-14 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-7 h-7 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="font-bold text-base md:text-lg mb-1">אימייל</h4>
                  <p className="text-secondary-foreground/80 text-base">peleg@winfinance.co.il</p>
                </div>
              </a>

              <div className="flex items-start gap-4 p-3 rounded-lg min-h-[44px]">
                <div className="bg-gradient-to-br from-accent/20 to-accent/10 w-14 h-14 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-7 h-7 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex flex-col justify-center">
                  <h4 className="font-bold text-base md:text-lg mb-1">כתובת</h4>
                  <p className="text-secondary-foreground/80 text-base">רחוב הרוקמים 2, חולון</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
