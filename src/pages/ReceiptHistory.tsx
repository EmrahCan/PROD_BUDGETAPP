import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { 
  ScanLine, 
  Filter, 
  X, 
  ImageIcon, 
  Calendar as CalendarIcon,
  TrendingDown,
  ShoppingBag,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { BulkRescanDialog } from "@/components/transactions/BulkRescanDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, subMonths, subWeeks, subYears, startOfWeek, startOfYear, endOfWeek, endOfYear } from "date-fns";
import { tr, de, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useDateFormat } from "@/hooks/useDateFormat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Package, ChevronRight } from "lucide-react";

const categories = [
  // Gelir
  "Maaş",
  "Ek Gelir",
  "Yatırım Geliri",
  "Kira Geliri",
  "Hediye",
  // Ev & Yaşam
  "Kira",
  "Aidat",
  "Faturalar",
  "Elektrik",
  "Su",
  "Doğalgaz",
  "İnternet",
  "Telefon",
  // Market & Alışveriş
  "Market",
  "Online Alışveriş",
  "Giyim",
  "Kozmetik",
  "Ev Eşyası",
  // Ulaşım
  "Ulaşım",
  "Yakıt",
  "Araç Bakım",
  "Otopark",
  "Taksi",
  // Yeme & İçme
  "Restoran",
  "Kafe",
  "Fast Food",
  "Yemek Siparişi",
  // Sağlık & Spor
  "Sağlık",
  "Eczane",
  "Spor Salonu",
  // Eğlence & Hobi
  "Eğlence",
  "Sinema",
  "Konser",
  "Oyun",
  "Hobi",
  // Eğitim
  "Eğitim",
  "Kitap",
  "Kurs",
  // Finans
  "Kredi Ödemesi",
  "Sigorta",
  "Vergi",
  "Banka Masrafı",
  // Abonelikler
  "Abonelik",
  "Netflix",
  "Spotify",
  "YouTube",
  "Apple",
  // Diğer
  "Bağış",
  "Tatil",
  "Diğer"
];

export default function ReceiptHistory() {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { formatLongDate, getLocale } = useDateFormat();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [merchantPeriod, setMerchantPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [bulkRescanOpen, setBulkRescanOpen] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode: receipt_items verilerinden fiş geçmişi simülasyonu
      const demoTransactions = demoData.transactions
        .filter((t: any) => t.transaction_type === 'expense')
        .slice(0, 5)
        .map((t: any, index: number) => ({
          ...t,
          receipt_image_url: `https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=600&fit=crop&q=80&seed=${index}`,
        }));
      setTransactions(demoTransactions);
      setLoading(false);
    } else if (user) {
      fetchReceiptTransactions();
    }
  }, [user, isDemoMode]);

  const fetchReceiptTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .not("receipt_image_url", "is", null)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast.error(t('transactions.transactionsLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => filterCategory === "all" || t.category === filterCategory)
      .filter(t => {
        if (!startDate && !endDate) return true;
        const transactionDate = new Date(t.transaction_date);
        if (startDate && transactionDate < startDate) return false;
        if (endDate && transactionDate > endDate) return false;
        return true;
      });
  }, [transactions, filterCategory, startDate, endDate]);

  const clearFilters = () => {
    setFilterCategory("all");
    setStartDate(subMonths(new Date(), 1));
    setEndDate(new Date());
  };

  const activeFiltersCount = 
    (filterCategory !== "all" ? 1 : 0);

  // Statistics - only for current month
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const thisMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });
    
    const total = thisMonthTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const count = thisMonthTransactions.length;
    const avgAmount = count > 0 ? total / count : 0;
    
    return { total, count, avgAmount };
  }, [transactions]);


  // Daily spending for bar chart
  const dailyData = useMemo(() => {
    const dailySpending: Record<string, number> = {};

    filteredTransactions.forEach(t => {
      const day = format(new Date(t.transaction_date), "dd/MM");
      dailySpending[day] = (dailySpending[day] || 0) + parseFloat(t.amount);
    });

    return Object.entries(dailySpending)
      .slice(-14) // Last 14 days
      .map(([day, amount]) => ({ day, amount }));
  }, [filteredTransactions]);

  // Top merchants/descriptions with period filter
  const topMerchants = useMemo(() => {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;
    
    switch (merchantPeriod) {
      case 'week':
        periodStart = startOfWeek(now, { weekStartsOn: 1 });
        periodEnd = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'year':
        periodStart = startOfYear(now);
        periodEnd = endOfYear(now);
        break;
      case 'month':
      default:
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
        break;
    }
    
    const merchants: Record<string, { count: number; total: number; lastDate: string; transactionIds: string[] }> = {};

    transactions
      .filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= periodStart && transactionDate <= periodEnd;
      })
      .forEach(t => {
        const merchant = t.description || "Bilinmeyen";
        if (!merchants[merchant]) {
          merchants[merchant] = { count: 0, total: 0, lastDate: t.transaction_date, transactionIds: [] };
        }
        merchants[merchant].count++;
        merchants[merchant].total += parseFloat(t.amount);
        merchants[merchant].transactionIds.push(t.id);
        // Keep track of the most recent date
        if (t.transaction_date > merchants[merchant].lastDate) {
          merchants[merchant].lastDate = t.transaction_date;
        }
      });

    return Object.entries(merchants)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions, merchantPeriod]);

  // State for merchant detail dialog
  const [selectedMerchant, setSelectedMerchant] = useState<{ name: string; transactionIds: string[] } | null>(null);
  const [merchantTransactions, setMerchantTransactions] = useState<any[]>([]);
  const [loadingMerchantDetails, setLoadingMerchantDetails] = useState(false);

  const handleMerchantClick = async (merchant: { name: string; transactionIds: string[] }) => {
    setSelectedMerchant(merchant);
    setLoadingMerchantDetails(true);
    
    try {
      // Fetch transactions with their receipt items
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, transaction_date, receipt_image_url, category")
        .in("id", merchant.transactionIds)
        .order("transaction_date", { ascending: false });
      
      if (error) throw error;
      
      // Fetch receipt items for these transactions
      const { data: itemsData, error: itemsError } = await supabase
        .from("receipt_items")
        .select("*")
        .in("transaction_id", merchant.transactionIds);
      
      if (itemsError) throw itemsError;
      
      // Group items by transaction
      const itemsByTransaction = (itemsData || []).reduce((acc: Record<string, any[]>, item) => {
        if (!acc[item.transaction_id]) acc[item.transaction_id] = [];
        acc[item.transaction_id].push(item);
        return acc;
      }, {});
      
      // Combine transactions with their items
      const transactionsWithItems = (data || []).map(t => ({
        ...t,
        items: itemsByTransaction[t.id] || []
      }));
      
      setMerchantTransactions(transactionsWithItems);
    } catch (error) {
      console.error("Error fetching merchant details:", error);
      toast.error("Detaylar yüklenemedi");
    } finally {
      setLoadingMerchantDetails(false);
    }
  };

  

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg">
              <ScanLine className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('receiptHistory.title')}</h1>
              <p className="text-muted-foreground">{t('receiptHistory.description')}</p>
            </div>
          </div>
          <Button 
            onClick={() => setBulkRescanOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('receiptHistory.rescanMissing') || 'Eksik Ürünleri Tara'}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Summary Cards - This Month Only */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{t('receiptHistory.totalScanned')}</p>
                    <Badge variant="secondary" className="text-[10px]">{t('receiptHistory.monthly')}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{stats.count}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{t('receiptHistory.totalAmount')}</p>
                    <Badge variant="secondary" className="text-[10px]">{t('receiptHistory.monthly')}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.total)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{t('receiptHistory.avgAmount')}</p>
                    <Badge variant="secondary" className="text-[10px]">{t('receiptHistory.monthly')}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.avgAmount)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Spending Chart */}
            <Card className="p-4 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold mb-4">{t('receiptHistory.dailySpending')}</h3>
              {dailyData.length > 0 ? (
                <ChartContainer
                  config={{
                    amount: {
                      label: t('receiptHistory.amount'),
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[280px] lg:h-[320px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="day" 
                        className="text-sm"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis 
                        className="text-sm"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[280px] lg:h-[320px] flex items-center justify-center text-muted-foreground">
                  {t('receiptHistory.noData')}
                </div>
              )}
            </Card>

            {/* Top Merchants */}
            <Card className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base lg:text-lg font-semibold">{t('receiptHistory.topMerchants')}</h3>
                <div className="flex gap-1">
                  <Button
                    variant={merchantPeriod === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMerchantPeriod('week')}
                    className="h-7 px-2 text-xs"
                  >
                    {t('receiptHistory.weekly')}
                  </Button>
                  <Button
                    variant={merchantPeriod === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMerchantPeriod('month')}
                    className="h-7 px-2 text-xs"
                  >
                    {t('receiptHistory.monthly')}
                  </Button>
                  <Button
                    variant={merchantPeriod === 'year' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMerchantPeriod('year')}
                    className="h-7 px-2 text-xs"
                  >
                    {t('receiptHistory.yearly')}
                  </Button>
                </div>
              </div>
              {topMerchants.length > 0 ? (
                <div className="space-y-2">
                  {topMerchants.map((merchant, index) => (
                    <div 
                      key={merchant.name} 
                      className="flex items-center justify-between p-2.5 lg:p-3 rounded-lg bg-muted/50 hover:bg-muted/80 cursor-pointer transition-colors"
                      onClick={() => handleMerchantClick(merchant)}
                    >
                      <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                        <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs lg:text-sm font-bold text-primary flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm lg:text-base truncate">{merchant.name}</p>
                          <p className="text-[10px] lg:text-xs text-muted-foreground">
                            {merchant.count} {t('receiptHistory.receipts')} • {format(new Date(merchant.lastDate), "d MMM", { locale: getLocale() })}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-sm lg:text-base text-red-600 flex-shrink-0">{formatCurrency(merchant.total)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  {t('receiptHistory.noData')}
                </div>
              )}
            </Card>
          </div>


          {/* Receipt List */}
          <Card className="p-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold">{t('receiptHistory.allReceipts')}</h2>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        {t('transactions.filters')}
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-popover" align="end">
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
                          <label className="text-sm font-medium">{t('dialogs.category')}</label>
                          <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="all">{t('transactions.all')}</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
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
                                <CalendarIcon className="mr-2 h-4 w-4" />
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
                                <CalendarIcon className="mr-2 h-4 w-4" />
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
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <ScanLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('receiptHistory.noReceipts')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="group cursor-pointer"
                    onClick={() => setSelectedImage(transaction.receipt_image_url)}
                  >
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all">
                      <img 
                        src={transaction.receipt_image_url} 
                        alt="Fiş" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-white font-bold text-sm">{formatCurrency(parseFloat(transaction.amount))}</p>
                        <p className="text-white/80 text-xs truncate">{transaction.description || transaction.category}</p>
                        <p className="text-white/60 text-xs">{formatLongDate(transaction.transaction_date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Image Preview Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{t('receiptScanner.viewReceipt')}</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Fiş" 
                className="w-full rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Rescan Dialog */}
        <BulkRescanDialog 
          open={bulkRescanOpen} 
          onOpenChange={setBulkRescanOpen}
          onComplete={() => fetchReceiptTransactions()}
        />

        {/* Merchant Detail Dialog */}
        <Dialog open={!!selectedMerchant} onOpenChange={() => setSelectedMerchant(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                {selectedMerchant?.name}
              </DialogTitle>
            </DialogHeader>
            
            {loadingMerchantDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="flex-1 max-h-[60vh]">
                <div className="space-y-4 pr-4">
                  {merchantTransactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.transaction_date), "d MMMM yyyy", { locale: getLocale() })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">{formatCurrency(transaction.amount)}</p>
                          <Badge variant="secondary" className="text-xs">{transaction.category}</Badge>
                        </div>
                      </div>
                      
                      {/* Receipt Image Preview */}
                      {transaction.receipt_image_url && (
                        <div 
                          className="mb-3 cursor-pointer"
                          onClick={() => setSelectedImage(transaction.receipt_image_url)}
                        >
                          <img 
                            src={transaction.receipt_image_url} 
                            alt="Fiş" 
                            className="h-20 w-auto rounded border object-cover hover:opacity-80 transition-opacity"
                          />
                        </div>
                      )}
                      
                      {/* Items */}
                      {transaction.items.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {transaction.items.length} ürün
                          </p>
                          {transaction.items.slice(0, 5).map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm py-1 px-2 bg-muted/30 rounded">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate">{item.name}</span>
                                {item.quantity > 1 && (
                                  <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                                )}
                              </div>
                              <span className="font-medium shrink-0">{formatCurrency(item.total_price)}</span>
                            </div>
                          ))}
                          {transaction.items.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{transaction.items.length - 5} daha fazla ürün
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
