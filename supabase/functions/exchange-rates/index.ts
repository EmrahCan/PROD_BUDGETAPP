import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching exchange rates...');
    
    // Use exchangerate.host API (free, no API key required)
    const baseCurrency = 'TRY';
    const targetCurrencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'AUD', 'CAD'];
    
    // Fetch rates from multiple sources for redundancy
    let rates: Record<string, number> = {};
    let success = false;
    
    // Try frankfurter.app first (free, no key needed)
    try {
      const frankfurterResponse = await fetch(
        `https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP,CHF,JPY,AUD,CAD,BGN`
      );
      
      if (frankfurterResponse.ok) {
        const data = await frankfurterResponse.json();
        console.log('Frankfurter API response:', data);
        
        // Calculate rates relative to TRY
        const usdToTry = data.rates.TRY;
        rates = {
          USD: 1 / usdToTry,
          EUR: data.rates.EUR / usdToTry,
          GBP: data.rates.GBP / usdToTry,
          CHF: data.rates.CHF / usdToTry,
          JPY: data.rates.JPY / usdToTry,
          AUD: data.rates.AUD / usdToTry,
          CAD: data.rates.CAD / usdToTry,
          BGN: data.rates.BGN / usdToTry,
          TRY: 1,
        };
        success = true;
      }
    } catch (e) {
      console.error('Frankfurter API error:', e);
    }
    
    // Fallback to exchangerate-api.com if needed
    if (!success) {
      try {
        const exchangeRateResponse = await fetch(
          `https://open.er-api.com/v6/latest/TRY`
        );
        
        if (exchangeRateResponse.ok) {
          const data = await exchangeRateResponse.json();
          console.log('ExchangeRate API response:', data);
          
          rates = {
            USD: data.rates.USD,
            EUR: data.rates.EUR,
            GBP: data.rates.GBP,
            CHF: data.rates.CHF,
            JPY: data.rates.JPY,
            AUD: data.rates.AUD,
            CAD: data.rates.CAD,
            BGN: data.rates.BGN,
            TRY: 1,
          };
          success = true;
        }
      } catch (e) {
        console.error('ExchangeRate API error:', e);
      }
    }
    
    if (!success) {
      throw new Error('Failed to fetch exchange rates from any source');
    }
    
    // Calculate inverse rates (how much 1 unit of foreign currency is in TRY)
    const tryRates: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(rates)) {
      if (currency !== 'TRY') {
        tryRates[currency] = 1 / rate;
      }
    }
    
    const response = {
      base: 'TRY',
      rates: tryRates,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Returning rates:', response);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
