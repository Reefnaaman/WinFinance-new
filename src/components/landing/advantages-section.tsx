import { Card } from "@/components/ui/card"
import { Users, Building2, Target } from "lucide-react"

const advantages = [
  {
    icon: Users,
    title: "מקצועיות",
    description: "צוות מומחים מתכננים פיננסיים, סוכני ביטוח ויועצי מס עם ניסיון רב שנים",
  },
  {
    icon: Building2,
    title: "מקיפות",
    description: "פתרונות כוללים תחת קורת גג אחת - כל השירותים הפיננסיים במקום אחד",
  },
  {
    icon: Target,
    title: "התאמה אישית",
    description: "תהליכים מותאמים לצרכים הספציפיים של כל לקוח עם ליווי אישי צמוד",
  },
]

export function AdvantagesSection() {
  return (
    <section id="advantages" className="py-16 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-12 md:mb-16 px-4 sm:px-0">
          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-balance">למה לבחור ב-WinFinance?</h2>
          <p className="text-sm xs:text-base sm:text-lg md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            היתרונות שלנו הופכים אותנו לשותף האידיאלי לניהול ותכנון פיננסי
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
          {advantages.map((advantage, index) => (
            <Card key={index} className="p-5 sm:p-6 md:p-8 text-center hover:shadow-xl transition-all duration-300 bg-card touch-manipulation active:scale-[0.98]">
              <div className="bg-primary/10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-6 mx-auto">
                <advantage.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h3 className="text-lg xs:text-xl sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">{advantage.title}</h3>
              <p className="text-sm xs:text-base sm:text-base md:text-lg text-muted-foreground leading-relaxed">{advantage.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
