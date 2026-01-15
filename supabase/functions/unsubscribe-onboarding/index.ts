import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    const token = url.searchParams.get('token');

    if (!email) {
      return new Response(generateHtmlResponse('error', 'tr'), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Simple token validation (base64 of email)
    const expectedToken = btoa(email).replace(/=/g, '');
    if (token !== expectedToken) {
      return new Response(generateHtmlResponse('invalid', 'tr'), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Mark onboarding as completed (stops future emails)
    const { error } = await supabase
      .from('onboarding_emails')
      .update({ is_completed: true })
      .eq('user_email', email);

    if (error) {
      console.error('Unsubscribe error:', error);
      return new Response(generateHtmlResponse('error', 'tr'), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    console.log(`User ${email} unsubscribed from onboarding emails`);

    return new Response(generateHtmlResponse('success', 'tr'), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    console.error("Error in unsubscribe function:", error);
    return new Response(generateHtmlResponse('error', 'tr'), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
});

function generateHtmlResponse(status: 'success' | 'error' | 'invalid', lang: string): string {
  const content = {
    success: {
      title: lang === 'tr' ? 'Abonelikten Çıkıldı' : 'Unsubscribed',
      message: lang === 'tr' 
        ? 'Onboarding e-postalarından başarıyla çıkış yaptınız. Artık bu seriden e-posta almayacaksınız.' 
        : 'You have successfully unsubscribed from onboarding emails.',
      icon: '✅'
    },
    error: {
      title: lang === 'tr' ? 'Bir Hata Oluştu' : 'An Error Occurred',
      message: lang === 'tr' 
        ? 'İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.' 
        : 'An error occurred during the process. Please try again later.',
      icon: '❌'
    },
    invalid: {
      title: lang === 'tr' ? 'Geçersiz Link' : 'Invalid Link',
      message: lang === 'tr' 
        ? 'Bu abonelik iptal linki geçersiz veya süresi dolmuş.' 
        : 'This unsubscribe link is invalid or has expired.',
      icon: '⚠️'
    }
  };

  const c = content[status];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${c.title} - BudgetApp</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { 
      max-width: 480px; 
      background: linear-gradient(145deg, #1e293b, #0f172a);
      border-radius: 24px; 
      padding: 48px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h1 { 
      color: ${status === 'success' ? '#10b981' : status === 'error' ? '#ef4444' : '#f59e0b'}; 
      font-size: 28px; 
      font-weight: 700;
      margin-bottom: 16px;
    }
    p {
      color: #94a3b8;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 15px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }
    .footer-logo {
      font-size: 20px;
      font-weight: 700;
      color: #10b981;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${c.icon}</div>
    <h1>${c.title}</h1>
    <p>${c.message}</p>
    <a href="https://budgetapp.site" class="btn">
      ${lang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}
    </a>
    <div class="footer">
      <div class="footer-logo">💰 BudgetApp</div>
    </div>
  </div>
</body>
</html>
  `;
}
