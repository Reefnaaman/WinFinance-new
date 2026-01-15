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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 text-foreground text-base md:text-sm font-medium mb-8 border border-primary/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            שינוי סטנדרט השירות הפיננסי בישראל
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-balance mb-6 leading-tight">
            העתיד הפיננסי שלך
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">מתחיל כאן</span>
          </h1>

          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            פתרונות פיננסיים מקיפים תחת קורת גג אחת. תכנון פיננסי, פנסיה, ביטוח ומימון - מותאמים אישית לצרכים שלך עם
            ליווי מקצועי לאורך כל הדרך
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={`https://wa.me/972${phoneNumberForWhatsapp.slice(1)}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-base md:text-lg px-8 py-7 md:py-6 h-auto font-semibold group w-full sm:w-auto min-h-[56px]"
              >
                קבעו פגישת ייעוץ חינם
                <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </a>
            <Button
              size="lg"
              variant="outline"
              className="text-base md:text-lg px-8 py-7 md:py-6 h-auto border-2 border-primary/40 font-semibold hover:bg-primary/5 hover:border-primary/60 bg-transparent w-full sm:w-auto min-h-[56px] transition-all text-primary"
            >
              למידע נוסף
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced decorative gradient orbs with soft orange accents */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-accent/15 to-accent/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-tr from-accent/10 to-chart-3/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-accent/5 via-transparent to-chart-2/5 rounded-full blur-3xl"></div>
    </section>
  )
}
