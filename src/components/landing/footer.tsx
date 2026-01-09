import Image from "next/image"
import { Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-3">
              <Image src="/winfinance-logo.png" alt="WinFinance Logo" width={40} height={40} className="w-10 h-10" />
              <div className="text-right">
                <div className="text-xl font-bold text-foreground">WinFinance</div>
                <div className="text-xs text-muted-foreground">ווין פיננס</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-right">
              פתרונות פיננסיים מקיפים תחת קורת גג אחת
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-foreground mb-4 text-center md:text-right">יצירת קשר</h3>
            <a
              href="tel:054-206-2693"
              className="flex items-center justify-center md:justify-start gap-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">054-206-2693</span>
            </a>
            <a
              href="mailto:peleg@winfinance.co.il"
              className="flex items-center justify-center md:justify-start gap-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm">peleg@winfinance.co.il</span>
            </a>
            <div className="flex items-center justify-center md:justify-start gap-3 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">רחוב הרוקמים 2, חולון</span>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start gap-4">
            <h3 className="font-bold text-foreground">קישורים מהירים</h3>
            <div className="flex flex-col gap-2 text-sm">
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
                אודות
              </a>
              <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">
                שירותים
              </a>
              <a href="#advantages" className="text-muted-foreground hover:text-foreground transition-colors">
                למה אנחנו
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                צור קשר
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} WinFinance. כל הזכויות שמורות.
          </p>

          <div className="flex gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              תנאי שימוש
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              מדיניות פרטיות
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
