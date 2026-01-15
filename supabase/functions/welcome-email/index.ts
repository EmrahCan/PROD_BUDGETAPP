import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LINKEDIN_URL = "https://www.linkedin.com/company/buggetapp";
const LOGO_URL = "https://budgetapp.site/logo.png";

interface WelcomeEmailRequest {
  userEmail: string;
  userName: string;
  language: string;
}

const getEmailContent = (userName: string, language: string) => {
  const name = userName || (language === 'tr' ? 'Değerli Kullanıcı' : language === 'de' ? 'Geschätzter Benutzer' : 'Valued User');
  
  const content = {
    tr: {
      subject: '🎉 BudgetApp\'e Hoş Geldiniz!',
      greeting: `Merhaba ${name}!`,
      welcome: 'BudgetApp ailesine hoş geldiniz!',
      intro: 'Finansal özgürlüğe giden yolculuğunuzda size eşlik etmekten mutluluk duyuyoruz.',
      features: [
        { icon: '📊', title: 'Harcamalarınızı Takip Edin', desc: 'Tüm gelir ve giderlerinizi kategorilere ayırarak kolayca yönetin.' },
        { icon: '🎯', title: 'Tasarruf Hedefleri Belirleyin', desc: 'Hayallerinize ulaşmak için hedefler koyun ve ilerlemenizi izleyin.' },
        { icon: '🤖', title: 'AI Destekli Öneriler', desc: 'Yapay zeka ile kişiselleştirilmiş finansal öneriler alın.' },
        { icon: '📱', title: 'Her Yerden Erişin', desc: 'Masaüstü ve mobilde kesintisiz deneyim yaşayın.' }
      ],
      cta: 'Hemen Başlayın',
      linkedinCta: '🔗 Bizi LinkedIn\'de takip edin ve en güncel finansal ipuçlarından haberdar olun!',
      footer: 'Sorularınız mı var? Bize her zaman ulaşabilirsiniz.',
      team: 'BudgetApp Ekibi',
      onboardingNote: 'Önümüzdeki 7 gün boyunca size faydalı ipuçları göndereceğiz!'
    },
    en: {
      subject: '🎉 Welcome to BudgetApp!',
      greeting: `Hello ${name}!`,
      welcome: 'Welcome to the BudgetApp family!',
      intro: 'We are delighted to accompany you on your journey to financial freedom.',
      features: [
        { icon: '📊', title: 'Track Your Expenses', desc: 'Easily manage all your income and expenses by categories.' },
        { icon: '🎯', title: 'Set Savings Goals', desc: 'Set goals to reach your dreams and track your progress.' },
        { icon: '🤖', title: 'AI-Powered Insights', desc: 'Get personalized financial recommendations with artificial intelligence.' },
        { icon: '📱', title: 'Access Anywhere', desc: 'Enjoy seamless experience on desktop and mobile.' }
      ],
      cta: 'Get Started',
      linkedinCta: '🔗 Follow us on LinkedIn and stay updated with the latest financial tips!',
      footer: 'Have questions? You can always reach out to us.',
      team: 'The BudgetApp Team',
      onboardingNote: 'We\'ll send you helpful tips over the next 7 days!'
    },
    de: {
      subject: '🎉 Willkommen bei BudgetApp!',
      greeting: `Hallo ${name}!`,
      welcome: 'Willkommen in der BudgetApp-Familie!',
      intro: 'Wir freuen uns, Sie auf Ihrem Weg zur finanziellen Freiheit zu begleiten.',
      features: [
        { icon: '📊', title: 'Ausgaben Verfolgen', desc: 'Verwalten Sie alle Einnahmen und Ausgaben einfach nach Kategorien.' },
        { icon: '🎯', title: 'Sparziele Setzen', desc: 'Setzen Sie Ziele, um Ihre Träume zu erreichen, und verfolgen Sie Ihren Fortschritt.' },
        { icon: '🤖', title: 'KI-gestützte Einblicke', desc: 'Erhalten Sie personalisierte Finanzempfehlungen mit künstlicher Intelligenz.' },
        { icon: '📱', title: 'Überall Zugreifen', desc: 'Genießen Sie ein nahtloses Erlebnis auf Desktop und Mobilgeräten.' }
      ],
      cta: 'Jetzt Starten',
      linkedinCta: '🔗 Folgen Sie uns auf LinkedIn und bleiben Sie über die neuesten Finanztipps informiert!',
      footer: 'Haben Sie Fragen? Sie können uns jederzeit kontaktieren.',
      team: 'Das BudgetApp-Team',
      onboardingNote: 'Wir senden Ihnen in den nächsten 7 Tagen hilfreiche Tipps!'
    }
  };

  return content[language as keyof typeof content] || content.en;
};

