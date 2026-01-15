import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Loan {
  id: string;
  user_id: string;
  name: string;
  loan_type: string;
  monthly_payment: number;
  currency: string;
  payment_day: number;
  total_months: number;
  paid_months: number;
  start_date: string;
  is_active: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron job authentication - REQUIRED
    const cronSecret = Deno.env.get('CRON_AUTH_SECRET');
    if (!cronSecret) {
      console.error('CRON_AUTH_SECRET not configured - endpoint is disabled for security');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('Unauthorized cron request');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active loans
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .eq('is_active', true);

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      throw loansError;
    }

    console.log(`Found ${loans?.length || 0} active loans to check`);

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let notificationsCreated = 0;

    for (const loan of (loans as Loan[]) || []) {
      // Calculate next payment date
      const startDate = new Date(loan.start_date);
      const nextPaymentMonth = new Date(startDate);
      nextPaymentMonth.setMonth(startDate.getMonth() + loan.paid_months);
      nextPaymentMonth.setDate(loan.payment_day);
      
      // Adjust if day doesn't exist in month
      if (nextPaymentMonth.getDate() !== loan.payment_day) {
        nextPaymentMonth.setDate(0); // Last day of previous month
      }

      const daysUntilPayment = Math.ceil(
        (nextPaymentMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if payment is due within 3 days or overdue
      if (daysUntilPayment <= 3) {
        const isOverdue = daysUntilPayment < 0;
        const notificationType = isOverdue ? 'loan_overdue' : 'loan_reminder';
        const priority = isOverdue ? 'high' : (daysUntilPayment <= 1 ? 'high' : 'medium');

        // Check for existing notification today
        const todayStart = new Date(currentYear, currentMonth, currentDay).toISOString();
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', loan.user_id)
          .eq('notification_type', notificationType)
          .eq('related_entity_id', loan.id)
          .eq('related_entity_type', 'loan')
          .gte('created_at', todayStart)
          .maybeSingle();

        if (!existingNotification) {
          // Create notification
          const loanTypeLabels: Record<string, string> = {
            housing: 'Konut Kredisi',
            personal: 'İhtiyaç Kredisi',
            education: 'Eğitim Kredisi',
          };
          
          const title = isOverdue 
            ? `Kredi Ödemesi Gecikti: ${loan.name}`
            : `Kredi Ödeme Hatırlatıcısı: ${loan.name}`;
          
          const message = isOverdue
            ? `${loan.name} (${loanTypeLabels[loan.loan_type]}) kredi ödemesi gecikmiş durumda. Aylık taksit: ${loan.monthly_payment.toLocaleString('tr-TR')} ${loan.currency}`
            : `${loan.name} (${loanTypeLabels[loan.loan_type]}) kredi ödemeniz ${daysUntilPayment} gün içinde. Aylık taksit: ${loan.monthly_payment.toLocaleString('tr-TR')} ${loan.currency}`;

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: loan.user_id,
              title,
              message,
              notification_type: notificationType,
              priority,
              related_entity_type: 'loan',
              related_entity_id: loan.id,
              action_url: '/loans',
            });

          if (notifError) {
            console.error(`Error creating notification for loan ${loan.id}:`, notifError);
          } else {
            console.log(`Created ${notificationType} notification for loan: ${loan.name}`);
            notificationsCreated++;
          }
        }
      }
    }

    console.log(`Loan reminder check complete. Created ${notificationsCreated} notifications.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        loansChecked: loans?.length || 0,
        notificationsCreated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in loan-payment-reminder:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);