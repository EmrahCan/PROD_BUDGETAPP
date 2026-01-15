# FinansKoç - Low Level Design (LLD)

## 1. Klasör Yapısı

```
finanskoc/
├── docs/                          # Dokümantasyon
│   ├── TECHNICAL_DOCUMENTATION.md
│   ├── HIGH_LEVEL_DESIGN.md
│   └── LOW_LEVEL_DESIGN.md
│
├── public/                        # Static assets
│   ├── favicon.png
│   ├── logo.png
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── robots.txt
│   └── sw-push.js                 # Push notification service worker
│
├── src/
│   ├── assets/                    # Dynamic assets (imported in code)
│   │   ├── logo.png
│   │   ├── dashboard-demo.mp4
│   │   └── instagram-ad-*.png
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ... (40+ components)
│   │   │
│   │   ├── accounts/              # Account management
│   │   │   ├── AccountDialog.tsx
│   │   │   └── EditAccountDialog.tsx
│   │   │
│   │   ├── admin/                 # Admin panel components
│   │   │   ├── AICacheAnalytics.tsx
│   │   │   ├── EmailAnalyticsDashboard.tsx
│   │   │   └── UserLocationMap.tsx
│   │   │
│   │   ├── ai/                    # AI components
│   │   │   └── FinancialChat.tsx
│   │   │
│   │   ├── cards/                 # Credit card components
│   │   │   ├── CardDialog.tsx
│   │   │   └── EditCardDialog.tsx
│   │   │
│   │   ├── crypto/                # Crypto components
│   │   │   ├── CryptoIcon.tsx
│   │   │   ├── MarketOverview.tsx
│   │   │   ├── PortfolioDistributionChart.tsx
│   │   │   ├── PortfolioHistoryChart.tsx
│   │   │   ├── PriceAlerts.tsx
│   │   │   ├── Top10CryptoWidget.tsx
│   │   │   └── TopCoinsTable.tsx
│   │   │
│   │   ├── dashboard/             # Dashboard widgets
│   │   │   ├── AIInsightsWidget.tsx
│   │   │   ├── BadgesWidget.tsx
│   │   │   ├── BudgetLimitDialog.tsx
│   │   │   ├── BudgetLimitsWidget.tsx
│   │   │   ├── CryptoWidget.tsx
│   │   │   ├── CurrencyWidget.tsx
│   │   │   ├── DraggableWidgetContainer.tsx
│   │   │   ├── EmailPreferencesWidget.tsx
│   │   │   ├── OverduePaymentsWidget.tsx
│   │   │   ├── PushNotificationsWidget.tsx
│   │   │   ├── ReceiptScannerWidget.tsx
│   │   │   ├── RecentTransactionsWidget.tsx
│   │   │   ├── SavingsGoalsWidget.tsx
│   │   │   ├── UnpaidFixedPaymentsWidget.tsx
│   │   │   └── UpcomingPaymentsWidget.tsx
│   │   │
│   │   ├── fixed-payments/
│   │   │   └── FixedPaymentDialog.tsx
│   │   │
│   │   ├── installments/
│   │   │   ├── InstallmentDialog.tsx
│   │   │   └── InstallmentHistoryDialog.tsx
│   │   │
│   │   ├── landing/
│   │   │   └── AnimatedBackground.tsx
│   │   │
│   │   ├── loans/
│   │   │   └── LoanDialog.tsx
│   │   │
│   │   ├── reports/
│   │   │   └── AIReportAssistant.tsx
│   │   │
│   │   ├── transactions/
│   │   │   ├── BulkRescanDialog.tsx
│   │   │   ├── ReceiptScanner.tsx
│   │   │   ├── TransactionDialog.tsx
│   │   │   └── TransactionItemsDialog.tsx
│   │   │
│   │   ├── AdminRoute.tsx         # Admin route guard
│   │   ├── BankLogo.tsx           # Bank logo component
│   │   ├── LanguageSwitcher.tsx   # i18n switcher
│   │   ├── Layout.tsx             # Main layout wrapper
│   │   ├── NavLink.tsx            # Navigation link
│   │   ├── NotificationBell.tsx   # Notification dropdown
│   │   ├── ProtectedRoute.tsx     # Auth route guard
│   │   └── ThemeToggle.tsx        # Dark/light mode toggle
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Authentication state
│   │   ├── DemoContext.tsx        # Demo mode state
│   │   └── NotificationContext.tsx # Notifications state
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx         # Mobile detection
│   │   ├── use-toast.ts           # Toast notifications
│   │   ├── useAchievementSound.ts # Badge sound effects
│   │   ├── useCurrencyFormat.ts   # Currency formatting
│   │   ├── useDateFormat.ts       # Date formatting
│   │   ├── useDisplayCurrency.ts  # Display currency preference
│   │   ├── useIsAdmin.ts          # Admin role check
│   │   ├── usePageTracking.ts     # Page view analytics
│   │   ├── useParallax.ts         # Parallax effect
│   │   ├── usePaymentCelebration.ts # Payment success animation
│   │   ├── usePresence.ts         # Online users tracking
│   │   ├── useScrollAnimation.ts  # Scroll-based animation
│   │   ├── useSpeechRecognition.ts # Voice input
│   │   └── useSpeechSynthesis.ts  # Text-to-speech
│   │
│   ├── i18n/
│   │   ├── config.ts              # i18next configuration
│   │   └── locales/
│   │       ├── en.ts              # English translations
│   │       ├── tr.ts              # Turkish translations
│   │       └── de.ts              # German translations
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client (auto-generated)
│   │       └── types.ts           # Database types (auto-generated)
│   │
│   ├── lib/
│   │   ├── pushNotifications.ts   # Web Push utilities
│   │   └── utils.ts               # General utilities (cn, etc.)
│   │
│   ├── pages/
│   │   ├── Accounts.tsx           # Account management
│   │   ├── Admin.tsx              # Admin dashboard
│   │   ├── AIAdvisor.tsx          # AI financial advisor
│   │   ├── Auth.tsx               # Login/Register
│   │   ├── Calendar.tsx           # Payment calendar
│   │   ├── Cards.tsx              # Credit cards
│   │   ├── Contact.tsx            # Contact form
│   │   ├── Crypto.tsx             # Crypto portfolio
│   │   ├── Currency.tsx           # Currency/Gold holdings
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── Family.tsx             # Family finances
│   │   ├── FixedPayments.tsx      # Fixed payments
│   │   ├── Index.tsx              # Landing page
│   │   ├── Install.tsx            # PWA install guide
│   │   ├── Installments.tsx       # Installment tracking
│   │   ├── Loans.tsx              # Loan management
│   │   ├── NotFound.tsx           # 404 page
│   │   ├── PaymentHistory.tsx     # Payment history
│   │   ├── Privacy.tsx            # Privacy policy
│   │   ├── ProductAnalysis.tsx    # Receipt item analysis
│   │   ├── ReceiptHistory.tsx     # Receipt history
│   │   ├── Reports.tsx            # Financial reports
│   │   ├── Settings.tsx           # User settings
│   │   ├── Terms.tsx              # Terms of service
│   │   └── Transactions.tsx       # Transaction list
│   │
│   ├── types/
│   │   ├── account.ts             # Account type definitions
│   │   └── bank.ts                # Bank type definitions
│   │
│   ├── utils/
│   │   ├── categoryConfig.ts      # Category icons/colors
│   │   ├── freeOCR.ts             # Tesseract.js wrapper
│   │   └── reportExport.ts        # PDF/Excel export
│   │
│   ├── App.tsx                    # Root component
│   ├── App.css                    # Global styles
│   ├── index.css                  # Tailwind base + tokens
│   ├── main.tsx                   # Entry point
│   └── vite-env.d.ts              # Vite types
│
├── supabase/
│   ├── config.toml                # Supabase configuration
│   └── functions/
│       ├── admin-notification/
│       │   └── index.ts
│       ├── auth-logs/
│       │   └── index.ts
│       ├── card-payment-reminder/
│       │   └── index.ts
│       ├── contact-form/
│       │   └── index.ts
│       ├── crypto-prices/
│       │   └── index.ts
│       ├── delete-user/
│       │   └── index.ts
│       ├── email-tracking/
│       │   └── index.ts
│       ├── exchange-rates/
│       │   └── index.ts
│       ├── family-invite/
│       │   └── index.ts
│       ├── financial-chat/
│       │   └── index.ts
│       ├── financial-insights/
│       │   └── index.ts
│       ├── fixed-payment-reminder/
│       │   └── index.ts
│       ├── get-vapid-key/
│       │   └── index.ts
│       ├── installment-payment-reminder/
│       │   └── index.ts
│       ├── loan-payment-reminder/
│       │   └── index.ts
│       ├── log-login/
│       │   └── index.ts
│       ├── new-user-notification/
│       │   └── index.ts
│       ├── onboarding-emails/
│       │   └── index.ts
│       ├── receipt-scanner/
│       │   └── index.ts
│       ├── send-push-notification/
│       │   └── index.ts
│       ├── send-report-email/
│       │   └── index.ts
│       ├── support-request/
│       │   └── index.ts
│       ├── test-onboarding-email/
│       │   └── index.ts
│       ├── unsubscribe-onboarding/
│       │   └── index.ts
│       └── welcome-email/
│           └── index.ts
│
├── .env                           # Environment variables
├── eslint.config.js               # ESLint configuration
├── index.html                     # HTML template
├── package.json                   # Dependencies
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
└── vite.config.ts                 # Vite configuration
```

