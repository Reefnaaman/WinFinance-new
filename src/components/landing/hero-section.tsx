import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function HeroSection() {
  const phoneNumber = "054-206-2693"
  const phoneNumberForWhatsapp = phoneNumber.replace(/-/g, '') // Remove dashes for WhatsApp
  const whatsappMessage = encodeURIComponent("היי אשמח לקבוע פגישת ייעוץ")

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-accent/5 to-accent/10">
      {/* Enhanced gradient background with soft orange accents */}
      <div className="absolute inset-0 bg-gradient-to-t from-accent/5 via-transparent to-transparent"></div>

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 text-foreground text-sm sm:text-base md:text-sm font-medium mb-6 sm:mb-8 border border-primary/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs sm:text-sm md:text-sm">שינוי סטנדרט השירות הפיננסי בישראל</span>
          </div>

          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-balance mb-4 sm:mb-6 leading-tight px-2 sm:px-0">
            <span className="block">העתיד הפיננסי שלך</span>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent block mt-1 sm:mt-0">מתחיל כאן</span>
          </h1>

          <p className="text-sm xs:text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4 sm:px-0">
            פתרונות פיננסיים מקיפים תחת קורת גג אחת. תכנון פיננסי, פנסיה, ביטוח ומימון - מותאמים אישית לצרכים שלך עם
            ליווי מקצועי לאורך כל הדרך
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0">
            <a
              href={`https://wa.me/972${phoneNumberForWhatsapp.slice(1)}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 active:bg-secondary/80 text-secondary-foreground text-sm sm:text-base md:text-lg px-6 sm:px-8 py-6 sm:py-7 md:py-6 h-auto font-semibold group w-full sm:w-auto transition-all"
              >
                <span className="text-sm sm:text-base md:text-lg">קבעו פגישת ייעוץ חינם</span>
                <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </a>
            <Button
              size="lg"
              variant="outline"
              className="text-sm sm:text-base md:text-lg px-6 sm:px-8 py-6 sm:py-7 md:py-6 h-auto border-2 border-primary/40 font-semibold hover:bg-primary/5 hover:border-primary/60 active:bg-primary/10 bg-transparent w-full sm:w-auto transition-all text-primary"
            >
              למידע נוסף
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced decorative gradient orbs with soft orange accents */}
      <div className="absolute top-20 -left-36 sm:left-10 w-72 h-72 bg-gradient-to-br from-accent/15 to-accent/5 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-20 -right-48 sm:right-10 w-96 h-96 bg-gradient-to-tr from-accent/10 to-chart-3/5 rounded-full blur-3xl animate-pulse pointer-events-none" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-gradient-to-r from-accent/5 via-transparent to-chart-2/5 rounded-full blur-3xl pointer-events-none"></div>
    </section>
  )
}
