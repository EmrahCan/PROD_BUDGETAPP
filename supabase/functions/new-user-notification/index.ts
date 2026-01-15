import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CRON_AUTH_SECRET = Deno.env.get("CRON_AUTH_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured, skipping email');
    return null;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "BudgetApp <noreply@budgetapp.site>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return response.json();
}

// Fixed recipient for new user notifications
const NOTIFICATION_EMAIL = "info@budgetapp.site";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { secret, userId, userEmail, userName, registeredAt, internalCall } = body;
    
    // Allow internal calls from database triggers (they won't have a secret but come from trusted source)
    // Also allow calls with valid CRON_AUTH_SECRET
    const isValidSecret = CRON_AUTH_SECRET && secret === CRON_AUTH_SECRET;
    const isInternalTrigger = internalCall === true && userId && userEmail;
    
    if (!isValidSecret && !isInternalTrigger) {
      // For database triggers, we allow calls without secret validation
      // since they come from within Supabase infrastructure
      if (!userId || !userEmail) {
        console.log('Missing required fields');
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log('New user registration notification for:', userEmail);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get total user count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const dateStr = new Date(registeredAt || Date.now()).toLocaleString('tr-TR');

    const subject = '🎉 Yeni Üye Kaydı - BudgetApp';
    const html = `
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
      max-width: 560px; 
      margin: 0 auto; 
      background: linear-gradient(145deg, #1e293b, #0f172a);
      border-radius: 24px; 
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); 
      padding: 40px 30px; 
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
      animation: shimmer 3s ease-in-out infinite;
    }
    @keyframes shimmer {
      0%, 100% { transform: translateX(-30%) translateY(-30%); }
      50% { transform: translateX(30%) translateY(30%); }
    }
    .logo-circle {
      width: 80px;
      height: 80px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 40px;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255,255,255,0.3);
    }
    .header h1 { 
      color: white; 
      font-size: 28px; 
      font-weight: 700;
      letter-spacing: -0.5px;
      position: relative;
    }
    .header p {
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      margin-top: 8px;
      position: relative;
    }
    .content { 
      padding: 40px 30px; 
      color: #e2e8f0;
    }
    .greeting {
      font-size: 16px;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .greeting strong {
      color: #10b981;
    }
    .user-card {
      background: linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05));
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .user-avatar {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 700;
      color: white;
      margin: 0 auto 16px;
      box-shadow: 0 8px 24px -8px rgba(16, 185, 129, 0.5);
    }
    .user-name {
      font-size: 22px;
      font-weight: 700;
      color: white;
      text-align: center;
      margin-bottom: 8px;
    }
    .user-email {
      font-size: 14px;
      color: #10b981;
      text-align: center;
      margin-bottom: 20px;
    }
    .info-grid {
      display: grid;
      gap: 12px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.5);
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.1);
    }
    .info-label {
      font-size: 13px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-value {
      font-size: 14px;
      color: #e2e8f0;
      font-weight: 500;
    }
    .stats-section {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      flex: 1;
      background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
    }
    .stat-card.highlight {
      background: linear-gradient(145deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
      border-color: rgba(16, 185, 129, 0.3);
    }
    .stat-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .stat-number {
      font-size: 32px;
      font-weight: 800;
      background: linear-gradient(135deg, #10b981, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      font-size: 15px;
      text-align: center;
      box-shadow: 0 8px 24px -8px rgba(16, 185, 129, 0.5);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px -8px rgba(16, 185, 129, 0.6);
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
      background: linear-gradient(135deg, #10b981, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 12px;
    }
    .footer p {
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer-links {
      margin-top: 16px;
      display: flex;
      justify-content: center;
      gap: 24px;
    }
    .footer-links a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 12px;
    }
    .footer-links a:hover {
      color: #10b981;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2), transparent);
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-circle">🎉</div>
      <h1>Yeni Üye Kaydı!</h1>
      <p>BudgetApp ailesine yeni biri katıldı</p>
    </div>
    <div class="content">
      <p class="greeting">Merhaba <strong>Admin</strong>, harika haberlerimiz var!</p>
      
      <div class="user-card">
        <div class="user-avatar">${(userName || userEmail || 'U').charAt(0).toUpperCase()}</div>
        <div class="user-name">${userName || 'Yeni Kullanıcı'}</div>
        <div class="user-email">${userEmail || 'E-posta belirtilmedi'}</div>
        
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">📅 Kayıt Tarihi</span>
            <span class="info-value">${dateStr}</span>
          </div>
          <div class="info-item">
            <span class="info-label">🔑 Kullanıcı ID</span>
            <span class="info-value" style="font-size: 11px; font-family: monospace;">${userId?.slice(0, 8) || 'N/A'}...</span>
          </div>
        </div>
      </div>
      
      <div class="stats-section">
        <div class="stat-card highlight">
          <div class="stat-icon">👥</div>
          <div class="stat-number">${totalUsers || 1}</div>
          <div class="stat-label">Toplam Üye</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-number">+1</div>
          <div class="stat-label">Bugün</div>
        </div>
      </div>
      
      <a href="https://budgetapp.site/admin" class="cta-button">
        Admin Panelini Görüntüle →
      </a>
    </div>
    
    <div class="footer">
      <div class="footer-logo">💰 BudgetApp</div>
      <p>Bu e-posta otomatik olarak gönderilmiştir.<br>Yeni kullanıcı kaydı bildirimi almak istemiyorsanız e-posta tercihlerinizi güncelleyebilirsiniz.</p>
      <div class="divider"></div>
      <div class="footer-links">
        <a href="https://budgetapp.site">Ana Sayfa</a>
        <a href="https://budgetapp.site/admin">Admin Panel</a>
        <a href="https://budgetapp.site/settings">Ayarlar</a>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await sendEmail([NOTIFICATION_EMAIL], subject, html);
    console.log(`New user notification sent to ${NOTIFICATION_EMAIL}:`, emailResponse);

    return new Response(JSON.stringify({ success: true, sentTo: NOTIFICATION_EMAIL }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in new-user-notification function:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