---

## 2. Component Detayları

### 2.1 AuthContext

```typescript
// src/contexts/AuthContext.tsx

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

// Flow:
// 1. App yüklendiğinde getSession() çağrılır
// 2. onAuthStateChange listener ile session değişiklikleri dinlenir
// 3. 401 hatalarında otomatik logout yapılır
// 4. Session varsa user bilgisi set edilir
```

### 2.2 ProtectedRoute

```typescript
// src/components/ProtectedRoute.tsx

// Flow:
// 1. AuthContext'ten user ve isLoading alınır
// 2. isLoading true ise loading spinner gösterilir
// 3. user null ise /auth sayfasına redirect
// 4. user varsa children render edilir

interface ProtectedRouteProps {
  children: React.ReactNode;
}
```

### 2.3 AdminRoute

```typescript
// src/components/AdminRoute.tsx

// Flow:
// 1. ProtectedRoute ile sarmalanır
// 2. useIsAdmin hook ile admin kontrolü yapılır
// 3. Admin değilse /dashboard'a redirect
// 4. Admin ise children render edilir

interface AdminRouteProps {
  children: React.ReactNode;
}
```

### 2.4 Dashboard Page

```typescript
// src/pages/Dashboard.tsx

// Widget yapısı:
// 1. DraggableWidgetContainer ile sürükle-bırak desteği
// 2. Her widget bağımsız React Query ile veri çeker
// 3. Widget sırası user_preferences tablosunda saklanır

// Widgets:
// - OverduePaymentsWidget: Gecikmiş ödemeler
// - UnpaidFixedPaymentsWidget: Ödenmemiş sabit ödemeler
// - UpcomingPaymentsWidget: Yaklaşan ödemeler
// - BudgetLimitsWidget: Bütçe limitleri
// - SavingsGoalsWidget: Tasarruf hedefleri
// - RecentTransactionsWidget: Son işlemler
// - CryptoWidget: Kripto özeti
// - CurrencyWidget: Döviz özeti
// - AIInsightsWidget: AI önerileri
// - BadgesWidget: Rozetler
// - ReceiptScannerWidget: Fiş tarama
// - EmailPreferencesWidget: Email ayarları
// - PushNotificationsWidget: Push ayarları
```

