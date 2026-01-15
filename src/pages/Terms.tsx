import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logoImage from "@/assets/logo.png";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoImage} alt="BudgetApp Logo" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                BudgetApp
              </span>
            </Link>
            
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Ana Sayfa
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Kullanım Koşulları</h1>
            <p className="text-muted-foreground">Son güncelleme: 23 Aralık 2024</p>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
            {/* Important Notice */}
            <section className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                <h2 className="text-2xl font-semibold m-0 text-amber-600 dark:text-amber-400">Önemli Bilgilendirme</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>BudgetApp tamamen ücretsiz bir uygulamadır.</strong> Bu uygulama kişisel finans takibi 
                amacıyla geliştirilmiş olup, ticari bir hizmet değildir.
              </p>
              <div className="bg-background/50 rounded-lg p-4 border border-amber-500/20">
                <p className="text-sm text-muted-foreground font-medium">
                  ⚠️ <strong>Veri Sorumluluğu:</strong> Uygulamaya girilen tüm finansal veriler, hesap bilgileri 
                  ve işlem kayıtlarının doğruluğu ve yedeklenmesi tamamen kullanıcının sorumluluğundadır. 
                  BudgetApp, veri kaybından veya yanlış veri girişinden kaynaklanan herhangi bir zarardan 
                  sorumlu tutulamaz.
                </p>
              </div>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold m-0">Hizmet Kapsamı</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                BudgetApp aşağıdaki özellikleri ücretsiz olarak sunar:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Banka hesabı ve kredi kartı yönetimi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Gelir ve gider takibi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Sabit ödeme ve taksit takibi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>AI destekli finansal analiz ve öneriler</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Fiş tarama ve otomatik işlem oluşturma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Detaylı raporlar ve grafikler</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>E-posta bildirimleri</span>
                </li>
              </ul>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Info className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold m-0">Kullanıcı Sorumlulukları</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                BudgetApp kullanıcıları aşağıdaki sorumlulukları kabul eder:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">1.</span>
                  <span><strong>Veri Doğruluğu:</strong> Girilen tüm finansal verilerin doğruluğundan kullanıcı sorumludur.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">2.</span>
                  <span><strong>Veri Yedekleme:</strong> Önemli finansal verilerinizin yedeğini almanız önerilir. Uygulama, veri kaybı durumunda sorumluluk kabul etmez.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">3.</span>
                  <span><strong>Hesap Güvenliği:</strong> Hesap bilgilerinizin güvenliğini sağlamak sizin sorumluluğunuzdadır. Güçlü şifreler kullanın.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">4.</span>
                  <span><strong>Yasal Uyumluluk:</strong> Uygulamayı yasal amaçlarla ve ilgili mevzuata uygun şekilde kullanmayı kabul edersiniz.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">5.</span>
                  <span><strong>Finansal Tavsiye:</strong> AI önerileri bilgilendirme amaçlıdır, profesyonel finansal danışmanlık yerine geçmez.</span>
                </li>
              </ul>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-2xl font-semibold mb-4">Sorumluluk Sınırlaması</h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  BudgetApp, <strong>olduğu gibi</strong> sunulmaktadır ve aşağıdaki durumlardan 
                  kaynaklanan herhangi bir zarardan sorumlu tutulamaz:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span>
                    <span>Teknik arızalar veya hizmet kesintileri</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span>
                    <span>Veri kaybı veya veri hasarı</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span>
                    <span>Yanlış veri girişinden kaynaklanan hatalar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span>
                    <span>AI önerilerine dayalı alınan finansal kararlar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span>
                    <span>Üçüncü taraf hizmetlerindeki kesintiler</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-2xl font-semibold mb-4">Hizmet Değişiklikleri</h2>
              <p className="text-muted-foreground leading-relaxed">
                BudgetApp, önceden bildirimde bulunmaksızın:
              </p>
              <ul className="space-y-2 text-muted-foreground mt-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Hizmet özelliklerini değiştirme veya güncelleme</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Bakım veya güncelleme için hizmeti geçici olarak durdurma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Kullanım koşullarını güncelleme hakkını saklı tutar</span>
                </li>
              </ul>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-2xl font-semibold mb-4">Hesap Sonlandırma</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kullanıcılar istedikleri zaman hesaplarını silme hakkına sahiptir. Hesap silindiğinde, 
                kullanıcıya ait tüm veriler kalıcı olarak sistemden kaldırılır. Bu işlem geri alınamaz.
              </p>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-2xl font-semibold mb-4">Uygulanacak Hukuk</h2>
              <p className="text-muted-foreground leading-relaxed">
                Bu kullanım koşulları Türkiye Cumhuriyeti kanunlarına tabidir. Herhangi bir uyuşmazlık 
                durumunda Türkiye mahkemeleri yetkili olacaktır.
              </p>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-2xl font-semibold mb-4">İletişim</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kullanım koşulları hakkında sorularınız için <Link to="/contact" className="text-primary hover:underline">iletişim sayfamızı</Link> ziyaret edebilirsiniz.
              </p>
            </section>

            <section className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
              <p className="text-center text-muted-foreground">
                BudgetApp uygulamasını kullanarak yukarıdaki koşulları kabul etmiş sayılırsınız.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2024 BudgetApp. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;