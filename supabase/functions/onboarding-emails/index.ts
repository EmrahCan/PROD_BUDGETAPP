import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CRON_AUTH_SECRET = Deno.env.get("CRON_AUTH_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LINKEDIN_URL = "https://www.linkedin.com/company/buggetapp";
const LOGO_URL = "https://budgetapp.site/logo.png";

// 7-day onboarding tips in 3 languages
const onboardingContent = {
  tr: {
    subject: (day: number) => `💡 BudgetApp İpucu ${day}/7: ${getDayTitle(day, 'tr')}`,
    greeting: (name: string) => `Merhaba ${name}!`,
    dayTitles: [
      'Hesaplarınızı Ekleyin',
      'İlk İşleminizi Kaydedin',
      'Kategorileri Keşfedin',
      'Bütçe Limiti Belirleyin',
      'Tasarruf Hedefi Oluşturun',
      'AI Danışmanınızla Tanışın',
      'Bildirimleri Aktifleştirin'
    ],
    dayContent: [
      {
        title: 'Hesaplarınızı Ekleyin',
        tip: 'Tüm banka hesaplarınızı ve kredi kartlarınızı ekleyerek finansal durumunuzun tam resmini görün.',
        action: 'Şimdi hesap eklemek için Hesaplar sayfasını ziyaret edin.',
        icon: '🏦'
      },
      {
        title: 'İlk İşleminizi Kaydedin',
        tip: 'Gelir ve giderlerinizi düzenli olarak kaydetmek, harcama alışkanlıklarınızı anlamanın ilk adımıdır.',
        action: 'İşlemler sayfasından yeni bir işlem ekleyin.',
        icon: '💳'
      },
      {
        title: 'Kategorileri Keşfedin',
        tip: '55+ kategori ile harcamalarınızı detaylı şekilde sınıflandırın. Raporlarınız çok daha anlamlı olacak!',
        action: 'İşlem eklerken farklı kategorileri deneyin.',
        icon: '📊'
      },
      {
        title: 'Bütçe Limiti Belirleyin',
        tip: 'Kategorilere göre aylık bütçe limitleri belirleyin ve aşım uyarıları alın.',
        action: 'Dashboard\'daki Bütçe Limitleri widget\'ını kullanın.',
        icon: '🎯'
      },
      {
        title: 'Tasarruf Hedefi Oluşturun',
        tip: 'Tatil, araba veya acil durum fonu için hedefler belirleyin ve ilerlemenizi takip edin.',
        action: 'AI Danışman sayfasından hedef önerileri alabilirsiniz.',
        icon: '💰'
      },
      {
        title: 'AI Danışmanınızla Tanışın',
        tip: 'Yapay zeka destekli finansal analiz ve kişiselleştirilmiş öneriler alın.',
        action: 'AI Danışman sayfasını ziyaret edin ve sohbet edin.',
        icon: '🤖'
      },
      {
        title: 'Bildirimleri Aktifleştirin',
        tip: 'Ödeme hatırlatıcıları ve bütçe uyarıları ile hiçbir şeyi kaçırmayın.',
        action: 'Ayarlar sayfasından bildirim tercihlerinizi yapılandırın.',
        icon: '🔔'
      }
    ],
    linkedinCta: 'Bizi LinkedIn\'de takip edin ve finansal ipuçları alın!',
    footer: 'Bu e-posta 7 günlük başlangıç serisinin bir parçasıdır.',
    team: 'BudgetApp Ekibi'
  },
  en: {
    subject: (day: number) => `💡 BudgetApp Tip ${day}/7: ${getDayTitle(day, 'en')}`,
    greeting: (name: string) => `Hello ${name}!`,
    dayTitles: [
      'Add Your Accounts',
      'Record Your First Transaction',
      'Explore Categories',
      'Set a Budget Limit',
      'Create a Savings Goal',
      'Meet Your AI Advisor',
      'Enable Notifications'
    ],
    dayContent: [
      {
        title: 'Add Your Accounts',
        tip: 'Add all your bank accounts and credit cards to see the complete picture of your finances.',
        action: 'Visit the Accounts page to add an account now.',
        icon: '🏦'
      },
      {
        title: 'Record Your First Transaction',
        tip: 'Regularly recording your income and expenses is the first step to understanding your spending habits.',
        action: 'Add a new transaction from the Transactions page.',
        icon: '💳'
      },
      {
        title: 'Explore Categories',
        tip: 'Classify your expenses in detail with 55+ categories. Your reports will be much more meaningful!',
        action: 'Try different categories when adding transactions.',
        icon: '📊'
      },
      {
        title: 'Set a Budget Limit',
        tip: 'Set monthly budget limits by category and receive alerts when you exceed them.',
        action: 'Use the Budget Limits widget on the Dashboard.',
        icon: '🎯'
      },
      {
        title: 'Create a Savings Goal',
        tip: 'Set goals for vacation, car, or emergency fund and track your progress.',
        action: 'Get goal suggestions from the AI Advisor page.',
        icon: '💰'
      },
      {
        title: 'Meet Your AI Advisor',
        tip: 'Get AI-powered financial analysis and personalized recommendations.',
        action: 'Visit the AI Advisor page and start chatting.',
        icon: '🤖'
      },
      {
        title: 'Enable Notifications',
        tip: 'Never miss anything with payment reminders and budget alerts.',
        action: 'Configure your notification preferences in Settings.',
        icon: '🔔'
      }
    ],
    linkedinCta: 'Follow us on LinkedIn for financial tips!',
    footer: 'This email is part of your 7-day getting started series.',
    team: 'The BudgetApp Team'
  },
  de: {
    subject: (day: number) => `💡 BudgetApp Tipp ${day}/7: ${getDayTitle(day, 'de')}`,
    greeting: (name: string) => `Hallo ${name}!`,
    dayTitles: [
      'Fügen Sie Ihre Konten hinzu',
      'Erfassen Sie Ihre erste Transaktion',
      'Entdecken Sie Kategorien',
      'Setzen Sie ein Budgetlimit',
      'Erstellen Sie ein Sparziel',
      'Treffen Sie Ihren KI-Berater',
      'Aktivieren Sie Benachrichtigungen'
    ],
    dayContent: [
      {
        title: 'Fügen Sie Ihre Konten hinzu',
        tip: 'Fügen Sie alle Ihre Bankkonten und Kreditkarten hinzu, um das vollständige Bild Ihrer Finanzen zu sehen.',
        action: 'Besuchen Sie die Konten-Seite, um ein Konto hinzuzufügen.',
        icon: '🏦'
      },
      {
        title: 'Erfassen Sie Ihre erste Transaktion',
        tip: 'Das regelmäßige Erfassen Ihrer Einnahmen und Ausgaben ist der erste Schritt zum Verständnis Ihrer Ausgabengewohnheiten.',
        action: 'Fügen Sie eine neue Transaktion auf der Transaktions-Seite hinzu.',
        icon: '💳'
      },
      {
        title: 'Entdecken Sie Kategorien',
        tip: 'Klassifizieren Sie Ihre Ausgaben detailliert mit 55+ Kategorien. Ihre Berichte werden viel aussagekräftiger!',
        action: 'Probieren Sie verschiedene Kategorien beim Hinzufügen von Transaktionen.',
        icon: '📊'
      },
      {
        title: 'Setzen Sie ein Budgetlimit',
        tip: 'Setzen Sie monatliche Budgetlimits nach Kategorie und erhalten Sie Warnungen bei Überschreitung.',
        action: 'Verwenden Sie das Budgetlimits-Widget auf dem Dashboard.',
        icon: '🎯'
      },
      {
        title: 'Erstellen Sie ein Sparziel',
        tip: 'Setzen Sie Ziele für Urlaub, Auto oder Notfallfonds und verfolgen Sie Ihren Fortschritt.',
        action: 'Holen Sie sich Zielvorschläge von der KI-Berater-Seite.',
        icon: '💰'
      },
      {
        title: 'Treffen Sie Ihren KI-Berater',
        tip: 'Erhalten Sie KI-gestützte Finanzanalysen und personalisierte Empfehlungen.',
        action: 'Besuchen Sie die KI-Berater-Seite und beginnen Sie zu chatten.',
        icon: '🤖'
      },
      {
        title: 'Aktivieren Sie Benachrichtigungen',
        tip: 'Verpassen Sie nichts mit Zahlungserinnerungen und Budgetwarnungen.',
        action: 'Konfigurieren Sie Ihre Benachrichtigungseinstellungen in den Einstellungen.',
        icon: '🔔'
      }
    ],
    linkedinCta: 'Folgen Sie uns auf LinkedIn für Finanztipps!',
    footer: 'Diese E-Mail ist Teil Ihrer 7-tägigen Startserie.',
    team: 'Das BudgetApp-Team'
  }
};

function getDayTitle(day: number, lang: string): string {
  const content = onboardingContent[lang as keyof typeof onboardingContent] || onboardingContent.en;
  return content.dayTitles[day - 1] || '';
}

function generateTrackingUrl(email: string, emailType: string, eventType: string, redirectUrl?: string): string {
  const token = btoa(email);
  const baseUrl = 'https://lmsqashicqqgizrkbyjv.supabase.co/functions/v1/email-tracking';
  const params = new URLSearchParams({
    email,
    type: emailType,
    event: eventType,
    token
  });
  if (redirectUrl) {
    params.set('url', redirectUrl);
  }
  return `${baseUrl}?${params.toString()}`;
}

function generateEmailHtml(day: number, userName: string, language: string, userEmail: string): string {
  const lang = language as keyof typeof onboardingContent;
  const c = onboardingContent[lang] || onboardingContent.en;
  const dayContent = c.dayContent[day - 1];
  const name = userName || (lang === 'tr' ? 'Değerli Kullanıcı' : lang === 'de' ? 'Geschätzter Benutzer' : 'Valued User');
  
  const emailType = `onboarding_day_${day}`;
  
  // Generate tracking URLs
  const trackingPixelUrl = generateTrackingUrl(userEmail, emailType, 'open');
  const dashboardUrl = generateTrackingUrl(userEmail, emailType, 'click', 'https://budgetapp.site/dashboard');
  const linkedinUrl = generateTrackingUrl(userEmail, emailType, 'click', LINKEDIN_URL);
  const websiteUrl = generateTrackingUrl(userEmail, emailType, 'click', 'https://budgetapp.site');
  
  // Generate unsubscribe token (base64 of email without padding)
  const unsubscribeToken = btoa(userEmail).replace(/=/g, '');
  const unsubscribeUrl = `https://lmsqashicqqgizrkbyjv.supabase.co/functions/v1/unsubscribe-onboarding?email=${encodeURIComponent(userEmail)}&token=${unsubscribeToken}`;
  
  const unsubscribeText = lang === 'tr' 
    ? 'Bu e-postaları almak istemiyorsanız' 
    : lang === 'de' 
      ? 'Wenn Sie diese E-Mails nicht mehr erhalten möchten' 
      : 'If you don\'t want to receive these emails';
  
  const unsubscribeLinkText = lang === 'tr' ? 'abonelikten çıkın' : lang === 'de' ? 'abmelden' : 'unsubscribe';
  
  const progressDots = Array.from({ length: 7 }, (_, i) => 
    `<div style="width: 12px; height: 12px; border-radius: 50%; background: ${i < day ? '#10b981' : 'rgba(148, 163, 184, 0.3)'}; ${i === day - 1 ? 'box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);' : ''}"></div>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 40px 20px;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: linear-gradient(145deg, #1e293b, #0f172a);
      border-radius: 24px; 
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .header { 
      background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
      padding: 40px 30px; 
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      margin: 0 auto 20px;
      background: rgba(255,255,255,0.2);
      padding: 10px;
    }
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .day-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 14px;
      color: white;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .header h1 { 
      color: white; 
      font-size: 28px; 
      font-weight: 700;
    }
    .progress-bar {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
    }
    .content { 
      padding: 40px 30px; 
      color: #e2e8f0;
    }
    .greeting {
      font-size: 20px;
      color: #ffffff;
      margin-bottom: 24px;
    }
    .tip-card {
      background: linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05));
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 24px;
    }
    .tip-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .tip-title {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
    }
    .tip-text {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .tip-action {
      font-size: 14px;
      color: #10b981;
      font-weight: 500;
    }
    .cta-button {
      display: block;
      width: 100%;
      padding: 16px 24px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      margin-bottom: 24px;
    }
    .linkedin-section {
      background: rgba(0, 119, 181, 0.1);
      border: 1px solid rgba(0, 119, 181, 0.2);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
    }
    .linkedin-section p {
      color: #94a3b8;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .linkedin-btn {
      display: inline-block;
      background: #0077b5;
      color: white;
      padding: 10px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
    .footer { 
      background: rgba(15, 23, 42, 0.8);
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      padding: 24px 30px; 
      text-align: center; 
    }
    .footer-logo {
      font-size: 20px;
      font-weight: 700;
      color: #10b981;
      margin-bottom: 12px;
    }
    .footer p {
      font-size: 12px;
      color: #64748b;
    }
    .social-links {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 16px;
    }
    .social-link {
      width: 36px;
      height: 36px;
      background: rgba(148, 163, 184, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="${LOGO_URL}" alt="BudgetApp Logo" />
      </div>
      <div class="day-badge">${lang === 'tr' ? 'Gün' : lang === 'de' ? 'Tag' : 'Day'} ${day}/7</div>
      <h1>${dayContent.title}</h1>
      <div class="progress-bar">
        ${progressDots}
      </div>
    </div>
    <div class="content">
      <p class="greeting">${c.greeting(name)}</p>
      
      <div class="tip-card">
        <div class="tip-icon">${dayContent.icon}</div>
        <h2 class="tip-title">${dayContent.title}</h2>
        <p class="tip-text">${dayContent.tip}</p>
        <p class="tip-action">👉 ${dayContent.action}</p>
      </div>
      
      <a href="${dashboardUrl}" class="cta-button">
        ${lang === 'tr' ? 'Uygulamaya Git' : lang === 'de' ? 'Zur App' : 'Go to App'} →
      </a>
      
      <div class="linkedin-section">
        <p>${c.linkedinCta}</p>
        <a href="${linkedinUrl}" class="linkedin-btn">
          🔗 LinkedIn
        </a>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-logo">💰 BudgetApp</div>
      <p>${c.footer}</p>
      <p style="margin-top: 8px;">❤️ ${c.team}</p>
      <div class="social-links">
        <a href="${linkedinUrl}" class="social-link">in</a>
        <a href="${websiteUrl}" class="social-link">🌐</a>
      </div>
      <p style="margin-top: 16px; font-size: 11px; color: #475569;">
        ${unsubscribeText}, <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">${unsubscribeLinkText}</a>.
      </p>
      <!-- Tracking Pixel -->
      <img src="${trackingPixelUrl}" alt="" width="1" height="1" style="display:none;border:0;" />
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try to parse body for secret
    let providedSecret = '';
    try {
      const body = await req.json();
      providedSecret = body.secret || '';
    } catch {
      // No body or invalid JSON - that's ok for internal calls
    }

    // Validate: either CRON_AUTH_SECRET matches OR get secret from system_settings table
    let isAuthorized = false;
    
    // First try environment variable
    if (CRON_AUTH_SECRET && providedSecret === CRON_AUTH_SECRET) {
      isAuthorized = true;
      console.log('Authorized via environment variable');
    }
    
    // Then try database secret
    if (!isAuthorized && providedSecret) {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'cron_auth_secret')
        .single();
      
      if (settingsData && settingsData.value === providedSecret) {
        isAuthorized = true;
        console.log('Authorized via database secret');
      }
    }
    
    if (!isAuthorized) {
      console.log('Authorization failed - secret mismatch');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ success: false, reason: 'No API key' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get users who need onboarding emails
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: pendingUsers, error: fetchError } = await supabase
      .from('onboarding_emails')
      .select('*')
      .eq('is_completed', false)
      .lte('current_day', 7)
      .or(`last_sent_at.is.null,last_sent_at.lt.${yesterday.toISOString()}`);

    if (fetchError) {
      throw new Error(`Failed to fetch pending users: ${fetchError.message}`);
    }

    console.log(`Found ${pendingUsers?.length || 0} users for onboarding emails`);

    let sentCount = 0;
    const errors: string[] = [];

    // Helper function to add delay between emails (Resend has 2 req/sec limit)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const user of pendingUsers || []) {
      try {
        const lang = user.language as keyof typeof onboardingContent || 'en';
        const content = onboardingContent[lang] || onboardingContent.en;
        const html = generateEmailHtml(user.current_day, user.user_name, user.language, user.user_email);

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "BudgetApp <noreply@budgetapp.site>",
            to: [user.user_email],
            subject: content.subject(user.current_day),
            html,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Resend error: ${error}`);
        }

        // Update user progress
        const newDay = user.current_day + 1;
        const isCompleted = newDay > 7;

        await supabase
          .from('onboarding_emails')
          .update({
            current_day: newDay,
            last_sent_at: new Date().toISOString(),
            is_completed: isCompleted
          })
          .eq('id', user.id);

        sentCount++;
        console.log(`Sent day ${user.current_day} email to ${user.user_email}`);

        // Add 600ms delay between emails to stay under Resend rate limit (2 req/sec)
        await delay(600);

      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${user.user_email}: ${msg}`);
        console.error(`Failed for ${user.user_email}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sentCount,
      totalPending: pendingUsers?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in onboarding-emails function:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
