import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { TransactionItemsDialog } from "@/components/transactions/TransactionItemsDialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { Trash2, ArrowUpCircle, ArrowDownCircle, Filter, X, ImageIcon, ChevronDown, ChevronUp, Receipt, Package, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useDateFormat } from "@/hooks/useDateFormat";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getCategoryConfig, getCategoryChartColor, groupedCategories } from "@/utils/categoryConfig";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function Transactions() {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { formatLongDate, formatShortMonth, getLocale } = useDateFormat();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [lastDeletedTransaction, setLastDeletedTransaction] = useState<any | null>(null);
  const [selectedTransactionForItems, setSelectedTransactionForItems] = useState<any | null>(null);
  const [editTransaction, setEditTransaction] = useState<any | null>(null);
  
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (user || isDemoMode) {
      fetchTransactions();
    }
  }, [user, isDemoMode]);

  const fetchTransactions = async () => {
    if (isDemoMode) {
      setTransactions(demoData.transactions);
      setLoading(false);
      return;
    }
    
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch regular transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch payment records with fixed payment details
      const { data: paymentRecords, error: paymentRecordsError } = await supabase
        .from("payment_records")
        .select(`
          *,
          fixed_payments (
            name,
            category,
            currency,
            account_id,
            card_id
          )
        `)
        .eq("user_id", user.id);

      if (paymentRecordsError) throw paymentRecordsError;

      // Convert payment records to transaction format
      const fixedPaymentTransactions = (paymentRecords || [])
        .filter(record => record.fixed_payments)
        .map(record => ({
          id: `fixed-${record.id}`,
          user_id: record.user_id,
          amount: record.amount,
          transaction_type: "expense",
          category: record.fixed_payments?.category || "other",
          description: record.fixed_payments?.name || "",
          transaction_date: record.paid_at || record.created_at,
          account_id: record.fixed_payments?.account_id,
          card_id: record.fixed_payments?.card_id,
          currency: record.fixed_payments?.currency || "TRY",
          created_at: record.created_at,
          is_fixed_payment: true,
          fixed_payment_id: record.fixed_payment_id
        }));

      // Combine and sort by date (most recent first)
      const allTransactions = [...(transactionsData || []), ...fixedPaymentTransactions]
        .sort((a, b) => {
          const dateA = new Date(a.transaction_date || a.created_at).getTime();
          const dateB = new Date(b.transaction_date || b.created_at).getTime();
          if (dateB !== dateA) return dateB - dateA;
          // Secondary sort by created_at for same dates
          const createdA = new Date(a.created_at).getTime();
          const createdB = new Date(b.created_at).getTime();
          return createdB - createdA;
        });

      setTransactions(allTransactions);
    } catch (error: any) {
      toast.error(t('transactions.transactionsLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      // First, get the transaction to store for undo
      const { data: transaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", deleteId)
        .single();

      if (fetchError) throw fetchError;

      let accountBalanceChange: number | undefined;
      let cardBalanceChange: number | undefined;

      // Restore account balance if transaction was linked to an account
      if (transaction.account_id) {
        const { data: account } = await supabase
          .from("accounts")
          .select("balance")
          .eq("id", transaction.account_id)
          .single();

        if (account) {
          // If it was an expense, add the amount back; if income, subtract it
          const amount = Number(transaction.amount);
          const newBalance = transaction.transaction_type === "expense"
            ? Number(account.balance) + amount
            : Number(account.balance) - amount;
          
          accountBalanceChange = newBalance - Number(account.balance);

          await supabase
            .from("accounts")
            .update({ balance: newBalance })
            .eq("id", transaction.account_id);
        }
      }

      // Restore card balance if transaction was linked to a card
      if (transaction.card_id) {
        const { data: card } = await supabase
          .from("credit_cards")
          .select("balance")
          .eq("id", transaction.card_id)
          .single();

        if (card) {
          // If it was an expense, subtract from card debt; if income (payment), add back
          const amount = Number(transaction.amount);
          const newBalance = transaction.transaction_type === "expense"
            ? Number(card.balance) - amount
            : Number(card.balance) + amount;
          
          cardBalanceChange = newBalance - Number(card.balance);

          await supabase
            .from("credit_cards")
            .update({ balance: newBalance })
            .eq("id", transaction.card_id);
        }
      }

      // Now delete the transaction
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      // Clear any existing undo state
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      // Set a timeout to clear the undo state after 10 seconds
      undoTimeoutRef.current = setTimeout(() => {
        setLastDeletedTransaction(null);
      }, 10000);

      // Store data for undo
      const undoData = {
        transaction,
        accountBalanceChange,
        cardBalanceChange
      };
      setLastDeletedTransaction(undoData);

      // Show toast with undo button - perform undo inline
      toastIdRef.current = toast.success(t('transactions.transactionDeleted'), {
        duration: 10000,
        action: {
          label: t('transactions.undo'),
          onClick: async () => {
            try {
              // Restore the transaction
              await supabase.from('transactions').insert({
                id: transaction.id,
                user_id: transaction.user_id,
                amount: transaction.amount,
                transaction_type: transaction.transaction_type,
                category: transaction.category,
                description: transaction.description,
                transaction_date: transaction.transaction_date,
                account_id: transaction.account_id,
                card_id: transaction.card_id,
                currency: transaction.currency,
                receipt_image_url: transaction.receipt_image_url,
              });

              // Restore account balance
              if (transaction.account_id && accountBalanceChange !== undefined) {
                const { data: acc } = await supabase
                  .from('accounts')
                  .select('balance')
                  .eq('id', transaction.account_id)
                  .single();

                if (acc) {
                  await supabase
                    .from('accounts')
                    .update({ balance: Number(acc.balance) - accountBalanceChange })
                    .eq('id', transaction.account_id);
                }
              }

              // Restore card balance
              if (transaction.card_id && cardBalanceChange !== undefined) {
                const { data: crd } = await supabase
                  .from('credit_cards')
                  .select('balance')
                  .eq('id', transaction.card_id)
                  .single();

                if (crd) {
                  await supabase
                    .from('credit_cards')
                    .update({ balance: Number(crd.balance) - cardBalanceChange })
                    .eq('id', transaction.card_id);
                }
              }

              toast.success(t('transactions.transactionRestored'));
              setLastDeletedTransaction(null);
              if (undoTimeoutRef.current) {
                clearTimeout(undoTimeoutRef.current);
              }
              fetchTransactions();
            } catch (undoError) {
              toast.error(t('transactions.undoError'));
              console.error('Undo error:', undoError);
            }
          },
        },
      });

      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteId(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const filteredTransactions = transactions
    .filter(t => filterType === "all" || t.transaction_type === filterType)
    .filter(t => filterCategory === "all" || t.category === filterCategory)
    .filter(t => {
      if (!startDate && !endDate) return true;
      const transactionDate = new Date(t.transaction_date);
      if (startDate && transactionDate < startDate) return false;
      if (endDate && transactionDate > endDate) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        case "date-asc":
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        case "amount-desc":
          return parseFloat(b.amount) - parseFloat(a.amount);
        case "amount-asc":
          return parseFloat(a.amount) - parseFloat(b.amount);
        default:
          return 0;
      }
    });

  const clearFilters = () => {
    setFilterType("all");
    setFilterCategory("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setSortBy("date-desc");
  };

  const activeFiltersCount = 
    (filterType !== "all" ? 1 : 0) + 
    (filterCategory !== "all" ? 1 : 0) + 
    (startDate ? 1 : 0) + 
    (endDate ? 1 : 0);

  const totalIncome = transactions
    .filter(t => t.transaction_type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.transaction_type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  // Monthly data for bar chart
  const monthlyData = useMemo(() => {
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return last6Months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const income = transactions
        .filter(t => {
          const date = new Date(t.transaction_date);
          return t.transaction_type === "income" && date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const expense = transactions
        .filter(t => {
          const date = new Date(t.transaction_date);
          return t.transaction_type === "expense" && date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      return {
        month: format(month, "MMM", { locale: getLocale() }),
        gelir: income,
        gider: expense
      };
    });
  }, [transactions]);

  // Category data for pie chart
  const categoryData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};

    transactions
      .filter(t => t.transaction_type === "expense")
      .forEach(t => {
        const category = t.category || "Diğer";
        expensesByCategory[category] = (expensesByCategory[category] || 0) + parseFloat(t.amount);
      });

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Yearly comparison data
  const yearlyComparisonData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);

    return months.map(monthIndex => {
      const monthName = format(new Date(currentYear, monthIndex, 1), "MMM", { locale: getLocale() });

      // Current year data
      const currentYearExpense = transactions
        .filter(t => {
          const date = new Date(t.transaction_date);
          return t.transaction_type === "expense" && 
                 date.getFullYear() === currentYear && 
                 date.getMonth() === monthIndex;
        })
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      // Last year data
      const lastYearExpense = transactions
        .filter(t => {
          const date = new Date(t.transaction_date);
          return t.transaction_type === "expense" && 
                 date.getFullYear() === currentYear - 1 && 
                 date.getMonth() === monthIndex;
        })
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      return {
        month: monthName,
        buYil: currentYearExpense,
        gecenYil: lastYearExpense
      };
    });
  }, [transactions]);

  // Kategori renkleri artık getCategoryChartColor kullanılıyor

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-500/60 shadow-lg">
            <Receipt className="h-5 w-5 lg:h-8 lg:w-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg lg:text-3xl font-bold text-foreground truncate">{t('transactions.title')}</h1>
            <p className="text-xs lg:text-base text-muted-foreground hidden sm:block">{t('transactions.trackIncomeExpenses')}</p>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          {/* Summary Cards - Compact horizontal strip on mobile */}
          <div className="flex gap-1 lg:gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-3">
            <Card className="flex-1 min-w-0 p-1.5 lg:p-6">
              <div className="flex items-center gap-1 lg:gap-2 lg:flex-row lg:justify-between">
                <ArrowUpCircle className="h-3.5 w-3.5 lg:h-8 lg:w-8 text-green-600 shrink-0" />
                <div className="min-w-0 flex-1 lg:text-left">
                  <p className="text-[7px] lg:text-sm text-muted-foreground truncate lg:hidden">{t('transactions.totalIncomeShort')}</p>
                  <p className="text-[7px] lg:text-sm text-muted-foreground truncate hidden lg:block">{t('transactions.totalIncome')}</p>
                  <p className="text-[10px] lg:text-2xl font-bold text-green-600 truncate">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
            </Card>
            <Card className="flex-1 min-w-0 p-1.5 lg:p-6">
              <div className="flex items-center gap-1 lg:gap-2 lg:flex-row lg:justify-between">
                <ArrowDownCircle className="h-3.5 w-3.5 lg:h-8 lg:w-8 text-red-600 shrink-0" />
                <div className="min-w-0 flex-1 lg:text-left">
                  <p className="text-[7px] lg:text-sm text-muted-foreground truncate lg:hidden">{t('transactions.totalExpenseShort')}</p>
                  <p className="text-[7px] lg:text-sm text-muted-foreground truncate hidden lg:block">{t('transactions.totalExpense')}</p>
                  <p className="text-[10px] lg:text-2xl font-bold text-red-600 truncate">{formatCurrency(totalExpense)}</p>
                </div>
              </div>
            </Card>
            <Card className="flex-1 min-w-0 p-1.5 lg:p-6">
              <div className="flex items-center gap-1 lg:gap-2 lg:flex-row lg:justify-between">
                <div className={`h-3.5 w-3.5 lg:h-8 lg:w-8 rounded-full flex items-center justify-center shrink-0 ${(totalIncome - totalExpense) >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <span className={`text-[8px] lg:text-sm font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(totalIncome - totalExpense) >= 0 ? '+' : '-'}
                  </span>
                </div>
                <div className="min-w-0 flex-1 lg:text-left">
                  <p className="text-[7px] lg:text-sm text-muted-foreground truncate">{t('transactions.net')}</p>
                  <p className={`text-[10px] lg:text-2xl font-bold truncate ${(totalIncome - totalExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalIncome - totalExpense)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Transaction List - NOW AT TOP */}
          <Card className="p-2 lg:p-6">
            <div className="flex flex-col gap-2 lg:gap-4 mb-3 lg:mb-6">
              <div className="flex justify-between items-center gap-1.5">
                <h2 className="text-sm lg:text-xl font-bold truncate">{t('transactions.allTransactions')}</h2>
                <div className="flex gap-1 lg:gap-2 shrink-0">
                  {/* Bulk Rescan Button */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 lg:h-9 px-2 lg:px-3 gap-1 text-xs lg:text-sm">
                        <Filter className="h-3 w-3 lg:h-4 lg:w-4" />
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="text-[9px] lg:text-xs px-1 h-4">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 lg:w-80 bg-popover" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{t('transactions.filters')}</h4>
                          {activeFiltersCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                              <X className="h-4 w-4 mr-1" />
                              {t('transactions.clear')}
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('transactions.transactionType')}</label>
                          <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="all">{t('transactions.all')}</SelectItem>
                              <SelectItem value="income">{t('transactions.income')}</SelectItem>
                              <SelectItem value="expense">{t('transactions.expense')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('transactions.category')}</label>
                          <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover max-h-[300px]">
                              <SelectItem value="all">{t('transactions.all')}</SelectItem>
                              {Object.entries(groupedCategories).map(([groupName, cats]) => {
                                const groupKey = groupName === 'Gelir' ? 'groupIncome' 
                                  : groupName === 'Ev & Yaşam' ? 'groupHomeLife'
                                  : groupName === 'Market & Alışveriş' ? 'groupMarketShopping'
                                  : groupName === 'Ulaşım' ? 'groupTransport'
                                  : groupName === 'Yeme & İçme' ? 'groupFoodDrink'
                                  : groupName === 'Sağlık & Spor' ? 'groupHealthSport'
                                  : groupName === 'Eğlence & Hobi' ? 'groupEntertainment'
                                  : groupName === 'Eğitim' ? 'groupEducation'
                                  : groupName === 'Finans' ? 'groupFinance'
                                  : groupName === 'Abonelikler' ? 'groupSubscriptions'
                                  : 'groupOther';
                                return (
                                  <div key={groupName}>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                      {t(`categories.${groupKey}`)}
                                    </div>
                                    {cats.map((cat) => {
                                      const config = getCategoryConfig(cat);
                                      const IconComponent = config.icon;
                                      return (
                                        <SelectItem key={cat} value={cat}>
                                          <div className="flex items-center gap-2">
                                            <div className={`w-5 h-5 rounded flex items-center justify-center ${config.bgColor}`}>
                                              <IconComponent className={`h-3 w-3 ${config.color}`} />
                                            </div>
                                            {t(`categories.${cat}`, cat)}
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('transactions.startDate')}</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-background",
                                  !startDate && "text-muted-foreground"
                                )}
                              >
                                {startDate ? format(startDate, "PPP", { locale: getLocale() }) : t('transactions.startDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-popover" align="start">
                              <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={setStartDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('transactions.endDate')}</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-background",
                                  !endDate && "text-muted-foreground"
                                )}
                              >
                                {endDate ? format(endDate, "PPP", { locale: getLocale() }) : t('transactions.endDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-popover" align="start">
                              <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={setEndDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('transactions.sortBy')}</label>
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="date-desc">{t('transactions.dateNewest')}</SelectItem>
                              <SelectItem value="date-asc">{t('transactions.dateOldest')}</SelectItem>
                              <SelectItem value="amount-desc">{t('transactions.amountHighest')}</SelectItem>
                              <SelectItem value="amount-asc">{t('transactions.amountLowest')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <TransactionDialog onSuccess={fetchTransactions} />
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filterType !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {t('transactions.type')}: {filterType === "income" ? t('transactions.income') : t('transactions.expense')}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setFilterType("all")}
                      />
                    </Badge>
                  )}
                  {filterCategory !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {t('transactions.category')}: {t(`categories.${filterCategory}`, filterCategory) as string}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setFilterCategory("all")}
                      />
                    </Badge>
                  )}
                  {startDate && (
                    <Badge variant="secondary" className="gap-1">
                      {t('transactions.startDate')}: {format(startDate, "dd.MM.yyyy")}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setStartDate(undefined)}
                      />
                    </Badge>
                  )}
                  {endDate && (
                    <Badge variant="secondary" className="gap-1">
                      {t('transactions.endDate')}: {format(endDate, "dd.MM.yyyy")}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setEndDate(undefined)}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('transactions.noTransactionsFound')}</p>
            ) : (
              <TooltipProvider>
                <div className="space-y-1.5 lg:space-y-3">
                  {filteredTransactions.map((transaction) => {
                    const config = getCategoryConfig(transaction.category);
                    const IconComponent = config.icon;
                    
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center p-1.5 lg:p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer gap-1.5 lg:gap-3"
                        onClick={() => setSelectedTransactionForItems(transaction)}
                      >
                        {/* Icon */}
                        {transaction.receipt_image_url ? (
                          <a 
                            href={transaction.receipt_image_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="relative w-8 h-8 lg:w-12 lg:h-12 rounded-lg overflow-hidden border bg-muted hover:opacity-80 transition-opacity shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img 
                              src={transaction.receipt_image_url} 
                              alt="Fiş" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0 right-0 bg-primary/80 rounded-tl p-0.5">
                              <ImageIcon className="h-2 w-2 lg:h-3 lg:w-3 text-primary-foreground" />
                            </div>
                          </a>
                        ) : (
                          <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0 ${config.bgColor}`}>
                            <IconComponent className={`h-3.5 w-3.5 lg:h-5 lg:w-5 ${config.color}`} />
                          </div>
                        )}
                        
                        {/* Content - middle section */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-xs lg:text-base truncate">
                              {t(`categories.${transaction.category}`, transaction.category) as string}
                            </span>
                            {transaction.is_fixed_payment && (
                              <Badge variant="secondary" className="text-[7px] lg:text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-0.5 py-0 h-3.5 lg:h-5">
                                Fix
                              </Badge>
                            )}
                            {/* Mobile: Income/Expense badge abbreviated */}
                            <Badge variant="outline" className="text-[7px] lg:text-xs lg:hidden px-0.5 py-0 h-3.5">
                              {transaction.transaction_type === "income" ? "G" : "Ç"}
                            </Badge>
                            <Badge variant="outline" className="text-[8px] lg:text-xs hidden lg:inline-flex px-1 py-0 h-4 lg:h-5">
                              {transaction.transaction_type === "income" ? t('transactions.income') : t('transactions.expense')}
                            </Badge>
                          </div>
                          <p className="text-[9px] lg:text-sm text-muted-foreground">
                            {formatLongDate(transaction.transaction_date)}
                          </p>
                          {transaction.description && (
                            <p className="text-[9px] lg:text-sm text-muted-foreground truncate">{transaction.description}</p>
                          )}
                        </div>
                        
                        {/* Right side - Amount and actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <span className={`text-xs lg:text-lg font-bold whitespace-nowrap ${
                            transaction.transaction_type === "income" ? "text-green-600" : "text-red-600"
                          }`}>
                            {transaction.transaction_type === "income" ? "+" : "-"}
                            {formatCurrency(parseFloat(transaction.amount))}
                          </span>
                          
                          {/* Desktop actions */}
                          <div className="hidden lg:flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTransactionForItems(transaction);
                                  }}
                                >
                                  <Package className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('transactionItems.viewItems')}</TooltipContent>
                            </Tooltip>
                            {!transaction.is_fixed_payment && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditTransaction(transaction);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('dialogs.edit')}</TooltipContent>
                                </Tooltip>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(transaction.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                          
                          {/* Mobile: edit and delete for non-fixed payments */}
                          {!transaction.is_fixed_payment && (
                            <div className="flex lg:hidden items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTransaction(transaction);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(transaction.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </Card>

          {/* Charts Section - NOW AT BOTTOM, COLLAPSIBLE */}
          <Collapsible open={chartsOpen} onOpenChange={setChartsOpen}>
            <Card className="p-3 lg:p-6">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent">
                  <h2 className="text-base lg:text-xl font-bold">{t('transactions.charts')}</h2>
                  {chartsOpen ? (
                    <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-6 space-y-6">
                {/* Yearly Comparison */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('transactions.yearlyComparison')}</h3>
                  <ChartContainer
                    config={{
                      buYil: {
                        label: t('transactions.thisYear'),
                        color: "hsl(var(--chart-3))",
                      },
                      gecenYil: {
                        label: t('transactions.lastYear'),
                        color: "hsl(var(--chart-4))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="month" 
                          className="text-sm"
                          tick={{ fill: 'hsl(var(--foreground))' }}
                        />
                        <YAxis 
                          className="text-sm"
                          tick={{ fill: 'hsl(var(--foreground))' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="buYil" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="gecenYil" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>

                {/* Monthly & Category Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">{t('transactions.monthlyIncomeExpense')}</h3>
                    <ChartContainer
                      config={{
                        gelir: {
                          label: t('transactions.income'),
                          color: "hsl(var(--chart-1))",
                        },
                        gider: {
                          label: t('transactions.expense'),
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="month" 
                            className="text-sm"
                            tick={{ fill: 'hsl(var(--foreground))' }}
                          />
                          <YAxis 
                            className="text-sm"
                            tick={{ fill: 'hsl(var(--foreground))' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="gelir" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="gider" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">{t('transactions.categoryExpenses')}</h3>
                    <ChartContainer
                      config={categoryData.reduce((acc, item) => {
                        acc[item.name] = {
                          label: t(`categories.${item.name}`, item.name) as string,
                          color: getCategoryChartColor(item.name),
                        };
                        return acc;
                      }, {} as Record<string, { label: string; color: string }>)}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${t(`categories.${name}`, name)} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categoryData.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={getCategoryChartColor(entry.name)} />
                            ))}
                          </Pie>
                          <ChartTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid gap-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">{t(`categories.${payload[0].name}`, payload[0].name as string)}</span>
                                        <span className="font-bold">{formatCurrency(parseFloat(payload[0].value as string))}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('transactions.deleteTransactionConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('common.cancel')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <TransactionItemsDialog
          open={!!selectedTransactionForItems}
          onOpenChange={(open) => !open && setSelectedTransactionForItems(null)}
          transactionId={selectedTransactionForItems?.id}
          transactionDescription={selectedTransactionForItems?.description}
          transactionDate={selectedTransactionForItems?.transaction_date}
          transactionAmount={selectedTransactionForItems?.amount}
          receiptImageUrl={selectedTransactionForItems?.receipt_image_url}
        />

        {/* Edit Transaction Dialog */}
        {editTransaction && (
          <TransactionDialog
            transaction={editTransaction}
            onSuccess={() => {
              setEditTransaction(null);
              fetchTransactions();
            }}
            open={!!editTransaction}
            onOpenChange={(open) => !open && setEditTransaction(null)}
          />
        )}

      </div>
    </Layout>
  );
}
