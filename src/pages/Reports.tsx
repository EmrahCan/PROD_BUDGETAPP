import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, subYears, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useDemo, DEMO_MOCK_DATA } from "@/contexts/DemoContext";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Receipt, PiggyBank, CalendarIcon, BarChart3, FileSpreadsheet, FileText, Download, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { useDateFormat } from "@/hooks/useDateFormat";
import { getCategoryChartColor } from "@/utils/categoryConfig";
import { exportToExcel, exportToPDF } from "@/utils/reportExport";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AIReportAssistant } from "@/components/reports/AIReportAssistant";

export default function Reports() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { isDemoMode, demoData } = useDemo();
  const { formatCurrency, formatCurrencyCompact } = useCurrencyFormat();
  const { formatFromTRY } = useDisplayCurrency();
  const { formatShortDate, getLocale, formatShortMonth } = useDateFormat();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [fixedPayments, setFixedPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  
  // Date range filter state
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 11)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [activePreset, setActivePreset] = useState<string>('12months');

  // Quick date presets
  const datePresets = [
    { 
      key: 'thisWeek', 
      label: t('reports.thisWeek'), 
      getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) })
    },
    { 
      key: 'thisMonth', 
      label: t('reports.thisMonth'), 
      getRange: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
    },
    { 
      key: 'lastMonth', 
      label: t('reports.lastMonth'), 
      getRange: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) })
    },
    { 
      key: '3months', 
      label: t('reports.last3Months'), 
      getRange: () => ({ start: startOfMonth(subMonths(new Date(), 2)), end: endOfMonth(new Date()) })
    },
    { 
      key: '6months', 
      label: t('reports.last6Months'), 
      getRange: () => ({ start: startOfMonth(subMonths(new Date(), 5)), end: endOfMonth(new Date()) })
    },
    { 
      key: '12months', 
      label: t('reports.last12Months'), 
      getRange: () => ({ start: startOfMonth(subMonths(new Date(), 11)), end: endOfMonth(new Date()) })
    },
    { 
      key: 'thisYear', 
      label: t('reports.thisYear'), 
      getRange: () => ({ start: startOfYear(new Date()), end: endOfMonth(new Date()) })
    },
    { 
      key: 'lastYear', 
      label: t('reports.lastYear'), 
      getRange: () => ({ start: startOfYear(subYears(new Date(), 1)), end: endOfMonth(subYears(new Date(), 1)) })
    },
  ];

  const handlePresetClick = (preset: typeof datePresets[0]) => {
    const range = preset.getRange();
    setStartDate(range.start);
    setEndDate(range.end);
    setActivePreset(preset.key);
  };

  // Generate demo transactions for the last 12 months
  const generateDemoTransactions = () => {
    const demoTx: any[] = [...DEMO_MOCK_DATA.transactions];
    const categories = ['food', 'transport', 'shopping', 'entertainment', 'health', 'utilities', 'rent', 'education'];
    
    // Generate more transactions for the past 12 months
    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - monthOffset);
      
      // Monthly salary
      demoTx.push({
        id: `demo-salary-${monthOffset}`,
        user_id: 'demo-user-id',
        amount: 28500 + Math.random() * 2000,
        transaction_type: 'income',
        category: 'salary',
        description: `Maaş - ${format(baseDate, 'MMMM yyyy', { locale: getLocale() })}`,
        transaction_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1), 'yyyy-MM-dd'),
        currency: 'TRY',
      });

      // Random bonus income sometimes
      if (Math.random() > 0.7) {
        demoTx.push({
          id: `demo-bonus-${monthOffset}`,
          user_id: 'demo-user-id',
          amount: 3000 + Math.random() * 5000,
          transaction_type: 'income',
          category: 'investment',
          description: 'Yatırım Getirisi',
          transaction_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 15), 'yyyy-MM-dd'),
          currency: 'TRY',
        });
      }

      // Random expenses throughout the month
      for (let day = 1; day <= 28; day += Math.floor(Math.random() * 4) + 1) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        let amount = 100 + Math.random() * 500;
        
        if (category === 'rent') amount = 12000;
        else if (category === 'utilities') amount = 800 + Math.random() * 400;
        else if (category === 'shopping') amount = 500 + Math.random() * 2000;
        
        demoTx.push({
          id: `demo-exp-${monthOffset}-${day}`,
          user_id: 'demo-user-id',
          amount,
          transaction_type: 'expense',
          category,
          description: `${t(`categories.${category}`, category)} harcaması`,
          transaction_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), day), 'yyyy-MM-dd'),
          currency: 'TRY',
        });
      }
    }
    
    return demoTx;
  };

  useEffect(() => {
    if (isDemoMode) {
      const demoTransactions = generateDemoTransactions();
      setTransactions(demoTransactions);
      setAccounts(DEMO_MOCK_DATA.accounts);
      setCards(DEMO_MOCK_DATA.credit_cards);
      setFixedPayments(DEMO_MOCK_DATA.fixed_payments);
      setInstallments(DEMO_MOCK_DATA.installments);
      setLoans(DEMO_MOCK_DATA.loans);
      setLoading(false);
      return;
    }

    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      
      const [
        { data: transactionsData },
        { data: accountsData },
        { data: cardsData },
        { data: fixedData },
        { data: installmentsData },
        { data: loansData }
      ] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
        supabase.from("accounts").select("*").eq("user_id", user.id),
        supabase.from("credit_cards").select("*").eq("user_id", user.id),
        supabase.from("fixed_payments").select("*").eq("user_id", user.id).eq("is_active", true),
        supabase.from("installments").select("*").eq("user_id", user.id).eq("is_active", true),
        supabase.from("loans").select("*").eq("user_id", user.id).eq("is_active", true)
      ]);
      
      setTransactions(transactionsData || []);
      setAccounts(accountsData || []);
      setCards(cardsData || []);
      setFixedPayments(fixedData || []);
      setInstallments(installmentsData || []);
      setLoans(loansData || []);
      setLoading(false);
    };

    fetchData();
  }, [user, isDemoMode]);

  // Calculate summary data
  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const totalCardDebt = cards.reduce((sum, card) => sum + Number(card.balance), 0);
  const totalFixedPayments = fixedPayments.reduce((sum, fp) => sum + Number(fp.amount), 0);
  const totalInstallmentsRemaining = installments.reduce((sum, inst) => {
    const remaining = (inst.total_months - inst.paid_months) * Number(inst.monthly_amount);
    return sum + remaining;
  }, 0);

  // Filter transactions by date range
  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date);
    return date >= startDate && date <= endDate;
  });

  // Get unique months in the selected range
  const getMonthsInRange = () => {
    const months: { year: number; month: number; label: string }[] = [];
    
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (current <= end) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth(),
        label: `${format(current, 'MMM', { locale: getLocale() })} ${current.getFullYear().toString().slice(-2)}`
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  };

  // Monthly income/expense calculation based on filtered range
  const monthlyData = getMonthsInRange().map(({ year, month, label }) => {
    const monthTransactions = filteredTransactions.filter(t => {
      const date = new Date(t.transaction_date);
      return date.getFullYear() === year && date.getMonth() === month;
    });
    
    const income = monthTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expense = monthTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return {
      month: label,
      income,
      expense,
      net: income - expense
    };
  });

  // Category spending calculation based on filtered transactions
  const categoryData = filteredTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((acc: any[], t) => {
      const existing = acc.find(item => item.category === t.category);
      if (existing) {
        existing.amount += Number(t.amount);
      } else {
        acc.push({ category: t.category, amount: Number(t.amount) });
      }
      return acc;
    }, [])
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Total income/expense for the selected period
  const periodIncome = filteredTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const periodExpense = filteredTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Calculate previous period for comparison
  const periodDays = differenceInDays(endDate, startDate) + 1;
  const previousPeriodEnd = new Date(startDate);
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
  const previousPeriodStart = new Date(previousPeriodEnd);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays + 1);

  const previousPeriodTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date);
    return date >= previousPeriodStart && date <= previousPeriodEnd;
  });

  const previousPeriodIncome = previousPeriodTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const previousPeriodExpense = previousPeriodTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const incomeChange = calculateChange(periodIncome, previousPeriodIncome);
  const expenseChange = calculateChange(periodExpense, previousPeriodExpense);
  const netChange = calculateChange(periodIncome - periodExpense, previousPeriodIncome - previousPeriodExpense);

  // Transaction count comparison
  const currentTransactionCount = filteredTransactions.length;
  const previousTransactionCount = previousPeriodTransactions.length;
  const transactionCountChange = calculateChange(currentTransactionCount, previousTransactionCount);

  // Average daily spending
  const avgDailySpending = periodExpense / (periodDays || 1);
  const prevAvgDailySpending = previousPeriodExpense / (periodDays || 1);
  const avgDailyChange = calculateChange(avgDailySpending, prevAvgDailySpending);

  // Savings rate
  const savingsRate = periodIncome > 0 ? ((periodIncome - periodExpense) / periodIncome) * 100 : 0;
  const prevSavingsRate = previousPeriodIncome > 0 ? ((previousPeriodIncome - previousPeriodExpense) / previousPeriodIncome) * 100 : 0;
  const savingsRateChange = savingsRate - prevSavingsRate;

  // Export handlers
  const handleExportExcel = () => {
    // Demo mode simulation
    if (isDemoMode) {
      toast.info(t('demo.exportSimulation') || 'Demo: Excel dosyası indirildi (simülasyon)');
      return;
    }

    try {
      const exportData = {
        summary: {
          totalBalance,
          totalCardDebt,
          totalFixedPayments,
          totalInstallmentsRemaining,
          periodIncome,
          periodExpense,
          netBalance: periodIncome - periodExpense,
        },
        monthlyData,
        categoryData,
        transactions: filteredTransactions.map(t => ({
          date: format(new Date(t.transaction_date), 'dd/MM/yyyy'),
          description: t.description || '-',
          category: t.category,
          type: t.transaction_type,
          amount: Number(t.amount),
        })),
        dateRange: { start: startDate, end: endDate },
        translations: {
          title: t('reports.title'),
          summary: t('reports.summary'),
          totalAssets: t('reports.totalAssets'),
          totalDebt: t('reports.totalDebt'),
          monthlyObligations: t('reports.monthlyObligations'),
          remainingInstallments: t('reports.remainingInstallments'),
          periodIncome: t('reports.periodIncome'),
          periodExpense: t('reports.periodExpense'),
          netBalance: t('reports.netBalance'),
          monthlyTrend: t('reports.monthlyTrend'),
          month: t('reports.month'),
          income: t('reports.income'),
          expense: t('reports.expense'),
          categorySpending: t('reports.categorySpending'),
          category: t('reports.category'),
          amount: t('reports.amount'),
          transactions: t('reports.transactions'),
          date: t('reports.date'),
          description: t('reports.transactionDescription'),
          type: t('reports.type'),
          incomeType: t('reports.incomeType'),
          expenseType: t('reports.expenseType'),
          reportGenerated: t('reports.reportGenerated'),
          dateRange: t('reports.dateRange'),
        },
        formatCurrency,
      };
      
      exportToExcel(exportData);
      toast.success(t('reports.exportSuccess'));
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error(t('reports.exportError'));
    }
  };

  const handleExportPDF = () => {
    // Demo mode simulation
    if (isDemoMode) {
      toast.info(t('demo.exportSimulation') || 'Demo: PDF dosyası indirildi (simülasyon)');
      return;
    }

    try {
      const exportData = {
        summary: {
          totalBalance,
          totalCardDebt,
          totalFixedPayments,
          totalInstallmentsRemaining,
          periodIncome,
          periodExpense,
          netBalance: periodIncome - periodExpense,
        },
        monthlyData,
        categoryData,
        transactions: filteredTransactions.map(t => ({
          date: format(new Date(t.transaction_date), 'dd/MM/yyyy'),
          description: t.description || '-',
          category: t.category,
          type: t.transaction_type,
          amount: Number(t.amount),
        })),
        dateRange: { start: startDate, end: endDate },
        translations: {
          title: t('reports.title'),
          summary: t('reports.summary'),
          totalAssets: t('reports.totalAssets'),
          totalDebt: t('reports.totalDebt'),
          monthlyObligations: t('reports.monthlyObligations'),
          remainingInstallments: t('reports.remainingInstallments'),
          periodIncome: t('reports.periodIncome'),
          periodExpense: t('reports.periodExpense'),
          netBalance: t('reports.netBalance'),
          monthlyTrend: t('reports.monthlyTrend'),
          month: t('reports.month'),
          income: t('reports.income'),
          expense: t('reports.expense'),
          categorySpending: t('reports.categorySpending'),
          category: t('reports.category'),
          amount: t('reports.amount'),
          transactions: t('reports.transactions'),
          date: t('reports.date'),
          description: t('reports.transactionDescription'),
          type: t('reports.type'),
          incomeType: t('reports.incomeType'),
          expenseType: t('reports.expenseType'),
          reportGenerated: t('reports.reportGenerated'),
          dateRange: t('reports.dateRange'),
        },
        formatCurrency,
      };
      
      exportToPDF(exportData);
      toast.success(t('reports.exportSuccess'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('reports.exportError'));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-64 mb-8" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </Card>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-64 w-full" />
              </Card>
              <Card className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-64 w-full" />
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
        {/* Header with Date Filter */}
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-500/60 shadow-lg">
                <BarChart3 className="h-5 w-5 lg:h-8 lg:w-8 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg lg:text-3xl font-bold text-foreground truncate">{t('reports.title')}</h1>
                <p className="text-xs lg:text-base text-muted-foreground hidden sm:block">{t('reports.description')}</p>
              </div>
            </div>
            
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 lg:gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('reports.export')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  {t('reports.exportExcel')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-red-600" />
                  {t('reports.exportPDF')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Quick Date Presets */}
          <div className="flex flex-wrap gap-1.5 lg:gap-2">
            {datePresets.map((preset) => (
              <Button
                key={preset.key}
                variant={activePreset === preset.key ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "text-xs lg:text-sm h-7 lg:h-8 px-2 lg:px-3",
                  activePreset === preset.key && "bg-primary text-primary-foreground"
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Range Filter */}
          <div className="flex items-center gap-1.5 lg:gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{t('reports.customRange')}:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal text-xs lg:text-sm min-w-[100px] lg:min-w-[140px]",
                    !startDate && "text-muted-foreground"
                  )}
                  onClick={() => setActivePreset('custom')}
                >
                  <CalendarIcon className="mr-1 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
                  {startDate ? format(startDate, "dd MMM yy", { locale: getLocale() }) : t('reports.startDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => { date && setStartDate(date); setActivePreset('custom'); }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  locale={getLocale()}
                />
              </PopoverContent>
            </Popover>
            
            <span className="text-muted-foreground text-xs">-</span>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal text-xs lg:text-sm min-w-[100px] lg:min-w-[140px]",
                    !endDate && "text-muted-foreground"
                  )}
                  onClick={() => setActivePreset('custom')}
                >
                  <CalendarIcon className="mr-1 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
                  {endDate ? format(endDate, "dd MMM yy", { locale: getLocale() }) : t('reports.endDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => { date && setEndDate(date); setActivePreset('custom'); }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  locale={getLocale()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* AI Report Assistant */}
        <AIReportAssistant startDate={startDate} endDate={endDate} />

        {/* Summary Cards - 2x2 grid on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-6">
          <Card className="p-3 lg:p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 lg:h-6 lg:w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('reports.totalAssets')}</p>
                <p className="text-sm lg:text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">{formatFromTRY(totalBalance)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 lg:p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 lg:h-6 lg:w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('reports.totalDebt')}</p>
                <p className="text-sm lg:text-xl font-bold text-red-600 dark:text-red-400 truncate">{formatFromTRY(totalCardDebt)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 lg:p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 lg:h-6 lg:w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('reports.monthlyObligations')}</p>
                <p className="text-sm lg:text-xl font-bold text-amber-600 dark:text-amber-400 truncate">{formatFromTRY(totalFixedPayments)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 lg:p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <PiggyBank className="h-4 w-4 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('reports.remainingInstallments')}</p>
                <p className="text-sm lg:text-xl font-bold text-purple-600 dark:text-purple-400 truncate">{formatFromTRY(totalInstallmentsRemaining)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Period Comparison - with percentage changes */}
        <Card className="p-3 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h3 className="text-sm lg:text-lg font-semibold">{t('reports.periodComparison')}</h3>
            <span className="text-[10px] lg:text-xs text-muted-foreground">
              {t('reports.vsPreviousPeriod')}
            </span>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Period Income */}
            <div className="space-y-1">
              <p className="text-[10px] lg:text-xs text-muted-foreground">{t('reports.periodIncome')}</p>
              <p className="text-sm lg:text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatFromTRY(periodIncome)}</p>
              <div className={`flex items-center gap-1 text-[10px] lg:text-xs ${incomeChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {incomeChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : incomeChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                <span>{incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}%</span>
              </div>
              <p className="text-[9px] lg:text-[10px] text-muted-foreground">{t('reports.previous')}: {formatFromTRY(previousPeriodIncome)}</p>
            </div>

            {/* Period Expense */}
            <div className="space-y-1">
              <p className="text-[10px] lg:text-xs text-muted-foreground">{t('reports.periodExpense')}</p>
              <p className="text-sm lg:text-xl font-bold text-red-600 dark:text-red-400">{formatFromTRY(periodExpense)}</p>
              <div className={`flex items-center gap-1 text-[10px] lg:text-xs ${expenseChange <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {expenseChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : expenseChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                <span>{expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}%</span>
              </div>
              <p className="text-[9px] lg:text-[10px] text-muted-foreground">{t('reports.previous')}: {formatFromTRY(previousPeriodExpense)}</p>
            </div>

            {/* Net Balance */}
            <div className="space-y-1">
              <p className="text-[10px] lg:text-xs text-muted-foreground">{t('reports.netBalance')}</p>
              <p className={`text-sm lg:text-xl font-bold ${periodIncome - periodExpense >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatFromTRY(periodIncome - periodExpense)}
              </p>
              <div className={`flex items-center gap-1 text-[10px] lg:text-xs ${netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {netChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : netChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                <span>{netChange >= 0 ? '+' : ''}{netChange.toFixed(1)}%</span>
              </div>
              <p className="text-[9px] lg:text-[10px] text-muted-foreground">{t('reports.previous')}: {formatFromTRY(previousPeriodIncome - previousPeriodExpense)}</p>
            </div>

            {/* Savings Rate */}
            <div className="space-y-1">
              <p className="text-[10px] lg:text-xs text-muted-foreground">{t('reports.savingsRate')}</p>
              <p className={`text-sm lg:text-xl font-bold ${savingsRate >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {savingsRate.toFixed(1)}%
              </p>
              <div className={`flex items-center gap-1 text-[10px] lg:text-xs ${savingsRateChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {savingsRateChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : savingsRateChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                <span>{savingsRateChange >= 0 ? '+' : ''}{savingsRateChange.toFixed(1)}pp</span>
              </div>
              <p className="text-[9px] lg:text-[10px] text-muted-foreground">{t('reports.previous')}: {prevSavingsRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
          {/* Transaction Count */}
          <Card className="p-3 lg:p-4">
            <p className="text-[10px] lg:text-xs text-muted-foreground">{t('reports.transactionCount')}</p>
            <p className="text-lg lg:text-2xl font-bold">{currentTransactionCount}</p>
            <div className={`flex items-center gap-1 text-[10px] lg:text-xs ${transactionCountChange >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
              {transactionCountChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : transactionCountChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              <span>{transactionCountChange >= 0 ? '+' : ''}{transactionCountChange.toFixed(0)}%</span>
              <span className="text-muted-foreground">({previousTransactionCount})</span>
            </div>
          </Card>

          {/* Average Daily Spending */}
          <Card className="p-3 lg:p-4">
            <p className="text-[10px] lg:text-xs text-muted-foreground">{t('reports.avgDailySpending')}</p>
            <p className="text-lg lg:text-2xl font-bold text-amber-600 dark:text-amber-400">{formatFromTRY(avgDailySpending)}</p>
            <div className={`flex items-center gap-1 text-[10px] lg:text-xs ${avgDailyChange <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {avgDailyChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : avgDailyChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              <span>{avgDailyChange >= 0 ? '+' : ''}{avgDailyChange.toFixed(1)}%</span>
            </div>
          </Card>

          {/* Period Days */}
          <Card className="p-3 lg:p-4">
            <p className="text-[10px] lg:text-xs text-muted-foreground">{t('reports.periodDays')}</p>
            <p className="text-lg lg:text-2xl font-bold">{periodDays}</p>
            <p className="text-[10px] lg:text-xs text-muted-foreground">
              {format(startDate, 'dd MMM', { locale: getLocale() })} - {format(endDate, 'dd MMM', { locale: getLocale() })}
            </p>
          </Card>

          {/* Expense per Transaction */}
          <Card className="p-3 lg:p-4">
            <p className="text-[10px] lg:text-xs text-muted-foreground">{t('reports.avgPerTransaction')}</p>
            <p className="text-lg lg:text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatFromTRY(filteredTransactions.filter(t => t.transaction_type === 'expense').length > 0 
                ? periodExpense / filteredTransactions.filter(t => t.transaction_type === 'expense').length 
                : 0)}
            </p>
            <p className="text-[10px] lg:text-xs text-muted-foreground">
              {filteredTransactions.filter(t => t.transaction_type === 'expense').length} {t('reports.expenseTransactions')}
            </p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Monthly Income/Expense Chart */}
          <Card>
            <CardHeader className="p-3 lg:p-6 pb-2 lg:pb-2">
              <CardTitle className="text-sm lg:text-lg">{t('reports.monthlyTrend')}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 lg:p-6 pt-0">
              <div className="h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                      interval={0} 
                      angle={-45} 
                      textAnchor="end" 
                      height={55}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
                      width={40}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatFromTRY(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))', 
                        fontSize: '12px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar 
                      dataKey="income" 
                      name={t('reports.income')} 
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]}
                      maxBarSize={35}
                    />
                    <Bar 
                      dataKey="expense" 
                      name={t('reports.expense')} 
                      fill="#ef4444" 
                      radius={[6, 6, 0, 0]}
                      maxBarSize={35}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Spending Pie Chart */}
          <Card>
            <CardHeader className="p-3 lg:p-6 pb-2 lg:pb-2">
              <CardTitle className="text-sm lg:text-lg">{t('reports.categorySpending')}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 lg:p-6 pt-0">
              <div className="h-64 lg:h-80">
                {categoryData.length > 0 ? (
                  <div className="flex flex-col lg:flex-row h-full gap-2">
                    {/* Chart */}
                    <div className="flex-1 min-h-[160px] lg:min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius="85%"
                            innerRadius="50%"
                            fill="#8884d8"
                            dataKey="amount"
                            paddingAngle={2}
                          >
                            {categoryData.map((entry) => (
                              <Cell key={`cell-${entry.category}`} fill={getCategoryChartColor(entry.category)} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number, name: string, props: any) => [formatFromTRY(value), String(t(`categories.${props.payload.category}`, props.payload.category))]}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))', 
                              fontSize: '12px',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Custom Legend */}
                    <div className="flex flex-wrap lg:flex-col gap-1.5 lg:gap-2 justify-center lg:justify-start lg:w-40 lg:overflow-y-auto lg:max-h-full">
                      {categoryData.map((entry) => {
                        const total = categoryData.reduce((sum, e) => sum + e.amount, 0);
                        const percentage = ((entry.amount / total) * 100).toFixed(0);
                        return (
                          <div 
                            key={entry.category} 
                            className="flex items-center gap-1.5 lg:gap-2 text-[10px] lg:text-xs px-1.5 py-0.5 lg:px-0 lg:py-0"
                          >
                            <div 
                              className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: getCategoryChartColor(entry.category) }}
                            />
                            <span className="truncate max-w-[60px] lg:max-w-[80px]">
                              {String(t(`categories.${entry.category}`, entry.category))}
                            </span>
                            <span className="text-muted-foreground font-medium ml-auto">
                              {percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    {t('reports.noData')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
