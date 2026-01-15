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
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Sen uzman bir fiş/fatura OCR ve ürün analiz asistanısın. Verilen fiş görüntüsünden TÜM ürünleri tespit et ve detaylı bilgi çıkar.
            
ZORUNLU: Aşağıdaki JSON formatında yanıt ver:
{
  "amount": number (toplam tutar, sadece sayı),
  "category": string (kategori: "Market", "Faturalar", "Ulaşım", "Eğlence", "Sağlık", "Giyim", "Kira", "Diğer"),
  "description": string (mağaza/şirket adı),
  "currency": string ("TRY", "USD", veya "EUR"),
  "date": string (tarih YYYY-MM-DD, bulunamazsa null),
  "confidence": number (0-100 güven skoru),
  "items": [
    {
      "name": string (ürün adı - okunabilir formatta),
      "quantity": number (adet/miktar - SADECE 1-99 arası tam sayı),
      "unit_price": number (birim fiyat),
      "total_price": number (toplam fiyat),
      "category": string (ürün kategorisi),
      "brand": string (marka, bulunamazsa null)
    }
  ]
}

ÖNEMLİ KURALLAR - ÜRÜN ANALİZİ:
1. FİŞTEKİ HER ÜRÜN SATIRINI MUTLAKA items dizisine ekle
2. Ürün adlarını düzgün oku ve formatla (örn: "SÜT 1LT" -> "Süt 1lt")
3. Miktar ve fiyatları doğru eşleştir

KRİTİK - MİKTAR (quantity) KURALLARI:
- Miktar SADECE açıkça belirtilmişse (örn: "3 x 25.00", "Adet: 5") kullan
- Miktar 1 ile 99 arasında tam sayı olmalı
- Miktar belirtilmemişse MUTLAKA 1 olarak ayarla
- ÜRÜN ADINDAKİ SAYILAR MİKTAR DEĞİLDİR! Örnek:
  * "Kahve 250g" -> quantity: 1 (250 gramaj, miktar değil)
  * "Su 1.5lt" -> quantity: 1 (1.5 litre hacim, miktar değil)
  * "Magnolya 510" -> quantity: 1 (510 ürün kodu/gramaj, miktar değil)
  * "Filtre Kahve 8 0z 4510" -> quantity: 1 (4510 ürün kodu, miktar değil)
  * "X10 Peynir" -> quantity: 10 (X10 çarpanı miktar)
  * "3 x Süt" -> quantity: 3 (açık çarpan)
- 100 veya üzeri sayılar ASLA miktar olamaz - bunlar gramaj, ml, ürün kodu veya fiyattır

4. Ürün kategorilerini akıllıca tahmin et:
   - Süt, peynir, yoğurt, et, ekmek, meyve, sebze -> "Gıda"
   - Kola, su, meyve suyu, bira, şarap -> "İçecek"
   - Kahve, çay, nescafe -> "Sıcak İçecekler"
   - Deterjan, çamaşır suyu, sabun -> "Temizlik"
   - Şampuan, diş macunu, deodorant -> "Kişisel Bakım"
   - Telefon, kulaklık, kablo -> "Elektronik"
   - Tişört, pantolon, ayakkabı -> "Giyim"
   - Tabak, bardak, havlu -> "Ev Eşyası"
5. MARKA TESPİTİ: Ürün adında marka varsa ayır (örn: "SÜTAŞ SÜT" -> name: "Süt", brand: "Sütaş")
6. Türkiye'deki yaygın market markalarını tanı: Migros, BİM, A101, ŞOK, CarrefourSA, Metro, vb.
7. Para birimi TL/₺/TRY ise "TRY" kullan
8. SADECE JSON döndür, başka metin ekleme`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Bu fiş/fatura görüntüsünden bilgileri çıkar ve JSON formatında döndür. Miktar (quantity) için dikkatli ol - ürün adındaki sayılar miktar değildir!"
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON from the response
    let receiptData;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      receiptData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse receipt data");
    }

    return new Response(
      JSON.stringify(receiptData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Receipt scanner error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
