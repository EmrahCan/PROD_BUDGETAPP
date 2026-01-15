import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create a simple hash for cache key
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Helper function to get adaptive cache TTL
async function getAdaptiveTTL(
  supabaseAdmin: any,
  cacheType: string,
  userId: string,
  baseTTL: number
): Promise<{ ttlHours: number; hitRate: number; isAdaptive: boolean }> {
  try {
    // Get adaptive cache config
    const { data: configData } = await supabaseAdmin
      .from('cache_settings')
      .select('setting_value')
      .eq('setting_key', 'adaptive_cache_config')
      .single();

    const settingValue = configData?.setting_value;
    if (!settingValue || !settingValue.enabled) {
      return { ttlHours: baseTTL, hitRate: 0, isAdaptive: false };
    }

    const config = settingValue as {
      enabled: boolean;
      min_ttl_hours: number;
      max_ttl_hours: number;
      hit_rate_threshold_low: number;
      hit_rate_threshold_high: number;
      ttl_decrease_factor: number;
      ttl_increase_factor: number;
      min_entries_for_analysis: number;
    };

    // Calculate hit rate for similar cache entries (same type, same user, last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: cacheData } = await supabaseAdmin
      .from('ai_cache')
      .select('hit_count')
      .eq('cache_type', cacheType)
      .eq('user_id', userId)
      .gt('created_at', thirtyDaysAgo.toISOString());

    const entries = (cacheData || []) as Array<{ hit_count: number | null }>;
    const totalEntries = entries.length;
    const totalHits = entries.reduce((sum: number, e) => sum + (e.hit_count || 0), 0);

    // Not enough data, return base TTL
    if (totalEntries < config.min_entries_for_analysis) {
      return { ttlHours: baseTTL, hitRate: 0, isAdaptive: false };
    }

    // Calculate hit rate (average hits per entry)
    const hitRate = totalHits / totalEntries;

    let adjustedTTL = baseTTL;

    if (hitRate < config.hit_rate_threshold_low) {
      // Low hit rate = data changes frequently, decrease TTL
      adjustedTTL = Math.max(
        config.min_ttl_hours,
        Math.floor(baseTTL * config.ttl_decrease_factor)
      );
    } else if (hitRate > config.hit_rate_threshold_high) {
      // High hit rate = data is stable, increase TTL
      adjustedTTL = Math.min(
        config.max_ttl_hours,
        Math.floor(baseTTL * config.ttl_increase_factor)
      );
    }

    console.log(`financial-insights: Adaptive TTL - hitRate: ${hitRate.toFixed(2)}, baseTTL: ${baseTTL}h, adjustedTTL: ${adjustedTTL}h`);

    return { ttlHours: adjustedTTL, hitRate, isAdaptive: true };
  } catch (error) {
    console.error('Error calculating adaptive TTL:', error);
    return { ttlHours: baseTTL, hitRate: 0, isAdaptive: false };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('financial-insights: auth header present:', !!authHeader);

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service role client for cache operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('financial-insights: user check:', { hasUser: !!user, userError: userError?.message });

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { language = 'tr', type = 'insight', skipCache = false } = await req.json();

    // Create cache key based on user, type, language, and current date (daily cache)
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `${user.id}-${type}-${language}-${todayStr}`;
    const cacheType = 'financial-insights';

    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const { data: cachedData } = await supabaseAdmin
        .from('ai_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cachedData) {
        console.log('financial-insights: Cache hit for', cacheKey);
        // Update hit count and last_hit_at
        await supabaseAdmin
          .from('ai_cache')
          .update({ 
            hit_count: (cachedData.hit_count || 0) + 1,
            last_hit_at: new Date().toISOString()
          })
          .eq('id', cachedData.id);
        
        return new Response(JSON.stringify({
          ...cachedData.response_data,
          cached: true,
          cacheHitCount: (cachedData.hit_count || 0) + 1,
          adjustedTTL: cachedData.adjusted_ttl_hours
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('financial-insights: Cache miss for', cacheKey);
    }

    // Fetch user's financial data
    const [
      { data: accounts },
      { data: cards },
      { data: transactions },
      { data: fixedPayments },
      { data: installments },
      { data: goals }
    ] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('credit_cards').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(200),
      supabase.from('fixed_payments').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('installments').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('savings_goals').select('*').eq('user_id', user.id).eq('is_completed', false)
    ]);

    // Calculate financial summary
    const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
    const totalCardDebt = cards?.reduce((sum, card) => sum + Number(card.balance), 0) || 0;
    const totalFixedPayments = fixedPayments?.reduce((sum, fp) => sum + Number(fp.amount), 0) || 0;
    const totalInstallments = installments?.reduce((sum, inst) => sum + Number(inst.monthly_amount), 0) || 0;

    // Get current and last month transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const monthlyTransactions = transactions?.filter(t => new Date(t.transaction_date) >= startOfMonth) || [];
    const lastMonthTransactions = transactions?.filter(t => {
      const date = new Date(t.transaction_date);
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }) || [];
    
    const monthlyIncome = monthlyTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const monthlyExpense = monthlyTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastMonthExpense = lastMonthTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Category spending analysis - current month
    const categorySpending: Record<string, number> = {};
    monthlyTransactions
      .filter(t => t.transaction_type === 'expense')
      .forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + Number(t.amount);
      });

    // Category spending - last month for comparison
    const lastMonthCategorySpending: Record<string, number> = {};
    lastMonthTransactions
      .filter(t => t.transaction_type === 'expense')
      .forEach(t => {
        lastMonthCategorySpending[t.category] = (lastMonthCategorySpending[t.category] || 0) + Number(t.amount);
      });

    const topCategories = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Calculate category trends (increase/decrease from last month)
    const categoryTrends = topCategories.map(([cat, amount]) => {
      const lastMonth = lastMonthCategorySpending[cat] || 0;
      const change = lastMonth > 0 ? ((amount - lastMonth) / lastMonth * 100).toFixed(1) : 0;
      return { category: cat, amount, lastMonth, changePercent: change };
    });

    // Overdue payments check
    const today = now.getDate();
    const overdueCards = cards?.filter(c => c.due_date < today && c.balance > 0) || [];
    const overdueFixed = fixedPayments?.filter(fp => fp.payment_day < today) || [];

    // Goals progress
    const goalsProgress = goals?.map(g => ({
      name: g.name,
      target: g.target_amount,
      current: g.current_amount,
      progress: ((g.current_amount / g.target_amount) * 100).toFixed(1)
    })) || [];

    // Prepare financial context for AI
    const financialContext = {
      totalBalance,
      totalCardDebt,
      netStatus: totalBalance - totalCardDebt,
      monthlyIncome,
      monthlyExpense,
      monthlyNet: monthlyIncome - monthlyExpense,
      lastMonthExpense,
      expenseChangePercent: lastMonthExpense > 0 ? ((monthlyExpense - lastMonthExpense) / lastMonthExpense * 100).toFixed(1) : 0,
      totalFixedPayments,
      totalInstallments,
      totalMonthlyObligations: totalFixedPayments + totalInstallments + totalCardDebt,
      topCategories: categoryTrends,
      hasOverduePayments: overdueCards.length > 0 || overdueFixed.length > 0,
      overdueCount: overdueCards.length + overdueFixed.length,
      savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome * 100).toFixed(1) : 0,
      debtToAssetRatio: totalBalance > 0 ? ((totalCardDebt / totalBalance) * 100).toFixed(1) : 0,
      goalsProgress,
      averageMonthlyExpense: transactions && transactions.length > 0 
        ? (transactions.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) / 3).toFixed(0)
        : 0
    };

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'insight') {
      systemPrompt = language === 'tr' 
        ? `Sen bir kişisel finans danışmanısın. Kullanıcının finansal durumunu detaylı analiz et.
           
           Yanıtını şu formatta ver:
           1. 📊 **Genel Değerlendirme** (1-2 cümle)
           2. 💡 **Kategori Analizi** - En yüksek harcama kategorileri ve geçen aya göre değişimler
           3. ⚠️ **Dikkat Edilmesi Gerekenler** (varsa)
           4. ✅ **Öneriler** - 2-3 somut tasarruf önerisi
           
           Kısa, öz ve eyleme dönüştürülebilir tavsiyeler ver. Türkçe yanıt ver. Para birimi olarak ₺ kullan.`
        : language === 'de'
        ? `Du bist ein persönlicher Finanzberater. Analysiere die finanzielle Situation des Nutzers detailliert.
           
           Gib deine Antwort in folgendem Format:
           1. 📊 **Allgemeine Bewertung** (1-2 Sätze)
           2. 💡 **Kategorieanalyse** - Höchste Ausgabenkategorien und Änderungen zum Vormonat
           3. ⚠️ **Zu beachten** (falls vorhanden)
           4. ✅ **Empfehlungen** - 2-3 konkrete Spartipps
           
           Antworte auf Deutsch. Verwende € als Währung.`
        : `You are a personal finance advisor. Analyze the user's financial situation in detail.
           
           Format your response as:
           1. 📊 **Overall Assessment** (1-2 sentences)
           2. 💡 **Category Analysis** - Highest spending categories and changes from last month
           3. ⚠️ **Attention Needed** (if any)
           4. ✅ **Recommendations** - 2-3 concrete savings tips
           
           Respond in English. Use $ as currency.`;

      userPrompt = `Here's the user's detailed financial situation:

**OVERVIEW:**
- Total Balance: ${financialContext.totalBalance.toLocaleString()}
- Total Card Debt: ${financialContext.totalCardDebt.toLocaleString()}
- Net Status: ${financialContext.netStatus.toLocaleString()}

**THIS MONTH:**
- Income: ${financialContext.monthlyIncome.toLocaleString()}
- Expenses: ${financialContext.monthlyExpense.toLocaleString()}
- Net: ${financialContext.monthlyNet.toLocaleString()}
- Savings Rate: ${financialContext.savingsRate}%
- Expense Change from Last Month: ${financialContext.expenseChangePercent}%

**MONTHLY OBLIGATIONS:**
- Fixed Payments: ${financialContext.totalFixedPayments.toLocaleString()}
- Installments: ${financialContext.totalInstallments.toLocaleString()}
- Total: ${financialContext.totalMonthlyObligations.toLocaleString()}

**TOP SPENDING CATEGORIES (with trends):**
${categoryTrends.map(c => `- ${c.category}: ${c.amount.toLocaleString()} (${Number(c.changePercent) > 0 ? '+' : ''}${c.changePercent}% vs last month)`).join('\n')}

**ALERTS:**
- Overdue Payments: ${financialContext.hasOverduePayments ? `Yes (${financialContext.overdueCount})` : 'None'}
- Debt to Asset Ratio: ${financialContext.debtToAssetRatio}%

**ACTIVE GOALS:**
${goalsProgress.length > 0 ? goalsProgress.map(g => `- ${g.name}: ${g.progress}% complete (${g.current}/${g.target})`).join('\n') : 'No active goals'}

Provide detailed, personalized financial advice based on this data.`;

  } else if (type === 'budget-suggestion') {
      systemPrompt = language === 'tr'
        ? `Sen bir kişisel finans danışmanısın. Kullanıcının geçmiş harcamalarını analiz ederek kategori bazlı bütçe limitleri öner.
           
           Her öneri için şu bilgileri ver:
           - category: Kategori adı (tam olarak kullanıcının harcama yaptığı kategori adlarından biri olmalı)
           - monthly_limit: Önerilen aylık limit (TRY cinsinden sayı)
           - alert_threshold: Uyarı eşiği (yüzde, 70-90 arası)
           - reason: Neden bu limiti önerdiğin (1 cümle)
           
           JSON formatında yanıt ver:
           [{"category": "...", "monthly_limit": 5000, "alert_threshold": 80, "reason": "..."}]
           
           En fazla 5 kategori için öneri ver. Ortalama harcamalardan %10-20 fazla limit öner ki kullanıcı rahat etsin ama kontrol de sağlasın.
           Sadece JSON döndür, başka açıklama ekleme.`
        : language === 'de'
        ? `Du bist ein persönlicher Finanzberater. Analysiere die vergangenen Ausgaben und schlage kategoriebasierte Budgetlimits vor.
           
           Gib für jeden Vorschlag an:
           - category: Kategoriename (muss genau einer der Kategorien entsprechen, in denen der Nutzer ausgegeben hat)
           - monthly_limit: Empfohlenes monatliches Limit (Zahl in EUR)
           - alert_threshold: Warnschwelle (Prozent, zwischen 70-90)
           - reason: Warum du dieses Limit empfiehlst (1 Satz)
           
           Antworte im JSON-Format:
           [{"category": "...", "monthly_limit": 500, "alert_threshold": 80, "reason": "..."}]
           
           Gib maximal 5 Kategorien an. Schlage Limits vor, die 10-20% über den Durchschnittsausgaben liegen.
           Gib nur JSON zurück, keine weitere Erklärung.`
        : `You are a personal finance advisor. Analyze past spending and suggest category-based budget limits.
           
           For each suggestion provide:
           - category: Category name (must exactly match one of the categories the user spent in)
           - monthly_limit: Recommended monthly limit (number in USD)
           - alert_threshold: Alert threshold (percentage, between 70-90)
           - reason: Why you recommend this limit (1 sentence)
           
           Respond in JSON format:
           [{"category": "...", "monthly_limit": 500, "alert_threshold": 80, "reason": "..."}]
           
           Provide suggestions for at most 5 categories. Suggest limits 10-20% above average spending.
           Return only JSON, no other explanation.`;

      // Calculate average spending per category over last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const recentTransactions = transactions?.filter(t => 
        new Date(t.transaction_date) >= threeMonthsAgo && t.transaction_type === 'expense'
      ) || [];
      
      const categoryTotals: Record<string, { total: number; count: number }> = {};
      recentTransactions.forEach(t => {
        if (!categoryTotals[t.category]) {
          categoryTotals[t.category] = { total: 0, count: 0 };
        }
        categoryTotals[t.category].total += Number(t.amount);
        categoryTotals[t.category].count += 1;
      });
      
      const categoryAverages = Object.entries(categoryTotals)
        .map(([cat, data]) => ({
          category: cat,
          monthlyAverage: Math.round(data.total / 3),
          transactionCount: data.count
        }))
        .filter(c => c.monthlyAverage > 0)
        .sort((a, b) => b.monthlyAverage - a.monthlyAverage)
        .slice(0, 10);

      userPrompt = `User's spending analysis for the last 3 months:

**MONTHLY AVERAGES BY CATEGORY:**
${categoryAverages.map(c => `- ${c.category}: ${c.monthlyAverage.toLocaleString()} (${c.transactionCount} transactions)`).join('\n')}

**FINANCIAL CONTEXT:**
- Monthly Income: ${financialContext.monthlyIncome.toLocaleString()}
- Monthly Expenses: ${financialContext.monthlyExpense.toLocaleString()}
- Savings Rate: ${financialContext.savingsRate}%
- Current Debt: ${financialContext.totalCardDebt.toLocaleString()}

Based on this spending pattern, suggest realistic budget limits for the top spending categories. Consider:
1. Categories with high spending that could be reduced
2. Categories where spending is volatile
3. The user's overall financial health

Suggest limits that are realistic but encourage mindful spending.`;

  } else if (type === 'goal-suggestion') {
      systemPrompt = language === 'tr'
        ? `Sen bir kişisel finans danışmanısın. Kullanıcının finansal durumuna göre 3 adet gerçekçi tasarruf hedefi öner.
           
           Her hedef için şu bilgileri ver:
           - Hedef adı
           - Hedef tutarı
           - Önerilen süre (ay)
           - Neden bu hedefin önemli olduğu (1 cümle)
           
           JSON formatında yanıt ver:
           [{"name": "...", "amount": 1000, "months": 6, "reason": "..."}]
           
           Sadece JSON döndür, başka açıklama ekleme.`
        : language === 'de'
        ? `Du bist ein persönlicher Finanzberater. Schlage 3 realistische Sparziele basierend auf der finanziellen Situation vor.
           
           Gib für jedes Ziel an:
           - Zielname
           - Zielbetrag
           - Empfohlene Dauer (Monate)
           - Warum dieses Ziel wichtig ist (1 Satz)
           
           Antworte im JSON-Format:
           [{"name": "...", "amount": 1000, "months": 6, "reason": "..."}]
           
           Gib nur JSON zurück, keine weitere Erklärung.`
        : `You are a personal finance advisor. Suggest 3 realistic savings goals based on the user's financial situation.
           
           For each goal provide:
           - Goal name
           - Target amount
           - Recommended duration (months)
           - Why this goal is important (1 sentence)
           
           Respond in JSON format:
           [{"name": "...", "amount": 1000, "months": 6, "reason": "..."}]
           
           Return only JSON, no other explanation.`;

      userPrompt = `User's financial situation:
- Monthly Income: ${financialContext.monthlyIncome.toLocaleString()}
- Monthly Expenses: ${financialContext.monthlyExpense.toLocaleString()}
- Monthly Net (available for savings): ${financialContext.monthlyNet.toLocaleString()}
- Current Savings Rate: ${financialContext.savingsRate}%
- Average Monthly Expense: ${financialContext.averageMonthlyExpense}
- Top Spending Categories: ${topCategories.map(([cat, amount]) => `${cat}: ${amount.toLocaleString()}`).join(', ')}
- Current Debt: ${financialContext.totalCardDebt.toLocaleString()}
- Has overdue payments: ${financialContext.hasOverduePayments}

Suggest 3 personalized, achievable savings goals.`;
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    console.log(`Generated ${type} for user:`, user.id);

    // Get adaptive TTL based on cache hit rate
    const baseTTL = type === 'insight' ? 24 : 12;
    const { ttlHours: adjustedTTL, hitRate, isAdaptive } = await getAdaptiveTTL(
      supabaseAdmin,
      cacheType,
      user.id,
      baseTTL
    );

    const cacheExpiresAt = new Date();
    cacheExpiresAt.setHours(cacheExpiresAt.getHours() + adjustedTTL);

    console.log(`financial-insights: Using TTL ${adjustedTTL}h (base: ${baseTTL}h, adaptive: ${isAdaptive}, hitRate: ${hitRate.toFixed(2)})`);

    if (type === 'goal-suggestion' || type === 'budget-suggestion') {
      // Parse JSON from response
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        const responseData = { suggestions, summary: financialContext };
        
        // Save to cache with adaptive TTL info
        await supabaseAdmin
          .from('ai_cache')
          .upsert({
            cache_key: cacheKey,
            cache_type: cacheType,
            user_id: user.id,
            request_hash: simpleHash(JSON.stringify({ type, language })),
            response_data: responseData,
            expires_at: cacheExpiresAt.toISOString(),
            hit_count: 0,
            base_ttl_hours: baseTTL,
            adjusted_ttl_hours: adjustedTTL
          }, { onConflict: 'cache_key' });
        
        console.log('financial-insights: Cached response for', cacheKey);
        
        return new Response(JSON.stringify({ 
          ...responseData,
          cached: false,
          adjustedTTL,
          isAdaptive
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error(`Error parsing ${type}:`, parseError);
        return new Response(JSON.stringify({ 
          suggestions: [],
          raw: content,
          summary: financialContext
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const responseData = { insight: content, summary: financialContext };
    
    // Save to cache with adaptive TTL info
    await supabaseAdmin
      .from('ai_cache')
      .upsert({
        cache_key: cacheKey,
        cache_type: cacheType,
        user_id: user.id,
        request_hash: simpleHash(JSON.stringify({ type, language })),
        response_data: responseData,
        expires_at: cacheExpiresAt.toISOString(),
        hit_count: 0,
        base_ttl_hours: baseTTL,
        adjusted_ttl_hours: adjustedTTL
      }, { onConflict: 'cache_key' });
    
    console.log('financial-insights: Cached response for', cacheKey);

    return new Response(JSON.stringify({ 
      ...responseData,
      cached: false,
      adjustedTTL,
      isAdaptive
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in financial-insights function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