### 2.5 Transaction Flow

```typescript
// Transaction ekleme akışı:

// 1. TransactionDialog açılır
// 2. Form validasyonu (Zod schema)
// 3. Supabase insert çağrısı
// 4. check_budget_limit trigger tetiklenir
// 5. Limit aşımı varsa:
//    - notifications tablosuna kayıt
//    - send-push-notification edge function çağrılır
// 6. React Query cache invalidate
// 7. Toast bildirimi

interface TransactionFormData {
  amount: number;
  transaction_type: 'income' | 'expense';
  category: string;
  description?: string;
  transaction_date: Date;
  account_id?: string;
  card_id?: string;
  currency: string;
}
```

### 2.6 Receipt Scanner Flow

```typescript
// Fiş tarama akışı:

// 1. Kullanıcı resim yükler
// 2. Tesseract.js ile OCR işlemi (client-side)
// 3. receipt-scanner edge function'a gönderilir
// 4. AI (Gemini) ile ürün parse edilir
// 5. Sonuçlar kullanıcıya gösterilir
// 6. Onay ile:
//    - transactions tablosuna ana işlem
//    - receipt_items tablosuna detaylar
// 7. Storage'a resim yüklenir

interface ReceiptItem {
  name: string;
  brand?: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
```

---

## 3. Edge Function Detayları

