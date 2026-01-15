import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { 
  History, 
  Calendar as CalendarIcon, 
  Receipt,
  CreditCard,
  ShoppingCart,
  CheckCircle2,
  Filter,
  Download,
  Wallet,
  Repeat,
  Building2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, startOfDay, isWithinInterval } from "date-fns";
import { tr, enUS, de } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface UnifiedPayment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  type: 'fixed_payment' | 'transaction' | 'installment' | 'credit_card';
  date: string;
  description?: string;
  extra?: string;
}

export default function PaymentHistory() {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedType, setSelectedType] = useState<string>("all");

  const getLocale = () => {
    switch (i18n.language) {
      case 'tr': return tr;
      case 'de': return de;
      default: return enUS;
    }
  };

  // Generate last 12 months for selector
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: getLocale() })
    };
  });

  useEffect(() => {
    if (isDemoMode) {
      loadDemoPayments();
    } else if (user) {
      fetchAllPayments();
    }
  }, [user, selectedMonth, isDemoMode]);

  const loadDemoPayments = () => {
    setLoading(true);
    const allPayments: UnifiedPayment[] = [];

    // Add payment records from fixed payments
    demoData.payment_records.forEach((record: any) => {
      const fixedPayment = demoData.fixed_payments.find((fp: any) => fp.id === record.fixed_payment_id);
      allPayments.push({
        id: `fp-${record.id}`,
        name: fixedPayment?.name || t('paymentHistory.fixedPayment'),
        amount: Number(record.amount),
        currency: fixedPayment?.currency || 'TRY',
        category: fixedPayment?.category || 'other',
        type: 'fixed_payment',
        date: record.paid_at,
      });
    });

    // Add expense transactions
    demoData.transactions
      .filter((tx: any) => tx.transaction_type === 'expense')
      .forEach((tx: any) => {
        const card = demoData.credit_cards.find((c: any) => c.id === tx.card_id);
        const account = demoData.accounts.find((a: any) => a.id === tx.account_id);
        let extra = '';
        if (card) extra = `${card.name} (*${card.last_four_digits})`;
        else if (account) extra = account.name;

        allPayments.push({
          id: `tx-${tx.id}`,
          name: tx.description || tx.category,
          amount: Number(tx.amount),
          currency: tx.currency,
          category: tx.category,
          type: 'transaction',
          date: tx.transaction_date,
          description: tx.description,
          extra,
        });
      });

    // Add installment payments
    demoData.installments
      .filter((inst: any) => inst.paid_months > 0)
      .forEach((inst: any) => {
        allPayments.push({
          id: `inst-${inst.id}`,
          name: inst.name,
          amount: Number(inst.monthly_amount) * inst.paid_months,
          currency: inst.currency,
          category: inst.category,
          type: 'installment',
          date: inst.updated_at || inst.created_at,
          extra: `${inst.paid_months}/${inst.total_months} ${t('installments.monthsPaid')}`,
        });
      });

    allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setPayments(allPayments);
    setLoading(false);
  };

  const fetchAllPayments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const allPayments: UnifiedPayment[] = [];
      
      // Date filter using selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // 1. Fixed Payment Records
      const { data: paymentRecords } = await supabase
        .from("payment_records")
        .select(`*, fixed_payment:fixed_payments(name, category, currency)`)
        .eq("user_id", user.id)
        .gte("paid_at", startDate.toISOString())
        .lte("paid_at", endDate.toISOString());
      
      if (paymentRecords) {
        paymentRecords.forEach(record => {
          allPayments.push({
            id: `fp-${record.id}`,
            name: record.fixed_payment?.name || t('paymentHistory.fixedPayment', 'Sabit Ödeme'),
            amount: Number(record.amount),
            currency: record.fixed_payment?.currency || 'TRY',
            category: record.fixed_payment?.category || 'other',
            type: 'fixed_payment',
            date: record.paid_at,
          });
        });
      }

      // 2. Transactions (expense type)
      const { data: transactions } = await supabase
        .from("transactions")
        .select(`*, account:accounts(name), card:credit_cards(name, last_four_digits)`)
        .eq("user_id", user.id)
        .eq("transaction_type", "expense")
        .gte("transaction_date", format(startDate, 'yyyy-MM-dd'))
        .lte("transaction_date", format(endDate, 'yyyy-MM-dd'));
      
      if (transactions) {
        transactions.forEach(tx => {
          let extra = '';
          if (tx.card) {
            extra = `${tx.card.name} (*${tx.card.last_four_digits})`;
          } else if (tx.account) {
            extra = tx.account.name;
          }
          
          allPayments.push({
            id: `tx-${tx.id}`,
            name: tx.description || t(`categories.${tx.category}`, tx.category),
            amount: Number(tx.amount),
            currency: tx.currency,
            category: tx.category,
            type: 'transaction',
            date: tx.transaction_date,
            description: tx.description || undefined,
            extra,
          });
        });
      }

      // 3. Installments with paid months
      const { data: installments } = await supabase
        .from("installments")
        .select("*")
        .eq("user_id", user.id)
        .gt("paid_months", 0);
      
      if (installments) {
        installments.forEach(inst => {
          // For installments, we show them based on updated_at when paid_months > 0
          const paymentDate = inst.updated_at || inst.created_at;
          const instDate = new Date(paymentDate);
          if (instDate < startDate || instDate > endDate) return;
          
          allPayments.push({
            id: `inst-${inst.id}`,
            name: inst.name,
            amount: Number(inst.monthly_amount) * inst.paid_months,
            currency: inst.currency,
            category: inst.category,
            type: 'installment',
            date: paymentDate,
            extra: `${inst.paid_months}/${inst.total_months} ${t('installments.monthsPaid', 'taksit ödendi')}`,
          });
        });
      }

      // 4. Credit Card Payments (from transactions linked to cards)
      // Already included in transactions above

      // Sort by date descending
      allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setPayments(allPayments);
    } catch (error: any) {
      console.error("Error fetching payment history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter by type
  const filteredPayments = selectedType === "all" 
    ? payments 
    : payments.filter(p => p.type === selectedType);

  const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const paymentCount = filteredPayments.length;

  // Calculate daily, weekly, monthly totals
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const monthStart = startOfMonth(now);

  const dailyTotal = payments.reduce((sum, p) => {
    const paymentDate = new Date(p.date);
    if (isWithinInterval(paymentDate, { start: todayStart, end: now })) {
      return sum + p.amount;
    }
    return sum;
  }, 0);

  const weeklyTotal = payments.reduce((sum, p) => {
    const paymentDate = new Date(p.date);
    if (isWithinInterval(paymentDate, { start: weekStart, end: now })) {
      return sum + p.amount;
    }
    return sum;
  }, 0);

  const monthlyTotal = payments.reduce((sum, p) => {
    const paymentDate = new Date(p.date);
    if (isWithinInterval(paymentDate, { start: monthStart, end: now })) {
      return sum + p.amount;
    }
    return sum;
  }, 0);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'rent': '🏠',
      'electricity': '⚡',
      'water': '💧',
      'gas': '🔥',
      'internet': '📶',
      'phone': '📱',
      'tv': '📺',
      'streaming': '✨',
      'insurance': '🛡️',
      'car': '🚗',
      'education': '🎓',
      'gym': '💪',
      'health': '❤️',
      'music': '🎵',
      'gaming': '🎮',
      'apartment': '🏢',
      'loan': '💳',
      'food': '🍔',
      'shopping': '🛒',
      'entertainment': '🎬',
      'travel': '✈️',
      'clothing': '👕',
      'electronics': '📱',
      'furniture': '🛋️',
      'other': '📋',
    };
    return icons[category] || '📋';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fixed_payment': return <Repeat className="h-4 w-4" />;
      case 'transaction': return <ShoppingCart className="h-4 w-4" />;
      case 'installment': return <CreditCard className="h-4 w-4" />;
      case 'credit_card': return <Wallet className="h-4 w-4" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed_payment': return t('paymentHistory.typeFixed', 'Sabit Ödeme');
      case 'transaction': return t('paymentHistory.typeTransaction', 'İşlem');
      case 'installment': return t('paymentHistory.typeInstallment', 'Taksit');
      case 'credit_card': return t('paymentHistory.typeCreditCard', 'Kredi Kartı');
      default: return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'fixed_payment': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'transaction': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'installment': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'credit_card': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const exportToCSV = () => {
    const headers = ['Tarih', 'Ödeme Adı', 'Tür', 'Kategori', 'Tutar', 'Para Birimi'];
    const rows = filteredPayments.map(p => [
      format(new Date(p.date), 'dd.MM.yyyy HH:mm'),
      p.name,
      getTypeLabel(p.type),
      p.category,
      p.amount.toString(),
      p.currency
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `odeme-gecmisi-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-500/60 shadow-lg">
              <History className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                {t('paymentHistory.title', 'Ödeme Geçmişi')}
              </h1>
              <p className="text-muted-foreground">
                {t('paymentHistory.description', 'Tüm yapılan ödemelerin listesi')}
              </p>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            {t('paymentHistory.export', 'CSV İndir')}
          </Button>
        </div>

        {/* Time-based Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border-sky-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('paymentHistory.dailyTotal', 'Bugün')}
                  </p>
                  <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                    {formatCurrency(dailyTotal)}
                  </p>
                </div>
                <CalendarIcon className="h-8 w-8 text-sky-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('paymentHistory.weeklyTotal', 'Bu Hafta')}
                  </p>
                  <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                    {formatCurrency(weeklyTotal)}
                  </p>
                </div>
                <CalendarIcon className="h-8 w-8 text-violet-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('paymentHistory.monthlyTotal', 'Bu Ay')}
                  </p>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(monthlyTotal)}
                  </p>
                </div>
                <CalendarIcon className="h-8 w-8 text-rose-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('paymentHistory.totalPaid', 'Toplam Ödenen')}
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('paymentHistory.paymentCount', 'Ödeme Sayısı')}
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {paymentCount}
                  </p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('paymentHistory.fixedPayments', 'Sabit Ödemeler')}
                  </p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {payments.filter(p => p.type === 'fixed_payment').length}
                  </p>
                </div>
                <Repeat className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('paymentHistory.transactions', 'İşlemler')}
                  </p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {payments.filter(p => p.type === 'transaction').length}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('paymentHistory.filters', 'Filtreler')}
              </CardTitle>
              <div className="flex flex-wrap gap-3 items-center">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[200px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('paymentHistory.selectType', 'Tür Seç')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('paymentHistory.allTypes', 'Tüm Türler')}</SelectItem>
                    <SelectItem value="fixed_payment">{t('paymentHistory.typeFixed', 'Sabit Ödemeler')}</SelectItem>
                    <SelectItem value="transaction">{t('paymentHistory.typeTransaction', 'İşlemler')}</SelectItem>
                    <SelectItem value="installment">{t('paymentHistory.typeInstallment', 'Taksitler')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Payment List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('paymentHistory.payments', 'Ödemeler')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {t('paymentHistory.noPayments', 'Henüz ödeme kaydı yok')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPayments.map((payment, index) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-all animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xl">
                        {getCategoryIcon(payment.category)}
                      </div>
                      <div>
                        <p className="font-medium">{payment.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(payment.date), 'dd MMM yyyy', { locale: getLocale() })}
                          </span>
                          {payment.extra && (
                            <span className="text-xs text-muted-foreground">
                              • {payment.extra}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <Badge className={`text-xs ${getTypeBadgeColor(payment.type)}`}>
                        {getTypeIcon(payment.type)}
                        <span className="ml-1">{getTypeLabel(payment.type)}</span>
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
