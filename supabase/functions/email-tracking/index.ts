import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1x1 transparent pixel
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b
]);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const emailType = url.searchParams.get("type");
    const eventType = url.searchParams.get("event"); // 'open' or 'click'
    const redirectUrl = url.searchParams.get("url"); // For click tracking
    const token = url.searchParams.get("token");

    // Validate token (simple base64 of email)
    if (!email || !emailType || !eventType || !token) {
      console.error("Missing required parameters");
      if (eventType === "open") {
        return new Response(TRACKING_PIXEL, {
          headers: { "Content-Type": "image/gif", ...corsHeaders },
        });
      }
      return new Response("Invalid request", { status: 400, headers: corsHeaders });
    }

    // Validate token
    const expectedToken = btoa(email);
    if (token !== expectedToken) {
      console.error("Invalid token");
      if (eventType === "open") {
        return new Response(TRACKING_PIXEL, {
          headers: { "Content-Type": "image/gif", ...corsHeaders },
        });
      }
      return new Response("Invalid token", { status: 400, headers: corsHeaders });
    }

    // Get user agent and IP
    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Record the event
    const { error } = await supabase.from("email_analytics").insert({
      user_email: email,
      email_type: emailType,
      event_type: eventType,
      link_url: eventType === "click" ? redirectUrl : null,
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    if (error) {
      console.error("Error recording analytics:", error);
    } else {
      console.log(`Recorded ${eventType} event for ${email} - ${emailType}`);
    }

    // Return appropriate response
    if (eventType === "open") {
      // Return tracking pixel
      return new Response(TRACKING_PIXEL, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          ...corsHeaders,
        },
      });
    } else if (eventType === "click" && redirectUrl) {
      // Redirect to the actual URL
      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl,
          ...corsHeaders,
        },
      });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Error in email-tracking function:", error);
    // Always return pixel for open events to not break emails
    return new Response(TRACKING_PIXEL, {
      headers: { "Content-Type": "image/gif", ...corsHeaders },
    });
  }
});
