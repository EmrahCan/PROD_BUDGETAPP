import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FixedPayment {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  payment_day: number;
  category: string;
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

    console.log("Starting fixed payment reminder check...");

    // Aktif sabit ödemeleri al
    const { data: fixedPayments, error: paymentsError } = await supabase
      .from("fixed_payments")
      .select("*")
      .eq("is_active", true);

    if (paymentsError) {
      throw paymentsError;
    }

    console.log(`Found ${fixedPayments?.length || 0} active fixed payments`);

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let notificationsCreated = 0;

    for (const payment of fixedPayments as FixedPayment[]) {
      // Ödeme gününü hesapla
      let paymentDate = new Date(currentYear, currentMonth, payment.payment_day);
      
      // Eğer ödeme günü geçmişte kaldıysa, gelecek aya bak
      if (paymentDate < today) {
        paymentDate = new Date(currentYear, currentMonth + 1, payment.payment_day);
      }

      // 3 gün içinde ödeme var mı kontrol et
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);

      if (paymentDate <= threeDaysFromNow && paymentDate >= today) {
        const daysUntilPayment = Math.ceil(
          (paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Bugün için aynı ödeme için bildirim var mı kontrol et
        const { data: existingNotifications } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", payment.user_id)
          .eq("related_entity_id", payment.id)
          .eq("notification_type", "fixed_payment_reminder")
          .gte("created_at", today.toISOString().split("T")[0]);

        if (!existingNotifications || existingNotifications.length === 0) {
          // Bildirim oluştur
          const dayText = daysUntilPayment === 0 
            ? "bugün" 
            : daysUntilPayment === 1 
              ? "yarın" 
              : `${daysUntilPayment} gün sonra`;

          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: payment.user_id,
              title: "Sabit Ödeme Hatırlatması",
              message: `${payment.name} (${payment.category}) için ${dayText} ${payment.amount.toFixed(2)} ${payment.currency} ödeme yapmanız gerekiyor.`,
              notification_type: "fixed_payment_reminder",
              priority: daysUntilPayment === 0 ? "high" : "medium",
              related_entity_id: payment.id,
              related_entity_type: "fixed_payment",
              action_url: "/fixed-payments",
              is_read: false,
            });

          if (notificationError) {
            console.error("Error creating notification:", notificationError);
          } else {
            notificationsCreated++;
            console.log(`Created notification for fixed payment: ${payment.name}`);
          }
        }
      }
    }

    console.log(`Created ${notificationsCreated} new notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentsChecked: fixedPayments?.length || 0,
        notificationsCreated,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in fixed-payment-reminder:", error);
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
