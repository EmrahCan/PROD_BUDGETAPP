# FinansKoç - Teknik Dokümantasyon

## 1. Genel Bakış

**FinansKoç**, kişisel finans yönetimi için geliştirilmiş kapsamlı bir web uygulamasıdır. Kullanıcıların banka hesaplarını, kredi kartlarını, taksitlerini, kredilerini ve yatırımlarını tek bir platformdan yönetmelerini sağlar.

---

## 2. Teknoloji Yığını (Tech Stack)

### 2.1 Frontend

| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.x | Tip güvenliği |
| **Vite** | 5.x | Build tool & dev server |
| **Tailwind CSS** | 3.x | Utility-first CSS |
| **shadcn/ui** | - | UI component library |
| **TanStack React Query** | 5.83.0 | Server state management |
| **React Router DOM** | 6.30.1 | Client-side routing |
| **React Hook Form** | 7.61.1 | Form yönetimi |
| **Zod** | 3.25.76 | Schema validation |
| **i18next** | 25.6.3 | Çoklu dil desteği |
| **Recharts** | 2.15.4 | Grafik ve chart'lar |
| **Framer Motion** | - | Animasyonlar |
| **Lucide React** | 0.462.0 | İkon kütüphanesi |

### 2.2 Backend (Lovable Cloud / Supabase)

| Teknoloji | Kullanım Amacı |
|-----------|----------------|
| **PostgreSQL** | İlişkisel veritabanı |
| **Supabase Auth** | Kimlik doğrulama |
| **Supabase Storage** | Dosya depolama |
| **Supabase Realtime** | Gerçek zamanlı abonelikler |
| **Edge Functions (Deno)** | Serverless backend logic |
| **Row Level Security (RLS)** | Veri güvenliği |
| **pg_cron** | Zamanlanmış görevler |

### 2.3 Harici Entegrasyonlar

| Servis | Kullanım Amacı |
|--------|----------------|
| **Resend** | Email gönderimi |
| **CoinGecko API** | Kripto para fiyatları |
| **Exchange Rate API** | Döviz kurları |
| **Web Push API** | Push bildirimleri |
| **Tesseract.js** | OCR (fiş tarama) |

### 2.4 Geliştirme Araçları

| Araç | Kullanım Amacı |
|------|----------------|
| **ESLint** | Kod linting |
| **Prettier** | Kod formatlama |
| **Vite PWA Plugin** | Progressive Web App |

---

## 3. Veritabanı Yapısı

### 3.1 Temel Tablolar

#### Kullanıcı Yönetimi
```
profiles
├── id (UUID, PK) → auth.users.id
├── full_name (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

user_roles
├── id (UUID, PK)
├── user_id (UUID) → auth.users.id
├── role (ENUM: 'admin' | 'user')
└── created_at (TIMESTAMPTZ)
```

