# FinansKoç - Kişisel Finans Yönetimi

<div align="center">
  <img src="public/logo.png" alt="FinansKoç Logo" width="120" />
  <p><strong>Akıllı Finansal Asistanınız</strong></p>
</div>

## 📋 İçindekiler

- [Proje Hakkında](#-proje-hakkında)
- [Özellikler](#-özellikler)
- [Teknoloji Yığını](#-teknoloji-yığını)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [Proje Yapısı](#-proje-yapısı)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Katkıda Bulunma](#-katkıda-bulunma)
- [Lisans](#-lisans)

---

## 🎯 Proje Hakkında

**FinansKoç**, kişisel finanslarınızı yönetmenizi sağlayan kapsamlı bir web uygulamasıdır. Banka hesaplarınızı, kredi kartlarınızı, taksitlerinizi, kredilerinizi ve yatırımlarınızı tek bir platformdan takip edebilir, AI destekli finansal öneriler alabilirsiniz.

**Canlı Demo**:budgetapp.site

---

## ✨ Özellikler

### 💰 Hesap Yönetimi
- Birden fazla banka hesabı takibi
- Kredili mevduat (overdraft) desteği
- Hesap bakiyesi anlık görüntüleme
- Negatif bakiye uyarıları

### 💳 Kredi Kartı Yönetimi
- Kart limiti ve bakiye takibi
- Ekstre kesim tarihi hatırlatmaları
- Minimum ödeme hesaplama

### 📊 İşlem Takibi
- Gelir/gider kategorilendirme
- Fiş/fatura tarama (OCR)
- Ürün bazlı analiz
- Çoklu para birimi desteği

### 📅 Ödeme Yönetimi
- Sabit ödemeler (faturalar, abonelikler)
- Taksit takibi
- Kredi ödeme planları
- Ödeme takvimi görünümü

### 📈 Bütçe ve Hedefler
- Kategori bazlı bütçe limitleri
- Otomatik limit aşımı uyarıları
- Tasarruf hedefleri
- İlerleme takibi

### 🪙 Yatırım Portföyü
- Kripto para takibi
- Döviz ve altın pozisyonları
- Fiyat alarmları
- Portföy dağılımı grafikleri

### 👨‍👩‍👧‍👦 Aile Finansı
- Aile grupları oluşturma
- Hesap paylaşımı
- Email ile davet sistemi

### 🤖 AI Destekli Özellikler
- Finansal danışman chatbot
- Akıllı harcama önerileri
- Bütçe optimizasyon tavsiyeleri
- Fiş analizi ve kategorizasyon

### 🔔 Bildirimler
- Push bildirimleri
- Email raporları (günlük/haftalık)
- 7 günlük onboarding email serisi
- Bütçe aşımı uyarıları

### 🏆 Gamification
- Başarı rozetleri
- İlerleme takibi
- Motivasyon sistemi

### 🌍 Çoklu Dil Desteği
- Türkçe 🇹🇷
- English 🇬🇧
- Deutsch 🇩🇪

---

## 🛠 Teknoloji Yığını

### Frontend
| Teknoloji | Açıklama |
|-----------|----------|
| React 18 | UI framework |
| TypeScript | Tip güvenliği |
| Vite | Build tool |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| TanStack React Query | Server state |
| React Router | Routing |
| React Hook Form + Zod | Form validation |
| i18next | Internationalization |
| Recharts | Charts & graphs |
| Framer Motion | Animations |

### Backend (Lovable Cloud)
| Teknoloji | Açıklama |
|-----------|----------|
| PostgreSQL | Database |
| Supabase Auth | Authentication |
| Supabase Storage | File storage |
| Edge Functions (Deno) | Serverless functions |
| Row Level Security | Data security |
| pg_cron | Scheduled jobs |

### Harici Servisler
| Servis | Kullanım |
|--------|----------|
| Resend | Email gönderimi |
| CoinGecko | Kripto fiyatları |
| Gemini AI | AI özellikleri |
| Web Push API | Push bildirimleri |

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+ 
- npm veya bun
- Git

### Adım 1: Repo'yu Klonlayın

```bash
git clone https://github.com/your-username/finanskoc.git
cd finanskoc
```

### Adım 2: Bağımlılıkları Yükleyin

```bash
npm install
# veya
bun install
```

### Adım 3: Environment Variables

`.env` dosyası otomatik olarak Lovable Cloud tarafından oluşturulur. Lokal geliştirme için:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### Adım 4: Geliştirme Sunucusunu Başlatın

```bash
npm run dev
# veya
bun dev
```

Uygulama `http://localhost:5173` adresinde çalışacaktır.

### Adım 5: Build (Production)

```bash
npm run build
npm run preview
```

---

## 📖 Kullanım

### İlk Kullanım

1. **Kayıt Olun**: `/auth` sayfasından email ve şifre ile hesap oluşturun
2. **Hesap Ekleyin**: Dashboard'dan veya Hesaplar sayfasından banka hesabı ekleyin
3. **İşlem Kaydedin**: Gelir/gider işlemlerinizi kaydetmeye başlayın
4. **Bütçe Belirleyin**: Kategori bazlı bütçe limitleri oluşturun

### Temel Sayfalar

| Sayfa | Açıklama |
|-------|----------|
| `/dashboard` | Ana kontrol paneli |
| `/accounts` | Banka hesapları |
| `/cards` | Kredi kartları |
| `/transactions` | İşlem listesi |
| `/fixed-payments` | Sabit ödemeler |
| `/installments` | Taksitler |
| `/loans` | Krediler |
| `/crypto` | Kripto portföyü |
| `/currency` | Döviz/Altın |
| `/reports` | Finansal raporlar |
| `/ai-advisor` | AI Danışman |
| `/family` | Aile finansı |
| `/calendar` | Ödeme takvimi |
| `/settings` | Kullanıcı ayarları |

### Admin Paneli

Admin yetkisine sahip kullanıcılar `/admin` sayfasından:
- Tüm kullanıcıları görüntüleme
- Platform istatistikleri
- Giriş logları
- Email analitiği
- AI cache yönetimi

---

## 📁 Proje Yapısı

```
src/
├── components/          # React bileşenleri
│   ├── ui/             # shadcn/ui bileşenleri
│   ├── dashboard/      # Dashboard widget'ları
│   ├── admin/          # Admin panel bileşenleri
│   └── ...
├── contexts/           # React Context'ler
├── hooks/              # Custom hooks
├── pages/              # Sayfa bileşenleri
├── i18n/               # Çeviri dosyaları
├── integrations/       # Supabase client
├── lib/                # Utility fonksiyonlar
├── types/              # TypeScript tipleri
└── utils/              # Yardımcı fonksiyonlar

supabase/
├── config.toml         # Supabase config
└── functions/          # Edge Functions
    ├── financial-chat/
    ├── receipt-scanner/
    ├── send-push-notification/
    └── ...

docs/
├── TECHNICAL_DOCUMENTATION.md
├── HIGH_LEVEL_DESIGN.md
└── LOW_LEVEL_DESIGN.md
```

---

## 📚 API Dokümantasyonu

### Veritabanı Tabloları

Detaylı şema için `docs/TECHNICAL_DOCUMENTATION.md` dosyasına bakın.

### Edge Functions

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/financial-chat` | POST | AI chatbot |
| `/financial-insights` | POST | AI önerileri |
| `/receipt-scanner` | POST | Fiş analizi |
| `/crypto-prices` | GET | Kripto fiyatları |
| `/exchange-rates` | GET | Döviz kurları |
| `/send-push-notification` | POST | Push bildirim |

---

## 🤝 Katkıda Bulunma

1. Bu repo'yu fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

### Geliştirme Kuralları

- TypeScript strict mode kullanın
- ESLint kurallarına uyun
- Component'leri küçük ve odaklı tutun
- Semantic commit mesajları yazın

---

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

---

## 🔗 Linkler

- **Canlı Uygulama**: budgetapp.site
- **Dokümantasyon**: `docs/` klasörü

---

<div align="center">
  <p>Made with ❤️ using Budgetapp
</div>
