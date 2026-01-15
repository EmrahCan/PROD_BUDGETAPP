import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, language = 'tr', startDate, endDate } = await req.json();

    // Build transaction query - if date range provided, use it; otherwise get all
    let transactionsQuery = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false });

    // Apply date filters if provided
    if (startDate) {
      transactionsQuery = transactionsQuery.gte('transaction_date', startDate);
    }
    if (endDate) {
      transactionsQuery = transactionsQuery.lte('transaction_date', endDate);
    }

    // Build receipt items query with date filter
    let receiptItemsQuery = supabase
      .from('receipt_items')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false, nullsFirst: false });

    if (startDate) {
      receiptItemsQuery = receiptItemsQuery.gte('transaction_date', startDate);
    }
    if (endDate) {
      receiptItemsQuery = receiptItemsQuery.lte('transaction_date', endDate);
    }

    // Fetch user's financial data for context - NO LIMIT on transactions for full analysis
    const [
      { data: accounts },
      { data: cards },
      { data: transactions },
      { data: fixedPayments },
      { data: installments },
      { data: goals },
      { data: loans },
      { data: budgetLimits },
      { data: cryptoHoldings },
      { data: currencyHoldings },
      { data: receiptItems }
    ] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('credit_cards').select('*').eq('user_id', user.id),
      transactionsQuery,
      supabase.from('fixed_payments').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('installments').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('savings_goals').select('*').eq('user_id', user.id).eq('is_completed', false),
      supabase.from('loans').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('budget_limits').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('crypto_holdings').select('*').eq('user_id', user.id),
      supabase.from('currency_holdings').select('*').eq('user_id', user.id),
      receiptItemsQuery
    ]);

    // Calculate financial summary
    const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
    const totalCardDebt = cards?.reduce((sum, card) => sum + Number(card.balance), 0) || 0;
    const totalFixedPayments = fixedPayments?.reduce((sum, fp) => sum + Number(fp.amount), 0) || 0;
    const totalInstallments = installments?.reduce((sum, inst) => sum + Number(inst.monthly_amount), 0) || 0;
    const totalLoanPayments = loans?.reduce((sum, loan) => sum + Number(loan.monthly_payment), 0) || 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTransactions = transactions?.filter(t => new Date(t.transaction_date) >= startOfMonth) || [];
    
    const monthlyIncome = monthlyTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const monthlyExpense = monthlyTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Category spending from transactions
    const categorySpending: Record<string, number> = {};
    monthlyTransactions
      .filter(t => t.transaction_type === 'expense')
      .forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + Number(t.amount);
      });

    const topCategories = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amount]) => `${cat}: ${amount.toLocaleString()}`);

    // Card usage statistics - which card is used most
    const cardUsage: Record<string, { name: string, count: number, total: number }> = {};
    transactions?.forEach(t => {
      if (t.card_id && t.transaction_type === 'expense') {
        const card = cards?.find(c => c.id === t.card_id);
        if (card) {
          if (!cardUsage[t.card_id]) {
            cardUsage[t.card_id] = { name: `${card.name} (*${card.last_four_digits})`, count: 0, total: 0 };
          }
          cardUsage[t.card_id].count++;
          cardUsage[t.card_id].total += Number(t.amount);
        }
      }
    });

    const cardUsageStats = Object.values(cardUsage)
      .sort((a, b) => b.count - a.count)
      .map(c => `${c.name}: ${c.count} işlem, ₺${c.total.toLocaleString()}`);

    // Account usage statistics
    const accountUsage: Record<string, { name: string, incomeCount: number, expenseCount: number, incomeTotal: number, expenseTotal: number }> = {};
    transactions?.forEach(t => {
      if (t.account_id) {
        const account = accounts?.find(a => a.id === t.account_id);
        if (account) {
          if (!accountUsage[t.account_id]) {
            accountUsage[t.account_id] = { name: account.name, incomeCount: 0, expenseCount: 0, incomeTotal: 0, expenseTotal: 0 };
          }
          if (t.transaction_type === 'income') {
            accountUsage[t.account_id].incomeCount++;
            accountUsage[t.account_id].incomeTotal += Number(t.amount);
          } else if (t.transaction_type === 'expense') {
            accountUsage[t.account_id].expenseCount++;
            accountUsage[t.account_id].expenseTotal += Number(t.amount);
          }
        }
      }
    });

    const accountUsageStats = Object.values(accountUsage)
      .map(a => `${a.name}: ${a.incomeCount} gelir (₺${a.incomeTotal.toLocaleString()}), ${a.expenseCount} gider (₺${a.expenseTotal.toLocaleString()})`);

    // Detailed fixed payments info
    const fixedPaymentsDetails = fixedPayments?.map(fp => ({
      name: fp.name,
      amount: fp.amount,
      category: fp.category,
      paymentDay: fp.payment_day
    })) || [];

    // Detailed installments info
    const installmentsDetails = installments?.map(inst => ({
      name: inst.name,
      monthlyAmount: inst.monthly_amount,
      totalAmount: inst.total_amount,
      paidMonths: inst.paid_months,
      totalMonths: inst.total_months,
      remainingMonths: inst.total_months - inst.paid_months,
      remainingAmount: inst.monthly_amount * (inst.total_months - inst.paid_months)
    })) || [];

    // Detailed loans info
    const loansDetails = loans?.map(loan => ({
      name: loan.name,
      type: loan.loan_type,
      monthlyPayment: loan.monthly_payment,
      remainingAmount: loan.remaining_amount,
      paidMonths: loan.paid_months,
      totalMonths: loan.total_months,
      remainingMonths: loan.total_months - loan.paid_months
    })) || [];

    // Total monthly recurring expenses (fixed + installments + loans)
    const totalMonthlyRecurring = totalFixedPayments + totalInstallments + totalLoanPayments;

    const goalsInfo = goals?.map(g => ({
      name: g.name,
      target: g.target_amount,
      current: g.current_amount,
      progress: ((g.current_amount / g.target_amount) * 100).toFixed(1)
    })) || [];

    // Card details with limits and balances
    const cardDetails = cards?.map(c => ({
      name: c.name,
      lastFour: c.last_four_digits,
      balance: c.balance,
      limit: c.card_limit,
      available: c.card_limit - c.balance,
      usagePercent: c.card_limit > 0 ? ((c.balance / c.card_limit) * 100).toFixed(1) : 0,
      dueDate: c.due_date
    })) || [];

    // Account details
    const accountDetails = accounts?.map(a => ({
      name: a.name,
      balance: a.balance,
      type: a.account_type,
      bank: a.bank_name
    })) || [];

    // Budget limits info
    const budgetInfo = budgetLimits?.map(b => ({
      category: b.category,
      limit: b.monthly_limit,
      threshold: b.alert_threshold
    })) || [];

    // Calculate budget usage from transactions
    const budgetUsage = budgetInfo.map(budget => {
      const spent = categorySpending[budget.category] || 0;
      const usagePercent = budget.limit > 0 ? ((spent / budget.limit) * 100).toFixed(1) : 0;
      return {
        ...budget,
        spent,
        usagePercent,
        remaining: budget.limit - spent
      };
    });

    // Crypto holdings info
    const cryptoInfo = cryptoHoldings?.map(c => ({
      name: c.name,
      symbol: c.symbol,
      quantity: c.quantity,
      purchasePrice: c.purchase_price,
      exchange: c.exchange
    })) || [];
    const totalCryptoInvestment = cryptoHoldings?.reduce((sum, c) => sum + (c.quantity * c.purchase_price), 0) || 0;

    // Currency holdings info
    const currencyInfo = currencyHoldings?.map(c => ({
      name: c.asset_name,
      code: c.asset_code,
      type: c.asset_type,
      quantity: c.quantity,
      purchasePrice: c.purchase_price
    })) || [];
    const totalCurrencyInvestment = currencyHoldings?.reduce((sum, c) => sum + (c.quantity * c.purchase_price), 0) || 0;

    // Transaction details for full visibility
    const allTransactions = transactions?.map(t => ({
      date: t.transaction_date,
      amount: t.amount,
      type: t.transaction_type,
      category: t.category,
      description: t.description,
      cardId: t.card_id,
      accountId: t.account_id,
      hasReceipt: !!t.receipt_image_url
    })) || [];

    // Receipt/Product statistics
    const receiptCount = transactions?.filter(t => t.receipt_image_url).length || 0;
    const totalReceiptAmount = transactions
      ?.filter(t => t.receipt_image_url)
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Product category analysis from receipt_items
    const productCategorySpending: Record<string, { total: number; count: number }> = {};
    receiptItems?.forEach(item => {
      const cat = item.category || 'Diğer';
      if (!productCategorySpending[cat]) {
        productCategorySpending[cat] = { total: 0, count: 0 };
      }
      productCategorySpending[cat].total += Number(item.total_price);
      productCategorySpending[cat].count += Number(item.quantity || 1);
    });

    const topProductCategories = Object.entries(productCategorySpending)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([cat, data]) => `${cat}: ₺${data.total.toLocaleString()} (${data.count} adet)`);

    // Brand analysis from receipt_items
    const brandSpending: Record<string, { total: number; count: number }> = {};
    receiptItems?.forEach(item => {
      const brand = item.brand || 'Bilinmeyen';
      if (!brandSpending[brand]) {
        brandSpending[brand] = { total: 0, count: 0 };
      }
      brandSpending[brand].total += Number(item.total_price);
      brandSpending[brand].count += Number(item.quantity || 1);
    });

    const topBrands = Object.entries(brandSpending)
      .filter(([brand]) => brand !== 'Bilinmeyen')
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([brand, data]) => `${brand}: ₺${data.total.toLocaleString()} (${data.count} adet)`);

    // Most purchased products
    const productPurchases: Record<string, { total: number; count: number; avgPrice: number }> = {};
    receiptItems?.forEach(item => {
      const name = item.name.toLowerCase().trim();
      if (!productPurchases[name]) {
        productPurchases[name] = { total: 0, count: 0, avgPrice: 0 };
      }
      productPurchases[name].total += Number(item.total_price);
      productPurchases[name].count += Number(item.quantity || 1);
    });
    Object.keys(productPurchases).forEach(key => {
      productPurchases[key].avgPrice = productPurchases[key].total / productPurchases[key].count;
    });

    const topProducts = Object.entries(productPurchases)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15)
      .map(([name, data]) => `${name.charAt(0).toUpperCase() + name.slice(1)}: ₺${data.total.toLocaleString()} (${data.count} adet, ort: ₺${data.avgPrice.toFixed(2)})`);

    // Merchant/Store analysis
    const merchantAnalysis: Record<string, { total: number; count: number; lastDate: string }> = {};
    transactions?.filter(t => t.receipt_image_url).forEach(t => {
      const merchant = t.description || 'Bilinmeyen';
      if (!merchantAnalysis[merchant]) {
        merchantAnalysis[merchant] = { total: 0, count: 0, lastDate: t.transaction_date };
      }
      merchantAnalysis[merchant].total += Number(t.amount);
      merchantAnalysis[merchant].count++;
      if (t.transaction_date > merchantAnalysis[merchant].lastDate) {
        merchantAnalysis[merchant].lastDate = t.transaction_date;
      }
    });

    const topMerchants = Object.entries(merchantAnalysis)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([merchant, data]) => `${merchant}: ₺${data.total.toLocaleString()} (${data.count} fiş, son: ${data.lastDate})`);

    const totalProductCount = receiptItems?.reduce((sum, item) => sum + Number(item.quantity || 1), 0) || 0;
    const totalProductAmount = receiptItems?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
    const avgProductPrice = totalProductCount > 0 ? totalProductAmount / totalProductCount : 0;

    // Date range info for context
    const dateRangeInfo = startDate && endDate 
      ? `Analiz Dönemi: ${startDate} - ${endDate}` 
      : 'Tüm veriler';

    const systemPrompt = language === 'tr' 
      ? `Sen bir kişisel finans danışmanısın. Kullanıcının TÜM finansal verilerine erişimin var ve onlara yardımcı oluyorsun.

${dateRangeInfo}

KULLANICININ FİNANSAL DURUMU:
- Toplam Bakiye: ₺${totalBalance.toLocaleString()}
- Toplam Kredi Kartı Borcu: ₺${totalCardDebt.toLocaleString()}
- Net Durum: ₺${(totalBalance - totalCardDebt).toLocaleString()}
- Dönem Geliri (İşlemlerden): ₺${monthlyIncome.toLocaleString()}
- Dönem Gideri (İşlemlerden): ₺${monthlyExpense.toLocaleString()}
- Dönem Net: ₺${(monthlyIncome - monthlyExpense).toLocaleString()}

BANKA HESAPLARI (${accounts?.length || 0} adet):
${accountDetails.length > 0 ? accountDetails.map(a => `  - ${a.name} (${a.bank}, ${a.type}): ₺${Number(a.balance).toLocaleString()}`).join('\n') : '  Hesap yok'}

KREDİ KARTLARI (${cards?.length || 0} adet, Toplam Borç: ₺${totalCardDebt.toLocaleString()}):
${cardDetails.length > 0 ? cardDetails.map(c => `  - ${c.name} (*${c.lastFour}): Borç ₺${Number(c.balance).toLocaleString()} / Limit ₺${Number(c.limit).toLocaleString()} (Kullanım: %${c.usagePercent}, Kalan: ₺${c.available.toLocaleString()}, Ekstre ${c.dueDate}. gün)`).join('\n') : '  Kart yok'}

KART KULLANIM İSTATİSTİKLERİ (Seçilen dönemden):
${cardUsageStats.length > 0 ? cardUsageStats.map(s => `  - ${s}`).join('\n') : '  Kart ile işlem yok'}

HESAP KULLANIM İSTATİSTİKLERİ (Seçilen dönemden):
${accountUsageStats.length > 0 ? accountUsageStats.map(s => `  - ${s}`).join('\n') : '  Hesap ile işlem yok'}

AYLIK SABİT ÖDEMELER (${fixedPayments?.length || 0} adet, Toplam: ₺${totalFixedPayments.toLocaleString()}):
${fixedPaymentsDetails.length > 0 ? fixedPaymentsDetails.map(fp => `  - ${fp.name}: ₺${fp.amount.toLocaleString()} (${fp.category}, her ayın ${fp.paymentDay}. günü)`).join('\n') : '  Sabit ödeme yok'}

AYLIK TAKSİTLER (${installments?.length || 0} adet, Toplam: ₺${totalInstallments.toLocaleString()}):
${installmentsDetails.length > 0 ? installmentsDetails.map(inst => `  - ${inst.name}: ₺${inst.monthlyAmount.toLocaleString()}/ay (${inst.paidMonths}/${inst.totalMonths} ödendi, Kalan: ₺${inst.remainingAmount.toLocaleString()})`).join('\n') : '  Aktif taksit yok'}

KREDİLER (${loans?.length || 0} adet, Aylık Toplam: ₺${totalLoanPayments.toLocaleString()}):
${loansDetails.length > 0 ? loansDetails.map(loan => `  - ${loan.name} (${loan.type}): ₺${loan.monthlyPayment.toLocaleString()}/ay (${loan.paidMonths}/${loan.totalMonths} ödendi, Kalan Borç: ₺${loan.remainingAmount.toLocaleString()})`).join('\n') : '  Aktif kredi yok'}

TOPLAM AYLIK YÜKÜMLÜLÜKLER: ₺${totalMonthlyRecurring.toLocaleString()} (Sabit Ödemeler + Taksitler + Krediler)

BÜTÇE LİMİTLERİ VE KULLANIM (${budgetUsage.length} kategori):
${budgetUsage.length > 0 ? budgetUsage.map(b => `  - ${b.category}: ₺${b.spent.toLocaleString()} / ₺${b.limit.toLocaleString()} (%${b.usagePercent} kullanıldı, Kalan: ₺${b.remaining.toLocaleString()})`).join('\n') : '  Bütçe limiti yok'}

KRİPTO VARLIKLAR (${cryptoInfo.length} adet, Toplam Yatırım: ₺${totalCryptoInvestment.toLocaleString()}):
${cryptoInfo.length > 0 ? cryptoInfo.map(c => `  - ${c.name} (${c.symbol}): ${c.quantity} adet @ ₺${c.purchasePrice.toLocaleString()} ${c.exchange ? `(${c.exchange})` : ''}`).join('\n') : '  Kripto varlık yok'}

DÖVİZ VE ALTIN VARLIKLARI (${currencyInfo.length} adet, Toplam Yatırım: ₺${totalCurrencyInvestment.toLocaleString()}):
${currencyInfo.length > 0 ? currencyInfo.map(c => `  - ${c.name} (${c.code}, ${c.type}): ${c.quantity} adet @ ₺${c.purchasePrice.toLocaleString()}`).join('\n') : '  Döviz/altın varlığı yok'}

KATEGORİ BAZLI HARCAMALAR:
${topCategories.length > 0 ? topCategories.map(c => `  - ${c}`).join('\n') : '  Harcama yok'}

TASARRUF HEDEFLERİ:
${goalsInfo.length > 0 ? goalsInfo.map(g => `  - ${g.name}: ₺${g.current.toLocaleString()} / ₺${g.target.toLocaleString()} (%${g.progress})`).join('\n') : '  Hedef yok'}

📊 FİŞ VE ÜRÜN ANALİZİ:
- Toplam Fiş Sayısı: ${receiptCount}
- Fişlerden Toplam Harcama: ₺${totalReceiptAmount.toLocaleString()}
- Taranan Ürün Sayısı: ${totalProductCount}
- Ürünlerden Toplam Harcama: ₺${totalProductAmount.toLocaleString()}
- Ortalama Ürün Fiyatı: ₺${avgProductPrice.toFixed(2)}

EN ÇOK ALIŞVERİŞ YAPILAN YERLER:
${topMerchants.length > 0 ? topMerchants.map(m => `  - ${m}`).join('\n') : '  Veri yok'}

ÜRÜN KATEGORİLERİ (Fiş kalemlerinden):
${topProductCategories.length > 0 ? topProductCategories.map(c => `  - ${c}`).join('\n') : '  Veri yok'}

EN ÇOK ALINAN MARKALAR:
${topBrands.length > 0 ? topBrands.map(b => `  - ${b}`).join('\n') : '  Marka bilgisi yok'}

EN ÇOK ALINAN ÜRÜNLER:
${topProducts.length > 0 ? topProducts.map(p => `  - ${p}`).join('\n') : '  Ürün bilgisi yok'}

TÜM İŞLEMLER (${allTransactions.length} adet):
${allTransactions.slice(0, 100).map(t => `  - ${t.date}: ${t.type === 'income' ? '+' : '-'}₺${t.amount.toLocaleString()} (${t.category}${t.description ? ': ' + t.description : ''}${t.hasReceipt ? ' 🧾' : ''})`).join('\n') || '  İşlem yok'}
${allTransactions.length > 100 ? `  ... ve ${allTransactions.length - 100} işlem daha` : ''}

KURALLAR:
- Kısa, net ve anlaşılır yanıtlar ver
- Somut öneriler sun
- Türkçe yanıt ver
- Kullanıcının finansal verilerini kullanarak kişiselleştirilmiş tavsiyeler ver
- Kart karşılaştırması sorulduğunda kullanım oranları ve işlem sayılarını karşılaştır
- Hesap karşılaştırması sorulduğunda gelir/gider istatistiklerini kullan
- Fiş ve ürün analizi sorulduğunda detaylı istatistikler sun
- Haftalık/aylık fiş raporu istendiğinde en çok alışveriş yapılan yerler, kategoriler, markalar ve ürünleri analiz et
- Markdown formatı kullanabilirsin (bold, liste vb.)
- Para birimi olarak ₺ kullan
- Tüm verilere erişimin var, her soruyu yanıtlayabilirsin`
      : language === 'de'
      ? `Du bist ein persönlicher Finanzberater mit Zugang zu ALLEN Finanzdaten des Nutzers.

${startDate && endDate ? `Analysezeitraum: ${startDate} - ${endDate}` : 'Alle Daten'}

FINANZIELLE SITUATION:
- Gesamtsaldo: €${totalBalance.toLocaleString()}
- Kreditkartenschulden: €${totalCardDebt.toLocaleString()}
- Nettovermögen: €${(totalBalance - totalCardDebt).toLocaleString()}
- Einkommen (Zeitraum): €${monthlyIncome.toLocaleString()}
- Ausgaben (Zeitraum): €${monthlyExpense.toLocaleString()}

BANKKONTEN (${accounts?.length || 0}):
${accountDetails.length > 0 ? accountDetails.map(a => `  - ${a.name} (${a.bank}): €${Number(a.balance).toLocaleString()}`).join('\n') : '  Keine Konten'}

KREDITKARTEN (${cards?.length || 0}, Schulden: €${totalCardDebt.toLocaleString()}):
${cardDetails.length > 0 ? cardDetails.map(c => `  - ${c.name} (*${c.lastFour}): €${Number(c.balance).toLocaleString()} / Limit €${Number(c.limit).toLocaleString()} (${c.usagePercent}% genutzt)`).join('\n') : '  Keine Karten'}

KARTENNUTZUNG:
${cardUsageStats.length > 0 ? cardUsageStats.map(s => `  - ${s}`).join('\n') : '  Keine Transaktionen'}

KONTONUTZUNG:
${accountUsageStats.length > 0 ? accountUsageStats.map(s => `  - ${s}`).join('\n') : '  Keine Transaktionen'}

FIXKOSTEN (€${totalFixedPayments.toLocaleString()}):
${fixedPaymentsDetails.length > 0 ? fixedPaymentsDetails.map(fp => `  - ${fp.name}: €${fp.amount.toLocaleString()}`).join('\n') : '  Keine'}

RATENZAHLUNGEN (€${totalInstallments.toLocaleString()}):
${installmentsDetails.length > 0 ? installmentsDetails.map(inst => `  - ${inst.name}: €${inst.monthlyAmount.toLocaleString()}/Monat`).join('\n') : '  Keine'}

KREDITE (€${totalLoanPayments.toLocaleString()}/Monat):
${loansDetails.length > 0 ? loansDetails.map(loan => `  - ${loan.name}: €${loan.monthlyPayment.toLocaleString()}/Monat`).join('\n') : '  Keine'}

BUDGETLIMITS:
${budgetUsage.length > 0 ? budgetUsage.map(b => `  - ${b.category}: €${b.spent.toLocaleString()} / €${b.limit.toLocaleString()} (${b.usagePercent}%)`).join('\n') : '  Keine'}

KRYPTO (Investition: €${totalCryptoInvestment.toLocaleString()}):
${cryptoInfo.length > 0 ? cryptoInfo.map(c => `  - ${c.name}: ${c.quantity} @ €${c.purchasePrice.toLocaleString()}`).join('\n') : '  Keine'}

KATEGORIEN:
${topCategories.join('\n') || '  Keine Daten'}

SPARZIELE:
${goalsInfo.length > 0 ? goalsInfo.map(g => `  - ${g.name}: €${g.current.toLocaleString()} / €${g.target.toLocaleString()} (${g.progress}%)`).join('\n') : '  Keine'}

Antworte auf Deutsch, kurz und präzise.`
      : `You are a personal finance advisor with access to ALL of the user's financial data.

${startDate && endDate ? `Analysis Period: ${startDate} - ${endDate}` : 'All data'}

USER'S FINANCIAL SITUATION:
- Total Balance: $${totalBalance.toLocaleString()}
- Credit Card Debt: $${totalCardDebt.toLocaleString()}
- Net Worth: $${(totalBalance - totalCardDebt).toLocaleString()}
- Period Income: $${monthlyIncome.toLocaleString()}
- Period Expenses: $${monthlyExpense.toLocaleString()}

BANK ACCOUNTS (${accounts?.length || 0}):
${accountDetails.length > 0 ? accountDetails.map(a => `  - ${a.name} (${a.bank}): $${Number(a.balance).toLocaleString()}`).join('\n') : '  No accounts'}

CREDIT CARDS (${cards?.length || 0}, Total Debt: $${totalCardDebt.toLocaleString()}):
${cardDetails.length > 0 ? cardDetails.map(c => `  - ${c.name} (*${c.lastFour}): $${Number(c.balance).toLocaleString()} / Limit $${Number(c.limit).toLocaleString()} (${c.usagePercent}% used, Available: $${c.available.toLocaleString()})`).join('\n') : '  No cards'}

CARD USAGE STATISTICS:
${cardUsageStats.length > 0 ? cardUsageStats.map(s => `  - ${s}`).join('\n') : '  No card transactions'}

ACCOUNT USAGE STATISTICS:
${accountUsageStats.length > 0 ? accountUsageStats.map(s => `  - ${s}`).join('\n') : '  No account transactions'}

FIXED PAYMENTS ($${totalFixedPayments.toLocaleString()}/month):
${fixedPaymentsDetails.length > 0 ? fixedPaymentsDetails.map(fp => `  - ${fp.name}: $${fp.amount.toLocaleString()} (${fp.category}, day ${fp.paymentDay})`).join('\n') : '  None'}

INSTALLMENTS ($${totalInstallments.toLocaleString()}/month):
${installmentsDetails.length > 0 ? installmentsDetails.map(inst => `  - ${inst.name}: $${inst.monthlyAmount.toLocaleString()}/month (${inst.paidMonths}/${inst.totalMonths} paid)`).join('\n') : '  None'}

LOANS ($${totalLoanPayments.toLocaleString()}/month):
${loansDetails.length > 0 ? loansDetails.map(loan => `  - ${loan.name}: $${loan.monthlyPayment.toLocaleString()}/month (Remaining: $${loan.remainingAmount.toLocaleString()})`).join('\n') : '  None'}

TOTAL MONTHLY OBLIGATIONS: $${totalMonthlyRecurring.toLocaleString()}

BUDGET LIMITS:
${budgetUsage.length > 0 ? budgetUsage.map(b => `  - ${b.category}: $${b.spent.toLocaleString()} / $${b.limit.toLocaleString()} (${b.usagePercent}% used)`).join('\n') : '  None'}

CRYPTO HOLDINGS (Investment: $${totalCryptoInvestment.toLocaleString()}):
${cryptoInfo.length > 0 ? cryptoInfo.map(c => `  - ${c.name} (${c.symbol}): ${c.quantity} @ $${c.purchasePrice.toLocaleString()}`).join('\n') : '  None'}

CURRENCY/GOLD HOLDINGS (Investment: $${totalCurrencyInvestment.toLocaleString()}):
${currencyInfo.length > 0 ? currencyInfo.map(c => `  - ${c.name}: ${c.quantity} @ $${c.purchasePrice.toLocaleString()}`).join('\n') : '  None'}

CATEGORY SPENDING:
${topCategories.length > 0 ? topCategories.map(c => `  - ${c}`).join('\n') : '  None'}

SAVINGS GOALS:
${goalsInfo.length > 0 ? goalsInfo.map(g => `  - ${g.name}: $${g.current.toLocaleString()} / $${g.target.toLocaleString()} (${g.progress}%)`).join('\n') : '  None'}

ALL TRANSACTIONS (${allTransactions.length} total):
${allTransactions.slice(0, 100).map(t => `  - ${t.date}: ${t.type === 'income' ? '+' : '-'}$${t.amount.toLocaleString()} (${t.category}${t.description ? ': ' + t.description : ''})`).join('\n') || '  No transactions'}
${allTransactions.length > 100 ? `  ... and ${allTransactions.length - 100} more` : ''}

Respond in English, be concise and actionable. You have access to ALL data.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error: unknown) {
    console.error('Error in financial-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
