import Image from "next/image"
import { Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
          <div className="flex flex-col items-center sm:items-center lg:items-start gap-3 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <Image src="/winfinance-logo.png" alt="WinFinance Logo" width={40} height={40} className="w-10 h-10" />
              <div className="text-right">
                <div className="text-lg sm:text-xl font-bold text-foreground">WinFinance</div>
                <div className="text-xs text-muted-foreground">ווין פיננס</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center sm:text-center lg:text-right leading-relaxed">
              פתרונות פיננסיים מקיפים תחת קורת גג אחת
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-foreground mb-4 text-center sm:text-center lg:text-right">יצירת קשר</h3>
            <a
              href="tel:054-206-2693"
              className="flex items-center justify-center sm:justify-center lg:justify-start gap-3 text-muted-foreground hover:text-foreground transition-all py-2 px-2 rounded-md hover:bg-accent/5 active:bg-accent/10 touch-manipulation"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">054-206-2693</span>
            </a>
            <a
              href="mailto:peleg@winfinance.co.il"
              className="flex items-center justify-center sm:justify-center lg:justify-start gap-3 text-muted-foreground hover:text-foreground transition-all py-2 px-2 rounded-md hover:bg-accent/5 active:bg-accent/10 touch-manipulation"
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm">peleg@winfinance.co.il</span>
            </a>
            <div className="flex items-center justify-center sm:justify-center lg:justify-start gap-3 text-muted-foreground py-2 px-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">רחוב הרוקמים 2, חולון</span>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-center lg:items-start gap-4">
            <h3 className="font-bold text-foreground">קישורים מהירים</h3>
            <div className="flex flex-col gap-1 text-sm">
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-all py-2 px-2 rounded-md hover:bg-accent/5 active:bg-accent/10 touch-manipulation text-center sm:text-center lg:text-right">
                אודות
              </a>
              <a href="#services" className="text-muted-foreground hover:text-foreground transition-all py-2 px-2 rounded-md hover:bg-accent/5 active:bg-accent/10 touch-manipulation text-center sm:text-center lg:text-right">
                שירותים
              </a>
              <a href="#advantages" className="text-muted-foreground hover:text-foreground transition-all py-2 px-2 rounded-md hover:bg-accent/5 active:bg-accent/10 touch-manipulation text-center sm:text-center lg:text-right">
                למה אנחנו
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-all py-2 px-2 rounded-md hover:bg-accent/5 active:bg-accent/10 touch-manipulation text-center sm:text-center lg:text-right">
                צור קשר
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 sm:pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} WinFinance. כל הזכויות שמורות.
          </p>

          <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-all py-2 px-2 rounded-md hover:bg-accent/5 active:bg-accent/10 touch-manipulation">
              תנאי שימוש
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-all py-2 px-2 rounded-md hover:bg-accent/5 active:bg-accent/10 touch-manipulation">
              מדיניות פרטיות
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
