import { Sparkles } from "lucide-react"

export function VisionSection() {
  return (
    <section id="about" className="py-20 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/8"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/15 to-accent/15 text-foreground text-sm font-medium mb-8 border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary" />
            החזון שלנו
          </div>

          <h2 className="text-3xl md:text-5xl font-bold mb-8 text-balance">לשנות את סטנדרט השירות הפיננסי</h2>

          <p className="text-xl text-muted-foreground leading-relaxed mb-6">
            ב-WinFinance אנו מאמינים שכל אדם ועסק ראויים לשירות פיננסי מקצועי, אמין ומותאם אישית. אנו עובדים בשיתוף
            פעולה עם בתי השקעות וחברות ביטוח מובילים כדי להציע לכם את המוצרים והפתרונות הטובים ביותר.
          </p>

          <p className="text-xl text-muted-foreground leading-relaxed">
            המטרה שלנו היא להוביל אתכם להצלחה כלכלית באמצעות תכנון מותאם אישית, ליווי מקצועי ושירות ברמה הגבוהה ביותר.
          </p>
        </div>
      </div>
    </section>
  )
}
