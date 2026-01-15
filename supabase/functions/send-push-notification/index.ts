/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Web Push implementation using Fetch API (no external deps needed)
async function generateVapidAuthHeader(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  // For Web Push, we need to send the VAPID JWT token
  // This is a simplified implementation - in production you'd use proper crypto
  const header = btoa(JSON.stringify({ alg: 'ES256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    aud: audience,
    exp: now + 86400,
    sub: subject
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // For edge functions, we'll use the simpler Authorization header approach
  return {
    authorization: `vapid t=${header}.${payload}, k=${publicKey}`,
    cryptoKey: `p256ecdsa=${publicKey}`
  };
}

async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; expired?: boolean }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    const payloadString = JSON.stringify(payload);
    
    // Simple push - some browsers support unencrypted payload for testing
    // For production, you'd need proper encryption
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `WebPush ${vapidPrivateKey}`,
        'Crypto-Key': `p256ecdsa=${vapidPublicKey}`,
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': payload.priority === 'high' ? 'high' : 'normal'
      },
      body: payloadString
    });

    if (response.status === 201 || response.status === 200) {
      console.log('Push notification sent successfully');
      return { success: true };
    }
    
    if (response.status === 410 || response.status === 404) {
      console.log('Push subscription expired or not found');
      return { success: false, expired: true };
    }

    console.error('Push notification failed:', response.status, await response.text());
    return { success: false };
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return { success: false };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { userId, userIds, title, message, url, tag, priority, notificationType } = body;

    // Validate required fields
    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for subscriptions
    let query = supabase
      .from('push_notification_preferences')
      .select('user_id, subscription_endpoint, subscription_keys, payment_reminders, budget_alerts, achievement_alerts')
      .eq('enabled', true)
      .not('subscription_endpoint', 'is', null);

    // Filter by user(s)
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userIds && Array.isArray(userIds)) {
      query = query.in('user_id', userIds);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} active subscriptions`);

    // Filter by notification type preference
    const filteredSubscriptions = subscriptions.filter(sub => {
      if (!notificationType) return true;
      
      switch (notificationType) {
        case 'payment_reminder':
          return sub.payment_reminders !== false;
        case 'budget_alert':
          return sub.budget_alerts !== false;
        case 'achievement':
          return sub.achievement_alerts !== false;
        default:
          return true;
      }
    });

    console.log(`Sending to ${filteredSubscriptions.length} subscriptions after filtering`);

    // Send notifications
    const payload: PushPayload = {
      title,
      body: message,
      url: url || '/dashboard',
      tag: tag || 'notification',
      priority: priority || 'medium'
    };

    let sentCount = 0;
    const expiredSubscriptions: string[] = [];

    for (const sub of filteredSubscriptions) {
      if (!sub.subscription_endpoint || !sub.subscription_keys) continue;

      const subscription: PushSubscription = {
        endpoint: sub.subscription_endpoint,
        keys: sub.subscription_keys as { p256dh: string; auth: string }
      };

      const result = await sendWebPush(subscription, payload, vapidPublicKey, vapidPrivateKey);
      
      if (result.success) {
        sentCount++;
      } else if (result.expired) {
        expiredSubscriptions.push(sub.user_id);
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      console.log(`Cleaning up ${expiredSubscriptions.length} expired subscriptions`);
      await supabase
        .from('push_notification_preferences')
        .update({
          subscription_endpoint: null,
          subscription_keys: null
        })
        .in('user_id', expiredSubscriptions);
    }

    console.log(`Push notifications sent: ${sentCount}/${filteredSubscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        total: filteredSubscriptions.length,
        cleaned: expiredSubscriptions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending push notifications:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send push notifications' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