### 3.1 financial-chat

```typescript
// supabase/functions/financial-chat/index.ts

// Flow:
// 1. JWT token doğrulama
// 2. User context oluşturma (accounts, transactions, etc.)
// 3. AI cache kontrolü
// 4. Cache miss ise Lovable AI çağrısı
// 5. Response cache'leme
// 6. Sonuç döndürme

interface ChatRequest {
  message: string;
  context?: {
    accounts?: Account[];
    transactions?: Transaction[];
    budgets?: BudgetLimit[];
  };
}

interface ChatResponse {
  response: string;
  cached: boolean;
}
```

### 3.2 send-push-notification

```typescript
// supabase/functions/send-push-notification/index.ts

// Flow:
// 1. push_notification_preferences tablosundan subscription alınır
// 2. enabled ve ilgili alert tipi kontrol edilir
// 3. Web Push API ile bildirim gönderilir
// 4. Hata durumunda subscription silinir (expired)

interface PushRequest {
  userId: string;
  title: string;
  message: string;
  url?: string;
  tag?: string;
  priority?: 'high' | 'medium' | 'low';
  notificationType: 'payment_reminder' | 'budget_alert' | 'achievement';
}
```

### 3.3 onboarding-emails

```typescript
// supabase/functions/onboarding-emails/index.ts

// Flow:
// 1. pg_cron ile günlük tetiklenir (07:00 UTC)
// 2. is_completed = false olan kayıtlar alınır
// 3. Her kullanıcı için:
//    - current_day kontrolü
//    - last_sent_at kontrolü (24 saat geçmiş mi)
//    - Email gönderimi (Resend)
//    - current_day increment
//    - Day 7 ise is_completed = true

// Email Serisi:
// Day 1: Hoş geldin
// Day 2: Hesap ekleme
// Day 3: Bütçe limitleri
// Day 4: Fiş tarama
// Day 5: Tasarruf hedefleri
// Day 6: AI asistan
// Day 7: Pro özellikler
```

### 3.4 log-login

```typescript
// supabase/functions/log-login/index.ts

// Flow:
// 1. Auth event'ten user bilgisi alınır
// 2. IP adresi ve user-agent alınır
// 3. IP geolocation API çağrısı
// 4. login_events tablosuna kayıt
// 5. check_suspicious_login trigger tetiklenir
// 6. Şüpheli ise suspicious_activity_alerts'e kayıt

interface LoginEvent {
  user_id: string;
  event_type: 'login' | 'logout';
  ip_address: string;
  user_agent: string;
  country_code?: string;
  city?: string;
}
```

---

## 4. Database Trigger Detayları

### 4.1 check_budget_limit

```sql
-- Tetiklenme: transactions INSERT sonrası
-- İşlem:
-- 1. Aynı kategori için budget_limit kontrolü
-- 2. Bu ay toplam harcama hesaplama
-- 3. alert_threshold aşımı kontrolü
-- 4. Aşım varsa:
--    - notifications INSERT
--    - send-push-notification HTTP call (pg_net)
```

### 4.2 check_negative_balance

```sql
-- Tetiklenme: accounts UPDATE sonrası
-- İşlem:
-- 1. Yeni balance kontrolü
-- 2. balance < 0 ise:
--    - notifications INSERT (negative_balance)
-- 3. balance + overdraft_limit < 0 ise:
--    - notifications INSERT (overdraft_exceeded)
```

### 4.3 check_suspicious_login

```sql
-- Tetiklenme: login_events INSERT öncesi
-- İşlem:
-- 1. Son login kaydı alınır
-- 2. Kontroller:
--    - 5 dakika içinde farklı IP
--    - 1 saat içinde farklı ülke (impossible travel)
--    - 24 saatte 5+ farklı IP
-- 3. Şüpheli ise:
--    - is_suspicious = true
--    - suspicious_activity_alerts INSERT
```

---

## 5. API Endpoint Yapısı

### 5.1 PostgREST (Otomatik)

```
GET    /rest/v1/accounts           # List accounts
POST   /rest/v1/accounts           # Create account
PATCH  /rest/v1/accounts?id=eq.X   # Update account
DELETE /rest/v1/accounts?id=eq.X   # Delete account

# Aynı pattern tüm tablolar için geçerli
# RLS politikaları otomatik uygulanır
```

