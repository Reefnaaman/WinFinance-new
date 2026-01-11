import { Card } from "@/components/ui/card"
import { TrendingUp, Shield, PiggyBank, Home } from "lucide-react"

const services = [
  {
    icon: TrendingUp,
    title: "תכנון פיננסי",
    description: "בניית תוכניות פיננסיות מקיפות לטווח ארוך המותאמות למטרות שלכם",
  },
  {
    icon: PiggyBank,
    title: "תכנון פרישה",
    description: "הכנה וליווי מקצועי לקראת יציאה לפנסיה והבטחת עתיד כלכלי בטוח",
  },
  {
    icon: Shield,
    title: "פתרונות ביטוח",
    description: "ייעוץ ובחירת מוצרי ביטוח מותאמים המספקים הגנה מיטבית",
  },
  {
    icon: Home,
    title: "פתרונות מימון",
    description: "ייעוץ וליווי מקצועי בתחום המשכנתאות וההלוואות",
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="py-16 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-12 md:mb-16 px-4 sm:px-0">
          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-balance">השירותים שלנו</h2>
          <p className="text-sm xs:text-base sm:text-lg md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            מגוון רחב של שירותים פיננסיים מותאמים אישית לצרכים שלכם
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {services.map((service, index) => (
            <Card key={index} className="p-5 sm:p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 touch-manipulation active:scale-[0.98]">
              <div className="bg-gradient-to-br from-primary/15 to-accent/15 w-14 h-14 sm:w-16 sm:h-16 md:w-14 md:h-14 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <service.icon className="w-7 h-7 sm:w-8 sm:h-8 md:w-7 md:h-7 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3">{service.title}</h3>
              <p className="text-sm sm:text-sm md:text-base text-muted-foreground leading-relaxed">{service.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
