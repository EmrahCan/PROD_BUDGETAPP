import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FamilyInviteRequest {
  inviteId: string;
  invitedEmail: string;
  familyName: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Family invite function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteId, invitedEmail, familyName, inviterName }: FamilyInviteRequest = await req.json();

    console.log(`Sending invite email to ${invitedEmail} for family ${familyName}`);

    // Get the app URL from environment or use the production domain
    const appUrl = "https://budgetapp.site";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BudgetApp <noreply@budgetapp.site>",
        to: [invitedEmail],
        subject: `${inviterName} sizi ${familyName} ailesine davet etti!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #18181b; font-size: 24px; margin: 0 0 8px 0;">🏠 Aile Daveti</h1>
                  <p style="color: #71717a; font-size: 16px; margin: 0;">ParaZeka Aile Bütçe Yönetimi</p>
                </div>
                
                <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <p style="color: #18181b; font-size: 16px; margin: 0 0 16px 0;">
                    Merhaba! 👋
                  </p>
                  <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0;">
                    <strong>${inviterName}</strong> sizi <strong>"${familyName}"</strong> ailesine katılmaya davet etti.
                  </p>
                </div>
                
                <p style="color: #3f3f46; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                  Aile grubuna katılarak birlikte bütçe takibi yapabilir, harcamalarınızı karşılaştırabilir ve ortak hesaplarınızı yönetebilirsiniz.
                </p>
                
                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${appUrl}/family" 
                     style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Daveti Kabul Et
                  </a>
                </div>
                
                <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                  Bu davet 7 gün içinde geçerliliğini yitirecektir.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                  Bu e-postayı ${inviterName} tarafından gönderilen bir davet sonucu aldınız.
                  <br>
                  ParaZeka - Akıllı Bütçe Yönetimi
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in family-invite function:", error);
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