### 5.2 Edge Functions

```
POST /functions/v1/financial-chat
POST /functions/v1/financial-insights
POST /functions/v1/receipt-scanner
POST /functions/v1/send-push-notification
POST /functions/v1/log-login
POST /functions/v1/welcome-email
POST /functions/v1/onboarding-emails
POST /functions/v1/send-report-email
POST /functions/v1/family-invite
POST /functions/v1/contact-form
POST /functions/v1/support-request
POST /functions/v1/delete-user

GET  /functions/v1/crypto-prices
GET  /functions/v1/exchange-rates
GET  /functions/v1/get-vapid-key
GET  /functions/v1/email-tracking  # Pixel tracking
GET  /functions/v1/unsubscribe-onboarding
```

---

## 6. State Management

### 6.1 Server State (React Query)

```typescript
// Query Keys:
const queryKeys = {
  accounts: ['accounts'],
  cards: ['credit-cards'],
  transactions: ['transactions'],
  fixedPayments: ['fixed-payments'],
  installments: ['installments'],
  loans: ['loans'],
  notifications: ['notifications'],
  budgetLimits: ['budget-limits'],
  savingsGoals: ['savings-goals'],
  cryptoHoldings: ['crypto-holdings'],
  cryptoPrices: ['crypto-prices'],
  exchangeRates: ['exchange-rates'],
  badges: ['badges'],
  familyGroup: ['family-group'],
};

// Stale time: 5 dakika (çoğu query için)
// Crypto/Exchange: 1 dakika
```

### 6.2 Client State (React Context)

```typescript
// AuthContext: User session
// DemoContext: Demo mode flag
// NotificationContext: Unread notification count
// ThemeContext: Dark/light mode (next-themes)
// i18n: Current language
```

---

## 7. Validation Schemas (Zod)

```typescript
// Transaction Schema
const transactionSchema = z.object({
  amount: z.number().positive(),
  transaction_type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  description: z.string().optional(),
  transaction_date: z.date(),
  account_id: z.string().uuid().optional(),
  card_id: z.string().uuid().optional(),
  currency: z.string().length(3),
});

// Account Schema
const accountSchema = z.object({
  name: z.string().min(1).max(100),
  bank_id: z.string().min(1),
  account_type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number(),
  currency: z.string().length(3),
  overdraft_limit: z.number().min(0).optional(),
  iban: z.string().optional(),
});

// Similar schemas for all entities...
```

---

## 8. Error Handling

### 8.1 Frontend

```typescript
// Global error boundary
// React Query error handling
// Toast notifications for user feedback
// Console logging for debugging

// 401 errors: Auto logout
// 403 errors: Access denied message
// 500 errors: Generic error message
// Network errors: Retry with exponential backoff
```

### 8.2 Backend (Edge Functions)

```typescript
// CORS headers on all responses
// Try-catch blocks
// Structured error responses:
{
  error: string;
  code?: string;
  details?: any;
}

// HTTP status codes:
// 200: Success
// 400: Bad request
// 401: Unauthorized
// 403: Forbidden
// 404: Not found
// 500: Internal server error
```

---

## 9. Testing Strategy

### 9.1 Önerilen Test Yapısı

```
tests/
├── unit/
│   ├── hooks/
│   ├── utils/
│   └── components/
├── integration/
│   ├── api/
│   └── pages/
└── e2e/
    ├── auth.spec.ts
    ├── dashboard.spec.ts
    └── transactions.spec.ts
```

### 9.2 Test Araçları (Önerilen)

| Tip | Araç |
|-----|------|
| Unit | Vitest |
| Component | React Testing Library |
| E2E | Playwright |
| API | Supertest |

---

## 10. Performance Metrics

### 10.1 Hedefler

| Metrik | Hedef |
|--------|-------|
| First Contentful Paint (FCP) | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.5s |
| Cumulative Layout Shift (CLS) | < 0.1 |

### 10.2 Optimizasyon Teknikleri

- Code splitting (React.lazy)
- Image optimization (lazy loading)
- Bundle size monitoring
- Memoization (useMemo, useCallback)
- Virtual scrolling (large lists)

---

**Doküman Versiyonu**: 1.0  
**Son Güncelleme**: 2026-01-13
