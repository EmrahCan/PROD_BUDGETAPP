import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Installment {
  id: string;
  user_id: string;
  name: string;
  monthly_amount: number;
  currency: string;
  start_date: string;
  paid_months: number;
  total_months: number;
  is_active: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron authentication for scheduled calls - REQUIRED
    const cronSecret = Deno.env.get('CRON_AUTH_SECRET');
    if (!cronSecret) {
      console.error('CRON_AUTH_SECRET not configured - endpoint is disabled for security');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const authHeader = req.headers.get('Authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');
    if (providedSecret !== cronSecret) {
      console.log('Unauthorized cron call attempt');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting installment payment reminder check...");

    // Aktif taksitleri al
    const { data: installments, error: installmentsError } = await supabase
      .from("installments")
      .select("*")
      .eq("is_active", true);

    if (installmentsError) {
      throw installmentsError;
    }

    console.log(`Found ${installments?.length || 0} active installments`);

    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    let notificationsCreated = 0;

    for (const installment of installments as Installment[]) {
      // Eğer tüm taksitler ödendiyse atla
      if (installment.paid_months >= installment.total_months) {
        continue;
      }

      // Bir sonraki ödeme tarihini hesapla
      const startDate = new Date(installment.start_date);
      const nextPaymentDate = new Date(startDate);
      nextPaymentDate.setMonth(startDate.getMonth() + installment.paid_months);

      // 3 gün içinde ödeme var mı kontrol et
      if (
        nextPaymentDate >= today &&
        nextPaymentDate <= threeDaysFromNow
      ) {
        const daysUntilPayment = Math.ceil(
          (nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Bugün için aynı taksit için bildirim var mı kontrol et
        const { data: existingNotifications } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", installment.user_id)
          .eq("related_entity_id", installment.id)
          .eq("notification_type", "installment_reminder")
          .gte("created_at", today.toISOString().split("T")[0]);

        if (!existingNotifications || existingNotifications.length === 0) {
          // Bildirim oluştur
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: installment.user_id,
              title: "Taksit Ödeme Hatırlatması",
              message: `${installment.name} için ${daysUntilPayment} gün sonra ${installment.monthly_amount.toFixed(2)} ${installment.currency} taksit ödemesi var. (${installment.paid_months + 1}/${installment.total_months})`,
              notification_type: "installment_reminder",
              priority: daysUntilPayment === 0 ? "high" : "medium",
              related_entity_id: installment.id,
              related_entity_type: "installment",
              action_url: "/installments",
              is_read: false,
            });

          if (notificationError) {
            console.error("Error creating notification:", notificationError);
          } else {
            notificationsCreated++;
            console.log(`Created notification for installment: ${installment.name}`);
          }
        }
      }
    }

    console.log(`Created ${notificationsCreated} new notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        installmentsChecked: installments?.length || 0,
        notificationsCreated,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in installment-payment-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
