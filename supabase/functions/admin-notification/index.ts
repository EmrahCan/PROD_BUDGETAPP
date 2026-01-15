import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function getAdminEmails(supabase: any): Promise<string[]> {
  // Get all admin user IDs
  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (!adminRoles || adminRoles.length === 0) {
    console.log('No admins found');
    return [];
  }

  // Get email preferences for admins (they must have email set)
  const adminUserIds = adminRoles.map((r: any) => r.user_id);
  const { data: emailPrefs } = await supabase
    .from('email_preferences')
    .select('email')
    .in('user_id', adminUserIds)
    .eq('is_active', true);

  return emailPrefs?.map((p: any) => p.email) || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Server-side admin verification - require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create client with user's auth to verify their identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.log('User authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user has admin role - use service client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.log('User is not an admin:', user.id, roleError);
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Admin verified:', user.id);

    const { type, data } = await req.json();
    console.log(`Admin notification request: ${type}`);

    const adminEmails = await getAdminEmails(supabase);
    
    if (adminEmails.length === 0) {
      console.log('No admin emails configured, skipping notification');
      return new Response(JSON.stringify({ success: true, message: 'No admins to notify' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = '';
    let html = '';

    if (type === 'new_admin_registration') {
      // New admin registered notification
      const { adminName, adminEmail, registeredAt } = data;
      const dateStr = new Date(registeredAt).toLocaleString('tr-TR');
      
      subject = '🛡️ Yeni Admin Kaydı - BudgetApp';
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .info-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fee2e2; }
    .info-row:last-child { border-bottom: none; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Yeni Admin Kaydı</h1>
    </div>
    <div class="content">
      <p>Merhaba Admin,</p>
      <p>Sistemde yeni bir admin kaydı gerçekleşti:</p>
      
      <div class="info-box">
        <div class="info-row">
          <span><strong>İsim:</strong></span>
          <span>${adminName || 'Belirtilmedi'}</span>
        </div>
        <div class="info-row">
          <span><strong>E-posta:</strong></span>
          <span>${adminEmail || 'Belirtilmedi'}</span>
        </div>
        <div class="info-row">
          <span><strong>Kayıt Tarihi:</strong></span>
          <span>${dateStr}</span>
        </div>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Bu kişiye admin yetkisi verildiğini onaylamadıysanız, lütfen hemen kontrol edin.
      </p>
    </div>
    <div class="footer">
      <p>Bu e-posta BudgetApp tarafından otomatik olarak gönderilmiştir.</p>
    </div>
  </div>
</body>
</html>
      `;
    } else if (type === 'daily_stats') {
      // Daily statistics
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const todayStr = now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Fetch statistics
      const [
        { count: totalUsers },
        { count: totalTransactions },
        { data: todayTransactions },
        { data: recentTransactions },
        { count: totalAccounts },
        { count: totalCards },
        { data: profiles }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('id, amount, transaction_type, created_at').gte('created_at', yesterday.toISOString()),
        supabase.from('transactions').select('amount, transaction_type, category').order('created_at', { ascending: false }).limit(100),
        supabase.from('accounts').select('*', { count: 'exact', head: true }),
        supabase.from('credit_cards').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('created_at').gte('created_at', yesterday.toISOString())
      ]);

      const todayTxCount = todayTransactions?.length || 0;
      const newUsersToday = profiles?.length || 0;
      
      const todayIncome = todayTransactions
        ?.filter((t: any) => t.transaction_type === 'income')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;
      
      const todayExpense = todayTransactions
        ?.filter((t: any) => t.transaction_type === 'expense')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;

      // Category breakdown
      const categoryBreakdown: Record<string, number> = {};
      recentTransactions?.forEach((t: any) => {
        if (t.transaction_type === 'expense') {
          categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + Number(t.amount);
        }
      });
      const topCategories = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const formatCurrency = (amount: number) => `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

      subject = `📊 Günlük İstatistik Raporu - ${todayStr}`;
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-card.highlight { background: linear-gradient(135deg, #667eea20, #764ba220); border: 1px solid #667eea40; }
    .stat-card h3 { margin: 0 0 5px; font-size: 12px; color: #666; text-transform: uppercase; }
    .stat-card p { margin: 0; font-size: 28px; font-weight: bold; color: #333; }
    .stat-card.positive p { color: #16a34a; }
    .stat-card.negative p { color: #dc2626; }
    .section { margin-top: 25px; }
    .section h2 { font-size: 18px; color: #333; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 8px; }
    .category-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px; }
    .category-row .name { font-weight: 500; }
    .category-row .amount { font-weight: bold; color: #dc2626; }
    .summary-box { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 25px; border-radius: 12px; margin-top: 25px; }
    .summary-box h3 { margin: 0 0 15px; font-size: 18px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.2); }
    .summary-row:last-child { border-bottom: none; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Günlük Admin Raporu</h1>
      <p>${todayStr}</p>
    </div>
    
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card highlight">
          <h3>👥 Toplam Kullanıcı</h3>
          <p>${totalUsers || 0}</p>
        </div>
        <div class="stat-card">
          <h3>🆕 Bugün Yeni</h3>
          <p>${newUsersToday}</p>
        </div>
        <div class="stat-card">
          <h3>💰 Toplam İşlem</h3>
          <p>${totalTransactions || 0}</p>
        </div>
        <div class="stat-card highlight">
          <h3>📈 Bugün İşlem</h3>
          <p>${todayTxCount}</p>
        </div>
        <div class="stat-card">
          <h3>🏦 Hesap Sayısı</h3>
          <p>${totalAccounts || 0}</p>
        </div>
        <div class="stat-card">
          <h3>💳 Kart Sayısı</h3>
          <p>${totalCards || 0}</p>
        </div>
      </div>

      <div class="section">
        <h2>💵 Bugünkü İşlem Özeti</h2>
        <div class="stats-grid">
          <div class="stat-card positive">
            <h3>Gelir</h3>
            <p>${formatCurrency(todayIncome)}</p>
          </div>
          <div class="stat-card negative">
            <h3>Gider</h3>
            <p>${formatCurrency(todayExpense)}</p>
          </div>
        </div>
      </div>

      ${topCategories.length > 0 ? `
      <div class="section">
        <h2>🏷️ En Çok Harcanan Kategoriler</h2>
        ${topCategories.map(([category, amount]) => `
          <div class="category-row">
            <span class="name">${category}</span>
            <span class="amount">${formatCurrency(amount as number)}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="summary-box">
        <h3>📋 Platform Özeti</h3>
        <div class="summary-row">
          <span>Aktif Kullanıcılar</span>
          <strong>${totalUsers || 0}</strong>
        </div>
        <div class="summary-row">
          <span>Toplam Hesap</span>
          <strong>${totalAccounts || 0}</strong>
        </div>
        <div class="summary-row">
          <span>Toplam Kart</span>
          <strong>${totalCards || 0}</strong>
        </div>
        <div class="summary-row">
          <span>Günlük İşlem Hacmi</span>
          <strong>${formatCurrency(todayIncome + todayExpense)}</strong>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>Bu e-posta BudgetApp tarafından otomatik olarak gönderilmiştir.</p>
      <p>Sadece admin kullanıcılarına gönderilmektedir.</p>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email to all admins
    const emailResponse = await sendEmail(adminEmails, subject, html);
    console.log(`Admin notification sent to ${adminEmails.length} admins:`, emailResponse);

    return new Response(JSON.stringify({ success: true, sentTo: adminEmails.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in admin-notification function:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