#### Hesap Yönetimi
```
accounts
├── id (UUID, PK)
├── user_id (UUID)
├── name (TEXT)
├── bank_id (TEXT)
├── bank_name (TEXT)
├── account_type (TEXT)
├── balance (NUMERIC)
├── currency (TEXT, default: 'TRY')
├── overdraft_limit (NUMERIC)
├── overdraft_interest_rate (NUMERIC)
├── iban (TEXT)
├── account_number (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

credit_cards
├── id (UUID, PK)
├── user_id (UUID)
├── name (TEXT)
├── bank_id (TEXT)
├── bank_name (TEXT)
├── last_four_digits (TEXT)
├── card_limit (NUMERIC)
├── balance (NUMERIC)
├── due_date (INTEGER)
├── minimum_payment (NUMERIC)
├── currency (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

#### İşlem Yönetimi
```
transactions
├── id (UUID, PK)
├── user_id (UUID)
├── account_id (UUID, FK → accounts)
├── card_id (UUID, FK → credit_cards)
├── amount (NUMERIC)
├── transaction_type (TEXT: 'income' | 'expense')
├── category (TEXT)
├── description (TEXT)
├── transaction_date (DATE)
├── currency (TEXT)
├── receipt_image_url (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

receipt_items
├── id (UUID, PK)
├── user_id (UUID)
├── transaction_id (UUID, FK → transactions)
├── name (TEXT)
├── brand (TEXT)
├── category (TEXT)
├── quantity (NUMERIC)
├── unit_price (NUMERIC)
├── total_price (NUMERIC)
├── transaction_date (DATE)
└── created_at (TIMESTAMPTZ)
```

#### Ödemeler ve Taksitler
```
fixed_payments
├── id (UUID, PK)
├── user_id (UUID)
├── name (TEXT)
├── amount (NUMERIC)
├── currency (TEXT)
├── category (TEXT)
├── payment_day (INTEGER)
├── account_id (UUID, FK)
├── card_id (UUID, FK)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

installments
├── id (UUID, PK)
├── user_id (UUID)
├── name (TEXT)
├── total_amount (NUMERIC)
├── monthly_amount (NUMERIC)
├── total_months (INTEGER)
├── paid_months (INTEGER)
├── start_date (DATE)
├── card_id (UUID, FK)
├── category (TEXT)
├── currency (TEXT)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

loans
├── id (UUID, PK)
├── user_id (UUID)
├── name (TEXT)
├── loan_type (TEXT)
├── bank_id (TEXT)
├── bank_name (TEXT)
├── total_amount (NUMERIC)
├── remaining_amount (NUMERIC)
├── monthly_payment (NUMERIC)
├── interest_rate (NUMERIC)
├── start_date (DATE)
├── end_date (DATE)
├── payment_day (INTEGER)
├── total_months (INTEGER)
├── paid_months (INTEGER)
├── account_id (UUID, FK)
├── card_id (UUID, FK)
├── currency (TEXT)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

payment_records
├── id (UUID, PK)
├── user_id (UUID)
├── fixed_payment_id (UUID, FK)
├── payment_month (DATE)
├── amount (NUMERIC)
├── paid_at (TIMESTAMPTZ)
└── created_at (TIMESTAMPTZ)
```

#### Bütçe ve Hedefler
```
budget_limits
├── id (UUID, PK)
├── user_id (UUID)
├── category (TEXT)
├── monthly_limit (NUMERIC)
├── alert_threshold (NUMERIC, default: 80)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

savings_goals
├── id (UUID, PK)
├── user_id (UUID)
├── name (TEXT)
├── target_amount (NUMERIC)
├── current_amount (NUMERIC)
├── deadline (DATE)
├── category (TEXT)
├── is_completed (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

#### Yatırımlar
```
crypto_holdings
├── id (UUID, PK)
├── user_id (UUID)
├── symbol (TEXT)
├── name (TEXT)
├── quantity (NUMERIC)
├── purchase_price (NUMERIC)
├── purchase_currency (TEXT)
├── exchange (TEXT)
├── notes (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

currency_holdings
├── id (UUID, PK)
├── user_id (UUID)
├── asset_type (TEXT)
├── asset_code (TEXT)
├── asset_name (TEXT)
├── quantity (NUMERIC)
├── purchase_price (NUMERIC)
├── purchase_date (DATE)
├── notes (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

crypto_price_alerts
├── id (UUID, PK)
├── user_id (UUID)
├── symbol (TEXT)
├── name (TEXT)
├── target_price (NUMERIC)
├── direction (TEXT: 'above' | 'below')
├── is_active (BOOLEAN)
├── is_triggered (BOOLEAN)
├── triggered_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

#### Aile Finansı
```
family_groups
├── id (UUID, PK)
├── name (TEXT)
├── created_by (UUID)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

family_members
├── id (UUID, PK)
├── family_id (UUID, FK → family_groups)
├── user_id (UUID)
├── role (TEXT: 'owner' | 'member')
└── joined_at (TIMESTAMPTZ)

family_invites
├── id (UUID, PK)
├── family_id (UUID, FK)
├── invited_by (UUID)
├── invited_email (TEXT)
├── status (TEXT: 'pending' | 'accepted' | 'rejected')
├── expires_at (TIMESTAMPTZ)
└── created_at (TIMESTAMPTZ)

shared_accounts
├── id (UUID, PK)
├── account_id (UUID, FK → accounts)
├── family_id (UUID, FK → family_groups)
├── shared_by (UUID)
└── created_at (TIMESTAMPTZ)
```

#### Bildirimler
```
notifications
├── id (UUID, PK)
├── user_id (UUID)
├── title (TEXT)
├── message (TEXT)
├── notification_type (TEXT)
├── priority (VARCHAR)
├── is_read (BOOLEAN)
├── action_url (TEXT)
├── related_entity_type (VARCHAR)
├── related_entity_id (UUID)
├── related_id (UUID)
└── created_at (TIMESTAMPTZ)

push_notification_preferences
├── id (UUID, PK)
├── user_id (UUID)
├── enabled (BOOLEAN)
├── payment_reminders (BOOLEAN)
├── budget_alerts (BOOLEAN)
├── achievement_alerts (BOOLEAN)
├── subscription_endpoint (TEXT)
├── subscription_keys (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

email_preferences
├── id (UUID, PK)
├── user_id (UUID)
├── email (TEXT)
├── frequency (TEXT: 'none' | 'daily' | 'weekly' | 'monthly')
├── is_active (BOOLEAN)
├── preferred_hour (INTEGER)
├── preferred_minute (INTEGER)
├── preferred_day (INTEGER)
├── timezone (TEXT)
├── language (TEXT)
├── last_sent_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

#### Güvenlik ve Analitik
```
login_events
├── id (UUID, PK)
├── user_id (UUID)
├── event_type (TEXT)
├── ip_address (TEXT)
├── user_agent (TEXT)
├── country_code (TEXT)
├── city (TEXT)
├── is_suspicious (BOOLEAN)
├── suspicious_reason (TEXT)
└── login_at (TIMESTAMPTZ)

suspicious_activity_alerts
├── id (UUID, PK)
├── user_id (UUID)
├── alert_type (TEXT)
├── severity (TEXT)
├── description (TEXT)
├── metadata (JSONB)
├── is_resolved (BOOLEAN)
├── resolved_by (UUID)
├── resolved_at (TIMESTAMPTZ)
└── created_at (TIMESTAMPTZ)

page_views
├── id (UUID, PK)
├── user_id (UUID)
├── page_name (TEXT)
├── page_path (TEXT)
├── session_id (UUID)
├── duration_seconds (INTEGER)
└── viewed_at (TIMESTAMPTZ)

email_analytics
├── id (UUID, PK)
├── user_id (UUID)
├── user_email (TEXT)
├── email_type (TEXT)
├── event_type (TEXT)
├── link_url (TEXT)
├── user_agent (TEXT)
├── ip_address (TEXT)
└── created_at (TIMESTAMPTZ)
```

#### Gamification
```
badge_definitions
├── id (TEXT, PK)
├── name (TEXT)
├── description (TEXT)
├── icon (TEXT)
├── category (TEXT)
├── requirement_type (TEXT)
├── requirement_value (INTEGER)
└── created_at (TIMESTAMPTZ)

user_badges
├── id (UUID, PK)
├── user_id (UUID)
├── badge_id (TEXT, FK → badge_definitions)
├── progress (INTEGER)
└── earned_at (TIMESTAMPTZ)
```

#### AI Cache
```
ai_cache
├── id (UUID, PK)
├── user_id (UUID)
├── cache_key (TEXT)
├── cache_type (TEXT)
├── request_hash (TEXT)
├── response_data (JSONB)
├── base_ttl_hours (INTEGER)
├── adjusted_ttl_hours (INTEGER)
├── hit_count (INTEGER)
├── last_hit_at (TIMESTAMPTZ)
├── expires_at (TIMESTAMPTZ)
└── created_at (TIMESTAMPTZ)

cache_settings
├── id (UUID, PK)
├── setting_key (TEXT)
├── setting_value (JSONB)
├── updated_by (UUID)
└── updated_at (TIMESTAMPTZ)
```

### 3.2 Veritabanı Fonksiyonları

| Fonksiyon | Açıklama |
|-----------|----------|
| `has_role(user_id, role)` | Kullanıcının belirli bir role sahip olup olmadığını kontrol eder |
| `is_family_member(family_id, user_id)` | Kullanıcının aile grubuna üye olup olmadığını kontrol eder |
| `is_family_owner(family_id, user_id)` | Kullanıcının aile grubunun sahibi olup olmadığını kontrol eder |
| `has_valid_family_invite(family_id, email)` | Geçerli aile daveti olup olmadığını kontrol eder |
| `check_budget_limit()` | Bütçe limiti aşımını kontrol eden trigger |
| `check_negative_balance()` | Negatif bakiye kontrolü yapan trigger |
| `check_suspicious_login()` | Şüpheli giriş tespiti yapan trigger |
| `calculate_adaptive_ttl()` | AI cache için adaptif TTL hesaplar |
| `cleanup_expired_ai_cache()` | Süresi dolmuş cache kayıtlarını temizler |
| `handle_new_user()` | Yeni kullanıcı profili oluşturan trigger |
| `notify_new_user_registration()` | Admin'e yeni kullanıcı bildirimi gönderen trigger |
| `update_updated_at_column()` | updated_at kolonunu güncelleyen trigger |

### 3.3 Row Level Security (RLS) Politikaları

Tüm tablolarda RLS aktiftir ve aşağıdaki prensipler uygulanır:

1. **Kullanıcı İzolasyonu**: Her kullanıcı sadece kendi verilerine erişebilir
2. **Admin Erişimi**: Admin rolüne sahip kullanıcılar belirli tablolardaki tüm verilere erişebilir
3. **Aile Paylaşımı**: Aile grubu üyeleri paylaşılan hesaplara erişebilir
4. **Service Role**: Bazı tablolar sadece backend tarafından erişilebilir

---

## 4. Edge Functions

### 4.1 Kimlik Doğrulama & Kullanıcı Yönetimi

| Fonksiyon | Açıklama |
|-----------|----------|
| `log-login` | Kullanıcı girişlerini kaydeder, IP/lokasyon bilgisi toplar |
| `delete-user` | Admin tarafından kullanıcı silme işlemi |
| `new-user-notification` | Yeni kullanıcı kaydında admin bildirimi |

### 4.2 Email Servisleri

| Fonksiyon | Açıklama |
|-----------|----------|
| `welcome-email` | Hoş geldin emaili gönderir |
| `onboarding-emails` | 7 günlük onboarding serisi |
| `send-report-email` | Günlük/haftalık finansal raporlar |
| `email-tracking` | Email açılma/tıklama takibi |
| `unsubscribe-onboarding` | Onboarding serisinden çıkış |
| `test-onboarding-email` | Test amaçlı onboarding emaili |

### 4.3 Bildirimler & Hatırlatıcılar

| Fonksiyon | Açıklama |
|-----------|----------|
| `send-push-notification` | Web push bildirimi gönderir |
| `get-vapid-key` | VAPID public key sağlar |
| `fixed-payment-reminder` | Sabit ödeme hatırlatıcısı |
| `installment-payment-reminder` | Taksit hatırlatıcısı |
| `loan-payment-reminder` | Kredi ödeme hatırlatıcısı |
| `card-payment-reminder` | Kredi kartı ödeme hatırlatıcısı |
| `admin-notification` | Admin bildirim sistemi |

### 4.4 AI & Analitik

| Fonksiyon | Açıklama |
|-----------|----------|
| `financial-chat` | AI destekli finansal asistan |
| `financial-insights` | AI destekli finansal öneriler |
| `receipt-scanner` | Fiş/fatura OCR analizi |

### 4.5 Harici API Entegrasyonları

| Fonksiyon | Açıklama |
|-----------|----------|
| `crypto-prices` | CoinGecko API'den kripto fiyatları |
| `exchange-rates` | Döviz kurları |

### 4.6 Diğer

| Fonksiyon | Açıklama |
|-----------|----------|
| `contact-form` | İletişim formu işleme |
| `support-request` | Destek talebi oluşturma |
| `family-invite` | Aile daveti gönderme |
| `auth-logs` | Auth log analizi |

---

## 5. Güvenlik

### 5.1 Kimlik Doğrulama
- Email/şifre tabanlı kayıt ve giriş
- Otomatik email onayı (development)
- JWT tabanlı session yönetimi
- Otomatik token yenileme

### 5.2 Yetkilendirme
- Row Level Security (RLS) tüm tablolarda aktif
- Role-based access control (RBAC)
- Security definer fonksiyonları ile güvenli rol kontrolü

### 5.3 Şüpheli Aktivite Tespiti
- Farklı IP'den kısa sürede giriş tespiti
- İmkansız seyahat (farklı ülkeden 1 saat içinde giriş) tespiti
- 24 saat içinde 5+ farklı IP'den giriş tespiti
- Otomatik alert oluşturma

### 5.4 Veri Güvenliği
- Tüm veriler Supabase altyapısında şifreli
- HTTPS zorunlu
- API anahtarları environment variable olarak saklanır
- Hassas veriler (email, isim) yalnızca yetkili kullanıcılara açık

---

## 6. Performans Optimizasyonları

### 6.1 AI Cache Sistemi
- Request hash tabanlı cache
- Adaptif TTL (kullanım sıklığına göre otomatik ayarlama)
- Hit count tracking
- Otomatik cache temizleme (pg_cron)

### 6.2 Frontend Optimizasyonları
- React Query ile server state caching
- Lazy loading (code splitting)
- Image lazy loading
- PWA ile offline desteği

---

## 7. Çoklu Dil Desteği

| Dil | Kod |
|-----|-----|
| Türkçe | tr |
| English | en |
| Deutsch | de |

Çeviri dosyaları: `src/i18n/locales/`

---

## 8. Zamanlanmış Görevler (pg_cron)

| Görev | Zamanlama | Açıklama |
|-------|-----------|----------|
| `daily-onboarding-emails` | Her gün 07:00 UTC | Onboarding email serisi |
| `cleanup-expired-cache` | Her 6 saatte | Süresi dolmuş AI cache temizliği |

---

## 9. Deployment

### 9.1 Frontend
- Lovable tarafından otomatik deploy
- Preview ve Production URL'leri

### 9.2 Backend
- Edge Functions otomatik deploy
- Database migrations manuel onay gerektirir

### 9.3 Environment Variables

| Variable | Açıklama |
|----------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `RESEND_API_KEY` | Email servisi API key |
| `CRON_AUTH_SECRET` | Cron job authentication |
| `VAPID_PUBLIC_KEY` | Web push public key |
| `VAPID_PRIVATE_KEY` | Web push private key |
| `LOVABLE_API_KEY` | AI servisi API key |

---

## 10. Versiyon Bilgisi

- **Doküman Versiyonu**: 1.0
- **Son Güncelleme**: 2026-01-13
- **Proje**: FinansKoç Personal Finance Manager
