import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

async function sendEmail(to: string[], subject: string, html: string) {
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

// Fixed recipient email for contact form
const CONTACT_EMAIL = "info@budgetapp.site";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData: ContactFormData = await req.json();
    const { name, email, subject, message } = formData;

    // Validate input
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Tüm alanlar zorunludur' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz email adresi' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Contact form submission from: ${name} <${email}>`);

    // Send to fixed contact email

    const dateStr = new Date().toLocaleString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .info-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .info-row { display: flex; margin-bottom: 12px; }
    .info-label { font-weight: 600; color: #374151; width: 100px; flex-shrink: 0; }
    .info-value { color: #6b7280; }
    .message-box { background: #f0fdf4; border-left: 4px solid #14b8a6; padding: 20px; border-radius: 4px; margin-top: 20px; }
    .message-box h3 { margin: 0 0 10px; color: #374151; font-size: 14px; text-transform: uppercase; }
    .message-box p { margin: 0; color: #374151; line-height: 1.6; white-space: pre-wrap; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .reply-btn { display: inline-block; background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 Yeni İletişim Formu</h1>
      <p>${dateStr}</p>
    </div>
    
    <div class="content">
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">👤 Ad Soyad:</span>
          <span class="info-value">${escapeHtml(name)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📧 E-posta:</span>
          <span class="info-value">${escapeHtml(email)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📌 Konu:</span>
          <span class="info-value">${escapeHtml(subject)}</span>
        </div>
      </div>

      <div class="message-box">
        <h3>💬 Mesaj</h3>
        <p>${escapeHtml(message)}</p>
      </div>

      <center>
        <a href="mailto:${escapeHtml(email)}?subject=Re: ${encodeURIComponent(subject)}" class="reply-btn">
          ↩️ Yanıtla
        </a>
      </center>
    </div>
    
    <div class="footer">
      <p>Bu e-posta BudgetApp iletişim formundan otomatik olarak gönderilmiştir.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email to contact address
    const emailResponse = await sendEmail(
      [CONTACT_EMAIL],
      `📬 İletişim Formu: ${subject}`,
      emailHtml
    );

    console.log(`Contact form email sent to ${CONTACT_EMAIL}:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: 'Mesajınız gönderildi' }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in contact-form function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});