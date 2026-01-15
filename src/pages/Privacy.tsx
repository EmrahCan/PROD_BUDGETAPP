import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Database } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logoImage from "@/assets/logo.png";

const Privacy = () => {
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
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Gizlilik Politikası</h1>
            <p className="text-muted-foreground">Son güncelleme: 23 Aralık 2024</p>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
            <section className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold m-0">Veri Güvenliği</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                BudgetApp, kullanıcılarının finansal verilerinin güvenliğini en üst düzeyde tutmayı taahhüt eder. 
                Tüm veriler şifrelenerek güvenli sunucularda saklanır ve üçüncü taraflarla paylaşılmaz.
              </p>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold m-0">Toplanan Veriler</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Uygulamamız aşağıdaki bilgileri toplar ve işler:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Hesap Bilgileri:</strong> E-posta adresi, ad-soyad (isteğe bağlı)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Finansal Veriler:</strong> Banka hesapları, kredi kartları, işlemler, sabit ödemeler ve taksitler</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Fiş Görüntüleri:</strong> Fiş tarama özelliği kullanıldığında yüklenen görseller</span>
                </li>
              </ul>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold m-0">Verilerin Kullanımı</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Topladığımız veriler yalnızca aşağıdaki amaçlarla kullanılır:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Finansal takip ve raporlama hizmetlerinin sunulması</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>AI destekli finansal analiz ve öneriler</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>E-posta bildirimleri (kullanıcı tercihi doğrultusunda)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Uygulama performansının iyileştirilmesi</span>
                </li>
              </ul>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-2xl font-semibold mb-4">Üçüncü Taraf Hizmetler</h2>
              <p className="text-muted-foreground leading-relaxed">
                BudgetApp, belirli özellikler için güvenilir üçüncü taraf hizmetlerini kullanır:
              </p>
              <ul className="space-y-2 text-muted-foreground mt-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Supabase:</strong> Veritabanı ve kimlik doğrulama hizmetleri</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Google AI:</strong> Yapay zeka destekli finansal analiz</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Resend:</strong> E-posta gönderim hizmetleri</span>
                </li>
              </ul>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-2xl font-semibold mb-4">Kullanıcı Hakları</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Kullanıcılarımız aşağıdaki haklara sahiptir:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Verilerine erişim ve indirme hakkı</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Verilerin düzeltilmesini talep etme hakkı</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Hesap ve verilerin silinmesini talep etme hakkı</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>E-posta bildirimlerini devre dışı bırakma hakkı</span>
                </li>
              </ul>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-2xl font-semibold mb-4">Çerezler</h2>
              <p className="text-muted-foreground leading-relaxed">
                BudgetApp, oturum yönetimi ve kullanıcı tercihlerini hatırlamak için gerekli çerezleri kullanır. 
                Bu çerezler, uygulamanın düzgün çalışması için zorunludur ve üçüncü taraf takip amaçlı 
                çerezler kullanılmamaktadır.
              </p>
            </section>

            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-2xl font-semibold mb-4">İletişim</h2>
              <p className="text-muted-foreground leading-relaxed">
                Gizlilik politikamız hakkında sorularınız için <Link to="/contact" className="text-primary hover:underline">iletişim sayfamızı</Link> ziyaret edebilirsiniz.
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

export default Privacy;