const generateEmailHtml = (userName: string, language: string) => {
  const c = getEmailContent(userName, language);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 40px 20px;
      min-height: 100vh;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: linear-gradient(145deg, #1e293b, #0f172a);
      border-radius: 24px; 
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); 
      padding: 50px 30px; 
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 50%);
    }
    .logo {
      width: 100px;
      height: 100px;
      background: rgba(255,255,255,0.2);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      backdrop-filter: blur(10px);
      border: 3px solid rgba(255,255,255,0.3);
      padding: 15px;
    }
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .header h1 { 
      color: white; 
      font-size: 32px; 
      font-weight: 800;
      letter-spacing: -0.5px;
      position: relative;
    }
    .header p {
      color: rgba(255,255,255,0.9);
      font-size: 16px;
      margin-top: 12px;
      position: relative;
    }
    .content { 
      padding: 48px 36px; 
      color: #e2e8f0;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 16px;
    }
    .intro {
      font-size: 16px;
      color: #94a3b8;
      margin-bottom: 32px;
      line-height: 1.6;
    }
    .onboarding-note {
      background: linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05));
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    .onboarding-note p {
      color: #a5b4fc;
      font-size: 14px;
    }
    .features-grid {
      display: grid;
      gap: 16px;
      margin-bottom: 32px;
    }
    .feature-card {
      background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .feature-card:hover {
      border-color: rgba(16, 185, 129, 0.3);
    }
    .feature-icon {
      font-size: 28px;
      flex-shrink: 0;
    }
    .feature-content h3 {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .feature-content p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .cta-button {
      display: block;
      width: 100%;
      padding: 18px 24px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      text-decoration: none;
      border-radius: 14px;
      font-weight: 700;
      font-size: 16px;
      text-align: center;
      box-shadow: 0 8px 24px -8px rgba(16, 185, 129, 0.5);
      margin-bottom: 24px;
    }
    .linkedin-section {
      background: linear-gradient(145deg, rgba(0, 119, 181, 0.15), rgba(0, 119, 181, 0.05));
      border: 1px solid rgba(0, 119, 181, 0.3);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .linkedin-section p {
      color: #94a3b8;
      font-size: 14px;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .linkedin-btn {
      display: inline-block;
      background: #0077b5;
      color: white;
      padding: 12px 28px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2), transparent);
      margin: 24px 0;
    }
    .footer { 
      background: rgba(15, 23, 42, 0.8);
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      padding: 32px 36px; 
      text-align: center; 
    }
    .footer-logo {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #10b981, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 16px;
    }
    .footer p {
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
    }
    .team-signature {
      margin-top: 24px;
      font-size: 16px;
      color: #94a3b8;
      font-weight: 500;
    }
    .footer-links {
      margin-top: 24px;
      display: flex;
      justify-content: center;
      gap: 24px;
    }
    .footer-links a {
      color: #10b981;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    .social-icons {
      margin-top: 20px;
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .social-icon {
      width: 40px;
      height: 40px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      font-size: 16px;
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .social-icon.linkedin {
      background: rgba(0, 119, 181, 0.1);
      border-color: rgba(0, 119, 181, 0.2);
      color: #0077b5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="${LOGO_URL}" alt="BudgetApp Logo" />
      </div>
      <h1>${c.welcome}</h1>
      <p>BudgetApp</p>
    </div>
    <div class="content">
      <p class="greeting">${c.greeting}</p>
      <p class="intro">${c.intro}</p>
      
      <div class="onboarding-note">
        <p>📧 ${c.onboardingNote}</p>
      </div>
      
      <div class="features-grid">
        ${c.features.map(f => `
        <div class="feature-card">
          <div class="feature-icon">${f.icon}</div>
          <div class="feature-content">
            <h3>${f.title}</h3>
            <p>${f.desc}</p>
          </div>
        </div>
        `).join('')}
      </div>
      
      <a href="https://budgetapp.site/dashboard" class="cta-button">
        ${c.cta} →
      </a>
      
      <div class="linkedin-section">
        <p>${c.linkedinCta}</p>
        <a href="${LINKEDIN_URL}" class="linkedin-btn">
          LinkedIn'de Takip Et
        </a>
      </div>
      
      <p style="text-align: center; color: #64748b; font-size: 14px;">
        ${c.footer}
      </p>
    </div>
    
    <div class="footer">
      <div class="footer-logo">💰 BudgetApp</div>
      <p class="team-signature">❤️ ${c.team}</p>
      <div class="divider"></div>
      <div class="footer-links">
        <a href="https://budgetapp.site">Website</a>
        <a href="https://budgetapp.site/contact">Contact</a>
        <a href="https://budgetapp.site/privacy">Privacy</a>
      </div>
      <div class="social-icons">
        <a href="${LINKEDIN_URL}" class="social-icon linkedin">in</a>
        <a href="https://budgetapp.site" class="social-icon">🌐</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userEmail, userName, language, userId } = body as WelcomeEmailRequest & { userId?: string };

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'User email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured, skipping welcome email');
      return new Response(JSON.stringify({ success: false, reason: 'No API key' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const lang = language || 'en';
    const emailContent = getEmailContent(userName, lang);
    const html = generateEmailHtml(userName, lang);

    console.log(`Sending welcome email to ${userEmail} in ${lang}`);

    // Send welcome email
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BudgetApp <noreply@budgetapp.site>",
        to: [userEmail],
        subject: emailContent.subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const emailResponse = await response.json();
    console.log('Welcome email sent successfully:', emailResponse);

    // Register user for onboarding emails if userId provided
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase.from('onboarding_emails').upsert({
          user_id: userId,
          user_email: userEmail,
          user_name: userName || null,
          language: lang,
          current_day: 1,
          is_completed: false
        }, { onConflict: 'user_id' });

        console.log('User registered for onboarding emails');
      } catch (onboardingError) {
        console.error('Failed to register for onboarding:', onboardingError);
        // Don't fail the welcome email if onboarding registration fails
      }
    }

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in welcome-email function:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
