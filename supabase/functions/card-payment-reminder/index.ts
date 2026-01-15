import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  bank_name: string;
  balance: number;
  minimum_payment: number;
  currency: string;
  due_date: number;
  last_four_digits: string;
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

    console.log("Starting credit card payment reminder check...");

    // Tüm kredi kartlarını al
    const { data: creditCards, error: cardsError } = await supabase
      .from("credit_cards")
      .select("*");

    if (cardsError) {
      throw cardsError;
    }

    console.log(`Found ${creditCards?.length || 0} credit cards`);

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let notificationsCreated = 0;

    for (const card of creditCards as CreditCard[]) {
      // Sadece asgari ödeme varsa hatırlat (asgari ödeme 0 ise ödeme yapılmış kabul edilir)
      const minimumPayment = Number(card.minimum_payment) || 0;
      if (minimumPayment <= 0) {
        console.log(`Skipping card ${card.name} - minimum payment is 0`);
        continue;
      }

      // Son ödeme tarihini hesapla
      let dueDate = new Date(currentYear, currentMonth, card.due_date);
      
      // Eğer son ödeme günü geçmişte kaldıysa, gelecek aya bak
      if (dueDate < today) {
        dueDate = new Date(currentYear, currentMonth + 1, card.due_date);
      }

      // 5 gün içinde son ödeme tarihi var mı kontrol et (kartlar için biraz daha erken hatırlat)
      const fiveDaysFromNow = new Date(today);
      fiveDaysFromNow.setDate(today.getDate() + 5);

      if (dueDate <= fiveDaysFromNow && dueDate >= today) {
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Bugün için aynı kart için bildirim var mı kontrol et
        const { data: existingNotifications } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", card.user_id)
          .eq("related_entity_id", card.id)
          .eq("notification_type", "card_payment_reminder")
          .gte("created_at", today.toISOString().split("T")[0]);

        if (!existingNotifications || existingNotifications.length === 0) {
          // Bildirim oluştur
          let dayText = "";
          let priority = "medium";

          if (daysUntilDue === 0) {
            dayText = "BUGÜN";
            priority = "high";
          } else if (daysUntilDue === 1) {
            dayText = "yarın";
            priority = "high";
          } else {
            dayText = `${daysUntilDue} gün sonra`;
          }

          // Mesajda asgari ödeme varsa onu, yoksa toplam borcu göster
          const amountText = card.minimum_payment > 0 
            ? `Asgari ödeme: ${card.minimum_payment.toFixed(2)} ${card.currency} (Toplam: ${card.balance.toFixed(2)} ${card.currency})`
            : `Borç: ${card.balance.toFixed(2)} ${card.currency}`;

          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: card.user_id,
              title: "Kredi Kartı Ödeme Hatırlatması",
              message: `${card.bank_name} ${card.name} (****${card.last_four_digits}) için ${dayText} son ödeme tarihi! ${amountText}`,
              notification_type: "card_payment_reminder",
              priority: priority,
              related_entity_id: card.id,
              related_entity_type: "credit_card",
              action_url: "/cards",
              is_read: false,
            });

          if (notificationError) {
            console.error("Error creating notification:", notificationError);
          } else {
            notificationsCreated++;
            console.log(`Created notification for card: ${card.name} (${daysUntilDue} days until due)`);
          }
        }
      }
    }

    console.log(`Created ${notificationsCreated} new notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        cardsChecked: creditCards?.length || 0,
        notificationsCreated,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in card-payment-reminder:", error);
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
