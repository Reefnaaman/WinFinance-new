"use client"

import { Sparkles } from "lucide-react"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"

export function VisionSection() {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.2,
  })

  return (
    <section
      ref={ref as any}
      id="about"
      className={`py-16 sm:py-20 md:py-32 relative overflow-hidden fade-in-section ${isVisible ? 'visible' : ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/8"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-full bg-gradient-to-r from-primary/15 to-accent/15 text-foreground text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-primary/30">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span>החזון שלנו</span>
          </div>

          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-5xl font-bold mb-6 sm:mb-8 text-balance px-2 sm:px-0 leading-tight">לשנות את סטנדרט השירות הפיננסי</h2>

          <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            <p className="text-sm xs:text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
              ב-WinFinance אנו מאמינים שכל אדם ועסק ראויים לשירות פיננסי מקצועי, אמין ומותאם אישית. אנו עובדים בשיתוף
              פעולה עם בתי השקעות וחברות ביטוח מובילים כדי להציע לכם את המוצרים והפתרונות הטובים ביותר.
            </p>

            <p className="text-sm xs:text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
              המטרה שלנו היא להוביל אתכם להצלחה כלכלית באמצעות תכנון מותאם אישית, ליווי מקצועי ושירות ברמה הגבוהה ביותר.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
