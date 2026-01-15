import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Building2,
  CalendarClock,
  Receipt,
  AlertTriangle,
  Bell,
  Clock,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Camera,
  Loader2,
  Upload,
  ScanLine,
  RefreshCw,
  Timer,
  ImageIcon,
  FolderOpen
} from "lucide-react";
import { Link } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { RecentTransactionsWidget } from "@/components/dashboard/RecentTransactionsWidget";
import { UnpaidFixedPaymentsWidget } from "@/components/dashboard/UnpaidFixedPaymentsWidget";
import { ReceiptScannerWidget } from "@/components/dashboard/ReceiptScannerWidget";
import { DraggableWidgetContainer } from "@/components/dashboard/DraggableWidgetContainer";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  count?: number;
  text?: string;
  href?: string;
  color: string;
  onClick?: () => void;
}

interface OverduePayment {
  id: string;
  name: string;
  amount: number;
  daysOverdue: number;
  type: 'fixed' | 'card' | 'installment';
  balance?: number;
  currency?: string;
}

interface UpcomingPayment {
  id: string;
  name: string;
  amount: number;
  daysUntil: number;
  type: 'fixed' | 'card' | 'installment';
  priority: 'high' | 'medium' | 'low';
}

export default function Dashboard() {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { formatFromTRY, currency: displayCurrency } = useDisplayCurrency();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [fixedPayments, setFixedPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [showOverdueDetails, setShowOverdueDetails] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<any>(null);
  const [currencyHoldings, setCurrencyHoldings] = useState<any[]>([]);
  const [cryptoHoldings, setCryptoHoldings] = useState<any[]>([]);
  const [currencyValue, setCurrencyValue] = useState(0);
  const [cryptoValue, setCryptoValue] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('dashboard-refresh-interval');
    return saved ? parseInt(saved) : 60000;
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState<string>("");
  const [scanMenuOpen, setScanMenuOpen] = useState(false);
  
  // Overdue payment dialog state
  const [overduePaymentDialogOpen, setOverduePaymentDialogOpen] = useState(false);
  const [selectedOverduePayment, setSelectedOverduePayment] = useState<OverduePayment | null>(null);
  const [overduePaymentAmount, setOverduePaymentAmount] = useState('');
  const [processingOverduePayment, setProcessingOverduePayment] = useState(false);

  const categories = [
    "Market", "Online Alışveriş", "Giyim", "Kozmetik", "Ev Eşyası",
    "Restoran", "Kafe", "Fast Food", "Yemek Siparişi",
    "Ulaşım", "Yakıt", "Araç Bakım", "Otopark", "Taksi",
    "Sağlık", "Eczane", "Spor Salonu",
    "Eğlence", "Sinema", "Hobi", "Eğitim", "Kitap",
    "Faturalar", "Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon",
    "Abonelik", "Diğer"
  ];

  const handleCameraScan = () => {
    cameraInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setReceiptDialogOpen(true);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreviewUrl(base64);
      await scanReceiptImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const scanReceiptImage = async (imageBase64: string) => {
    setScanning(true);
    setReceiptData(null);
    setEditedData(null);

    try {
      const { data, error } = await supabase.functions.invoke('receipt-scanner', {
        body: { image: imageBase64 }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setReceiptData(data);
      setEditedData(data);
      toast.success(t('receiptScanner.scanSuccess'));
    } catch (error: any) {
      console.error('Receipt scan error:', error);
      toast.error(t('receiptScanner.scanError'));
    } finally {
      setScanning(false);
    }
  };

  const uploadReceiptImage = async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;
    
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, selectedFile);
      
      if (uploadError) throw uploadError;
      
      const { data, error: signedUrlError } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 31536000);
      
      if (signedUrlError) throw signedUrlError;
      
      return data.signedUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveTransaction = async () => {
    if (!editedData || !user) return;

    const imageUrl = await uploadReceiptImage();

    const isCard = receiptPaymentMethod.startsWith('card_');
    const paymentId = receiptPaymentMethod.replace('card_', '').replace('account_', '');

    try {
      const insertData: any = {
        user_id: user.id,
        amount: editedData.amount,
        category: editedData.category,
        description: editedData.description,
        currency: editedData.currency,
        transaction_type: 'expense',
        transaction_date: editedData.date || new Date().toISOString().split('T')[0],
        receipt_image_url: imageUrl
      };

      if (receiptPaymentMethod) {
        if (isCard) insertData.card_id = paymentId;
        else insertData.account_id = paymentId;
      }

      const { error } = await supabase
        .from('transactions')
        .insert(insertData);

      if (error) throw error;

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success(t('dialogs.transactionAdded'));
      handleCloseReceiptDialog();
      // Reload transactions
      fetchData();
    } catch (error: any) {
      console.error('Save transaction error:', error);
      toast.error(t('errors.saveFailed'));
    }
  };

  const handleCloseReceiptDialog = () => {
    setReceiptDialogOpen(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setReceiptData(null);
    setEditedData(null);
    setReceiptPaymentMethod("");
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const loadDemoData = () => {
    setAccounts(demoData.accounts);
    setCards(demoData.credit_cards);
    setFixedPayments(demoData.fixed_payments);
    setInstallments(demoData.installments);
    setTransactions(demoData.transactions);
    setProfile(demoData.profile);

    // Calculate overdue and upcoming for demo
    const today = new Date();
    const currentDay = today.getDate();
    
    const overdue: OverduePayment[] = [];
    const upcoming: UpcomingPayment[] = [];

    demoData.credit_cards.forEach(card => {
      if (card.due_date < currentDay && card.balance > 0) {
        overdue.push({
          id: card.id,
          name: card.name,
          amount: card.balance,
          daysOverdue: currentDay - card.due_date,
          type: 'card'
        });
      } else if (card.due_date >= currentDay && card.due_date <= currentDay + 7 && card.balance > 0) {
        upcoming.push({
          id: card.id,
          name: card.name,
          amount: card.balance,
          daysUntil: card.due_date - currentDay,
          type: 'card',
          priority: card.due_date - currentDay <= 1 ? 'high' : 'medium'
        });
      }
    });

    demoData.fixed_payments.forEach(fp => {
      if (fp.payment_day < currentDay) {
        overdue.push({
          id: fp.id,
          name: fp.name,
          amount: fp.amount,
          daysOverdue: currentDay - fp.payment_day,
          type: 'fixed'
        });
      } else if (fp.payment_day >= currentDay && fp.payment_day <= currentDay + 7) {
        upcoming.push({
          id: fp.id,
          name: fp.name,
          amount: fp.amount,
          daysUntil: fp.payment_day - currentDay,
          type: 'fixed',
          priority: fp.payment_day - currentDay <= 1 ? 'high' : 'medium'
        });
      }
    });

    setOverduePayments(overdue.sort((a, b) => b.daysOverdue - a.daysOverdue));
    setUpcomingPayments(upcoming.sort((a, b) => a.daysUntil - b.daysUntil));
    setLoading(false);
  };

  const fetchData = async () => {
    if (!user) return;
    
    // Get current month start for payment records
    const today = new Date();
    const currentMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    
    const [
      { data: accountsData },
      { data: cardsData },
      { data: fixedData },
      { data: installmentsData },
      { data: loansData },
      { data: profileData },
      { data: transactionsData },
      { data: paymentRecordsData },
      { data: currencyHoldingsData },
      { data: cryptoHoldingsData }
    ] = await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", user.id),
      supabase.from("credit_cards").select("*").eq("user_id", user.id),
      supabase.from("fixed_payments").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("installments").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("loans").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("transactions").select("id").eq("user_id", user.id),
      supabase.from("payment_records").select("fixed_payment_id").eq("user_id", user.id).eq("payment_month", currentMonthStart),
      supabase.from("currency_holdings").select("*").eq("user_id", user.id),
      supabase.from("crypto_holdings").select("*").eq("user_id", user.id)
    ]);
    
    setCurrencyHoldings(currencyHoldingsData || []);
    setCryptoHoldings(cryptoHoldingsData || []);
    
    // Fetch currency values (exchange rates + metal prices)
    if (currencyHoldingsData && currencyHoldingsData.length > 0) {
      try {
        const { data: ratesData } = await supabase.functions.invoke('exchange-rates');
        
        let totalCurrencyValue = 0;
        for (const holding of currencyHoldingsData) {
          if (holding.asset_type === 'currency') {
            const rate = ratesData?.rates?.[holding.asset_code] || 1;
            totalCurrencyValue += holding.quantity * rate;
          } else if (holding.asset_type === 'metal') {
            // For metals, quantity is in grams, purchase_price is stored as TRY value per gram at purchase
            // We need current metal prices - for simplicity, use purchase_price * quantity as estimate
            // In a full implementation, you'd fetch live metal prices
            totalCurrencyValue += holding.quantity * holding.purchase_price;
          }
        }
        setCurrencyValue(totalCurrencyValue);
      } catch (e) {
        console.error('Error fetching currency rates:', e);
      }
    }
    
    // Fetch crypto values
    if (cryptoHoldingsData && cryptoHoldingsData.length > 0) {
      try {
        const symbols = cryptoHoldingsData.map(h => h.symbol);
        const { data: pricesData } = await supabase.functions.invoke('crypto-prices', {
          body: { symbols }
        });
        
        let totalCryptoValue = 0;
        if (pricesData?.prices) {
          for (const holding of cryptoHoldingsData) {
            const priceInfo = pricesData.prices.find((p: any) => p.symbol === holding.symbol);
            if (priceInfo) {
              totalCryptoValue += holding.quantity * priceInfo.price;
            }
          }
        }
        setCryptoValue(totalCryptoValue);
      } catch (e) {
        console.error('Error fetching crypto prices:', e);
      }
    }
    
    // Set of paid fixed payment ids for this month
    const paidFixedPaymentIds = new Set((paymentRecordsData || []).map(r => r.fixed_payment_id));
    
    setAccounts(accountsData || []);
    setCards(cardsData || []);
    setFixedPayments(fixedData || []);
    setInstallments(installmentsData || []);
    setLoans(loansData || []);
    setProfile(profileData);
    setTransactions(transactionsData || []);

    // Calculate overdue payments
    const currentDay = today.getDate();
    
    const overdue: OverduePayment[] = [];
    const upcoming: UpcomingPayment[] = [];

    // Check cards for overdue
    cardsData?.forEach(card => {
      const minimumPayment = Number(card.minimum_payment) || 0;

      // Asgari ödeme 0 ise kart ödemesi yapılmış kabul edilir (gecikmiş/gelecek listelerine girmez)
      if (minimumPayment <= 0) return;

      if (card.due_date < currentDay) {
        const daysOverdue = currentDay - card.due_date;
        overdue.push({
          id: card.id,
          name: card.name,
          amount: minimumPayment,
          daysOverdue,
          type: 'card',
          balance: Number(card.balance) || 0,
          currency: card.currency
        });
      } else if (card.due_date >= currentDay && card.due_date <= currentDay + 7) {
        const daysUntil = card.due_date - currentDay;
        upcoming.push({
          id: card.id,
          name: card.name,
          amount: minimumPayment,
          daysUntil,
          type: 'card',
          priority: daysUntil <= 1 ? 'high' : 'medium'
        });
      }
    });

    // Check fixed payments for overdue - skip if already paid this month
    fixedData?.forEach(fp => {
      // Skip if payment is already marked as paid for this month
      if (paidFixedPaymentIds.has(fp.id)) return;
      
      if (fp.payment_day < currentDay) {
        const daysOverdue = currentDay - fp.payment_day;
        overdue.push({
          id: fp.id,
          name: fp.name,
          amount: fp.amount,
          daysOverdue,
          type: 'fixed',
          currency: fp.currency
        });
      } else if (fp.payment_day >= currentDay && fp.payment_day <= currentDay + 7) {
        const daysUntil = fp.payment_day - currentDay;
        upcoming.push({
          id: fp.id,
          name: fp.name,
          amount: fp.amount,
          daysUntil,
          type: 'fixed',
          priority: daysUntil <= 1 ? 'high' : 'medium'
        });
      }
    });

    setOverduePayments(overdue.sort((a, b) => b.daysOverdue - a.daysOverdue));
    setUpcomingPayments(upcoming.sort((a, b) => a.daysUntil - b.daysUntil));
    setLoading(false);
  };

  useEffect(() => {
    if (isDemoMode) {
      loadDemoData();
      return;
    }
    if (!user) return;

    setLoading(true);
    fetchData();

    // Set up realtime subscriptions for accounts, cards, and transactions
    const accountsChannel = supabase
      .channel('dashboard-accounts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const cardsChannel = supabase
      .channel('dashboard-cards')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_cards',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const transactionsChannel = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Listen for payment_records changes to update overdue/upcoming payments
    const paymentRecordsChannel = supabase
      .channel('dashboard-payment-records')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_records',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Listen for fixed_payments changes
    const fixedPaymentsChannel = supabase
      .channel('dashboard-fixed-payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fixed_payments',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Listen for profile changes to update userName
    const profilesChannel = supabase
      .channel('dashboard-profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Listen for currency holdings changes
    const currencyHoldingsChannel = supabase
      .channel('dashboard-currency-holdings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'currency_holdings',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Listen for crypto holdings changes
    const cryptoHoldingsChannel = supabase
      .channel('dashboard-crypto-holdings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crypto_holdings',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Auto-refresh prices based on selected interval
    const priceRefreshInterval = setInterval(() => {
      fetchData();
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => {
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(cardsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(paymentRecordsChannel);
      supabase.removeChannel(fixedPaymentsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(currencyHoldingsChannel);
      supabase.removeChannel(cryptoHoldingsChannel);
      clearInterval(priceRefreshInterval);
    };
  }, [user, refreshInterval]);

  const handleRefreshIntervalChange = (value: string) => {
    const interval = parseInt(value);
    setRefreshInterval(interval);
    localStorage.setItem('dashboard-refresh-interval', value);
  };

  const handleManualRefresh = () => {
    fetchData();
    setLastRefresh(new Date());
  };

  const accountsBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const totalBalance = accountsBalance + currencyValue + cryptoValue;
  const totalCardDebt = cards.reduce((sum, card) => sum + Number(card.balance), 0);
  const totalInstallmentDebt = installments.reduce((sum, inst) => sum + Number(inst.monthly_amount) * (inst.total_months - inst.paid_months), 0);
  const totalLoanDebt = loans.reduce((sum, loan) => sum + Number(loan.remaining_amount), 0);
  const totalDebt = totalCardDebt + totalInstallmentDebt + totalLoanDebt;
  const totalFixedPayments = fixedPayments.reduce((sum, fp) => sum + Number(fp.amount), 0);
  const netStatus = totalBalance - totalDebt;
  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Calculate total monthly overdraft interest
  const totalMonthlyOverdraftInterest = accounts.reduce((sum, acc) => {
    const overdraftUsed = acc.balance < 0 ? Math.abs(acc.balance) : 0;
    const annualRate = acc.overdraft_interest_rate || 0;
    const monthlyInterest = (overdraftUsed * annualRate / 100) / 12;
    return sum + monthlyInterest;
  }, 0);

  const quickActions: QuickAction[] = [
    {
      icon: <Camera className="h-6 w-6" />,
      label: t('dashboard.scanReceipt'),
      text: t('dashboard.takePhoto'),
      color: 'text-cyan-500',
      onClick: handleCameraScan
    },
    {
      icon: <Building2 className="h-6 w-6" />,
      label: t('nav.accounts'),
      count: accounts.length,
      href: '/accounts',
      color: 'text-blue-500'
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      label: t('nav.cards'),
      count: cards.length,
      href: '/cards',
      color: 'text-red-500'
    },
    {
      icon: <CalendarClock className="h-6 w-6" />,
      label: t('nav.fixedPayments'),
      count: fixedPayments.length,
      href: '/fixed-payments',
      color: 'text-amber-500'
    },
    {
      icon: <Receipt className="h-6 w-6" />,
      label: t('nav.installments'),
      count: installments.length,
      href: '/installments',
      color: 'text-emerald-500'
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      label: t('nav.reports'),
      text: t('reports.analyze'),
      href: '/reports',
      color: 'text-purple-500'
    }
  ];

  const userName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  const handleMarkAsRead = (id: string) => {
    setDismissedNotifications(prev => new Set([...prev, id]));
  };

  const handleDismiss = (id: string) => {
    setUpcomingPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleOverduePaymentClick = (payment: OverduePayment) => {
    setSelectedOverduePayment(payment);
    setOverduePaymentAmount(payment.amount.toString());
    setOverduePaymentDialogOpen(true);
  };

  const handleOverduePayment = async () => {
    if (!selectedOverduePayment || !user) return;

    const amount = parseFloat(overduePaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('dialogs.invalidAmount'));
      return;
    }

    setProcessingOverduePayment(true);
    try {
      if (selectedOverduePayment.type === 'card') {
        // Update card balance
        const newBalance = Math.max(0, (selectedOverduePayment.balance || 0) - amount);
        const newMinPayment = newBalance > 0 ? Math.min(selectedOverduePayment.amount, newBalance * 0.1) : 0;

        const { error: updateError } = await supabase
          .from('credit_cards')
          .update({ 
            balance: newBalance,
            minimum_payment: newMinPayment
          })
          .eq('id', selectedOverduePayment.id);

        if (updateError) throw updateError;

        // Create transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            card_id: selectedOverduePayment.id,
            amount: amount,
            currency: selectedOverduePayment.currency || 'TRY',
            category: 'Kredi Ödemesi',
            description: `${selectedOverduePayment.name} - Gecikmiş Ödeme`,
            transaction_type: 'expense',
            transaction_date: new Date().toISOString().split('T')[0],
          });

        if (transactionError) throw transactionError;
      } else if (selectedOverduePayment.type === 'fixed') {
        // Mark fixed payment as paid for this month
        const today = new Date();
        const currentMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        
        const { error: recordError } = await supabase
          .from('payment_records')
          .insert({
            user_id: user.id,
            fixed_payment_id: selectedOverduePayment.id,
            payment_month: currentMonthStart,
            amount: amount,
            paid_at: new Date().toISOString()
          });

        if (recordError) throw recordError;
      }

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: t('widgets.paymentCompleted'),
        message: `${selectedOverduePayment.name} - ${formatCurrency(amount)}`,
        notification_type: 'payment_completed',
        priority: 'low',
        related_entity_type: selectedOverduePayment.type === 'card' ? 'credit_card' : 'fixed_payment',
        related_entity_id: selectedOverduePayment.id,
      });

      // Celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success(t('widgets.paymentSuccess'));
      setOverduePaymentDialogOpen(false);
      setSelectedOverduePayment(null);
      setOverduePaymentAmount('');
      fetchData();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(t('widgets.paymentError'));
    } finally {
      setProcessingOverduePayment(false);
    }
  };

  const visibleUpcomingPayments = upcomingPayments.filter(p => !dismissedNotifications.has(p.id));

  const getPaymentMessage = (payment: UpcomingPayment) => {
    if (payment.daysUntil === 0) {
      return t('dashboard.paymentToday');
    } else if (payment.daysUntil === 1) {
      return t('dashboard.paymentTomorrow');
    } else {
      return `${payment.daysUntil} ${t('dashboard.paymentInDays')}`;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-48 mb-8" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg flex-shrink-0">
                <Wallet className="h-6 w-6 lg:h-8 lg:w-8 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg lg:text-3xl font-bold text-foreground truncate">
                  {t('dashboard.welcome')}, {userName}! 👋
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">{t('dashboard.overview')}</p>
              </div>
            </div>
          </div>
          
          {/* Refresh Controls - Compact on mobile */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] lg:text-xs text-muted-foreground">
              <Timer className="h-3 w-3 lg:h-3.5 lg:w-3.5 flex-shrink-0" />
              <span className="truncate">{lastRefresh.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={refreshInterval.toString()} onValueChange={handleRefreshIntervalChange}>
                <SelectTrigger className="w-[90px] lg:w-[130px] h-8 lg:h-9 text-xs lg:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30000">30s</SelectItem>
                  <SelectItem value="60000">1m</SelectItem>
                  <SelectItem value="300000">5m</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManualRefresh}
                className="h-8 lg:h-9 px-2 lg:px-3"
              >
                <RefreshCw className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline ml-1">{t('common.refresh')}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {/* Total Balance */}
          <Card className="p-3 lg:p-6 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <Wallet className="h-4 w-4 lg:h-6 lg:w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('dashboard.totalBalance')}</p>
                <p className="text-sm lg:text-xl font-bold text-foreground truncate">{formatFromTRY(totalBalance)}</p>
                <div className="text-[9px] lg:text-xs text-muted-foreground mt-0.5 space-y-0.5 hidden lg:block">
                  <p>{t('nav.accounts')}: {formatFromTRY(accountsBalance)}</p>
                  {currencyValue > 0 && <p>{t('nav.currency')}: {formatFromTRY(currencyValue)}</p>}
                  {cryptoValue > 0 && <p>{t('nav.crypto')}: {formatFromTRY(cryptoValue)}</p>}
                </div>
              </div>
            </div>
          </Card>

          {/* Total Debt */}
          <Card className="p-3 lg:p-6 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <CreditCard className="h-4 w-4 lg:h-6 lg:w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('dashboard.totalDebt')}</p>
                <p className="text-sm lg:text-xl font-bold text-foreground truncate">{formatFromTRY(totalDebt)}</p>
                <div className="text-[9px] lg:text-xs text-muted-foreground mt-0.5 space-y-0.5 hidden lg:block">
                  <p>{t('dashboard.creditCard')}: {formatFromTRY(totalCardDebt)}</p>
                  {totalInstallmentDebt > 0 && <p>{t('nav.installments')}: {formatFromTRY(totalInstallmentDebt)}</p>}
                  {totalLoanDebt > 0 && <p>{t('loans.title')}: {formatFromTRY(totalLoanDebt)}</p>}
                </div>
              </div>
            </div>
          </Card>

          {/* Monthly Fixed Payments */}
          <Card className="p-3 lg:p-6 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <CalendarClock className="h-4 w-4 lg:h-6 lg:w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('dashboard.monthlyFixedPayments')}</p>
                <p className="text-sm lg:text-xl font-bold text-foreground truncate">{formatFromTRY(totalFixedPayments)}</p>
              </div>
            </div>
          </Card>

          {/* Monthly Overdraft Interest - Only show if there's interest */}
          {totalMonthlyOverdraftInterest > 0 && (
            <Card className="p-3 lg:p-6 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer group border-warning/30 bg-warning/5">
              <Link to="/accounts">
                <div className="flex items-center gap-2 lg:gap-4">
                  <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-warning/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <TrendingDown className="h-4 w-4 lg:h-6 lg:w-6 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('dashboard.monthlyOverdraftInterest')}</p>
                    <p className="text-sm lg:text-xl font-bold text-warning truncate">{formatFromTRY(totalMonthlyOverdraftInterest)}</p>
                  </div>
                </div>
              </Link>
            </Card>
          )}

          {/* Net Status */}
          <Card className="p-3 lg:p-6 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center gap-2 lg:gap-4">
              <div className={`w-9 h-9 lg:w-12 lg:h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0 ${
                netStatus >= 0 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {netStatus >= 0 ? (
                  <TrendingUp className="h-4 w-4 lg:h-6 lg:w-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 lg:h-6 lg:w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('dashboard.netStatus')}</p>
                <p className={`text-sm lg:text-xl font-bold truncate ${
                  netStatus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatFromTRY(netStatus)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Overdue and Upcoming Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Overdue Payments */}
          <Card className={`border-2 hover:shadow-lg hover:scale-[1.01] transition-all duration-300 ${overduePayments.length > 0 ? 'border-red-500' : 'border-border'}`}>
            <CardHeader className="pb-2 lg:pb-4 px-3 lg:px-6 pt-3 lg:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5 text-red-500" />
                  <CardTitle className="text-sm lg:text-lg">{t('dashboard.overduePayments')}</CardTitle>
                </div>
                {overduePayments.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] lg:text-xs px-1.5 lg:px-2">{overduePayments.length} {t('dashboard.payments')}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
              {overduePayments.length === 0 ? (
                <div className="text-center py-4 lg:py-8 text-muted-foreground">
                  <Check className="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-1 lg:mb-2 text-emerald-500" />
                  <p className="text-xs lg:text-base">{t('dashboard.noOverduePayments')}</p>
                </div>
              ) : (
                <div className="space-y-2 lg:space-y-4">
                  <div>
                    <p className="text-xs lg:text-sm text-muted-foreground">{t('dashboard.totalOverdue')}</p>
                    <p className="text-xl lg:text-3xl font-bold text-red-500">{formatFromTRY(totalOverdue)}</p>
                  </div>

                  {/* Most overdue item */}
                  {overduePayments[0] && (
                    <div 
                      className="p-2 lg:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      onClick={() => handleOverduePaymentClick(overduePayments[0])}
                    >
                      <div className="flex items-center gap-1.5 lg:gap-2">
                        <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-red-500 flex-shrink-0" />
                        <span className="font-medium text-xs lg:text-sm truncate">{t('dashboard.mostOverdue')}: {overduePayments[0].name}</span>
                      </div>
                      <p className="text-[10px] lg:text-sm text-muted-foreground mt-0.5 lg:mt-1">
                        {overduePayments[0].daysOverdue} {t('dashboard.daysOverdue')} - {formatFromTRY(overduePayments[0].amount)}
                      </p>
                    </div>
                  )}

                  {/* Collapsible details */}
                  {overduePayments.length > 1 && (
                    <Collapsible open={showOverdueDetails} onOpenChange={setShowOverdueDetails}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between h-7 lg:h-9 text-xs lg:text-sm">
                          {t('dashboard.details')}
                          {showOverdueDetails ? <ChevronUp className="h-3 w-3 lg:h-4 lg:w-4" /> : <ChevronDown className="h-3 w-3 lg:h-4 lg:w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1.5 lg:space-y-2 mt-1.5 lg:mt-2 max-h-[120px] lg:max-h-[200px] overflow-y-auto">
                        {overduePayments.slice(1).map(payment => (
                          <div 
                            key={payment.id} 
                            className="flex items-center justify-between p-1.5 lg:p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => handleOverduePaymentClick(payment)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[11px] lg:text-sm truncate">{payment.name}</p>
                              <p className="text-[10px] lg:text-xs text-muted-foreground">{payment.daysOverdue} {t('dashboard.daysOverdue')}</p>
                            </div>
                            <span className="text-[11px] lg:text-sm font-medium text-red-500 ml-2 flex-shrink-0">{formatFromTRY(payment.amount)}</span>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Payments and Warnings */}
          <Card className="border-2 border-border hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
            <CardHeader className="pb-2 lg:pb-4 px-3 lg:px-6 pt-3 lg:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Bell className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
                  <CardTitle className="text-sm lg:text-lg">{t('dashboard.upcomingPayments')}</CardTitle>
                </div>
                {visibleUpcomingPayments.length > 0 && (
                  <Badge className="bg-blue-500 text-[10px] lg:text-xs px-1.5 lg:px-2">{visibleUpcomingPayments.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-3 lg:px-6 pb-3 lg:pb-6">
              {visibleUpcomingPayments.length === 0 ? (
                <div className="text-center py-3 lg:py-8 text-muted-foreground">
                  <Check className="h-6 w-6 lg:h-12 lg:w-12 mx-auto mb-1 lg:mb-2 text-emerald-500" />
                  <p className="text-xs lg:text-base">{t('dashboard.noUpcomingPayments')}</p>
                </div>
              ) : (
                <div className="space-y-1.5 lg:space-y-3 max-h-[180px] lg:max-h-[400px] overflow-y-auto">
                  {visibleUpcomingPayments.map(payment => (
                    <div 
                      key={payment.id} 
                      className={`p-2 lg:p-4 rounded-lg border ${
                        payment.priority === 'high' 
                          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' 
                          : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <AlertTriangle className={`h-3 w-3 flex-shrink-0 ${payment.priority === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                          {payment.priority === 'high' && (
                            <Badge variant="destructive" className="text-[9px] lg:text-xs px-1 py-0 h-4 lg:h-5">{t('dashboard.urgent')}</Badge>
                          )}
                          <span className="font-medium text-[11px] lg:text-sm truncate">{payment.name}</span>
                        </div>
                        <span className="text-[11px] lg:text-sm font-semibold flex-shrink-0">{formatFromTRY(payment.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 lg:mt-2">
                        <span className="text-[10px] lg:text-xs text-muted-foreground">
                          {getPaymentMessage(payment)}
                        </span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 lg:h-7 text-[10px] lg:text-xs text-emerald-600 hover:bg-emerald-50 px-1.5 lg:px-2"
                            onClick={() => handleMarkAsRead(payment.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 lg:h-7 text-[10px] lg:text-xs text-red-500 hover:bg-red-50 px-1.5 lg:px-2"
                            onClick={() => handleDismiss(payment.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hidden Camera Input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        
        {/* Hidden File Input (for gallery/file selection) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Receipt Scanner Dialog */}
        <Dialog open={receiptDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) handleCloseReceiptDialog();
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ScanLine className="h-5 w-5" />
                {t('receiptScanner.title')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Preview */}
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="w-full rounded-lg border max-h-48 object-contain bg-muted"
                  />
                  {scanning && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm">{t('receiptScanner.scanning')}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scanned data */}
              {editedData && !scanning && (
                <Card className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{t('receiptScanner.extractedData')}</h4>
                    <span className={`text-sm ${getConfidenceColor(editedData.confidence)}`}>
                      {t('receiptScanner.confidence')}: {editedData.confidence}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>{t('dialogs.amount')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editedData.amount}
                        onChange={(e) => setEditedData({ ...editedData, amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>{t('dialogs.currency')}</Label>
                      <Select
                        value={editedData.currency}
                        onValueChange={(value) => setEditedData({ ...editedData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRY">TRY</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>{t('dialogs.category')}</Label>
                      <Select
                        value={editedData.category}
                        onValueChange={(value) => setEditedData({ ...editedData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>{t('dialogs.description')}</Label>
                      <Input
                        value={editedData.description}
                        onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {t('dialogs.paymentMethod')}
                      </Label>
                      <Select value={receiptPaymentMethod} onValueChange={setReceiptPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialogs.selectPaymentMethod')} />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.length === 0 && cards.length === 0 && (
                            <SelectItem value="no-payment" disabled>
                              {t('dialogs.noAccountsOrCards')}
                            </SelectItem>
                          )}

                          {accounts.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {t('accounts.title')}
                              </div>
                              {accounts.map((account) => (
                                <SelectItem key={`account_${account.id}`} value={`account_${account.id}`}>
                                  {account.name}
                                </SelectItem>
                              ))}
                            </>
                          )}

                          {cards.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1 mt-1">
                                <CreditCard className="h-3 w-3" />
                                {t('cards.title')}
                              </div>
                              {cards.map((card) => (
                                <SelectItem key={`card_${card.id}`} value={`card_${card.id}`}>
                                  {card.name} (*{card.last_four_digits})
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {editedData.items && editedData.items.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <Label className="flex items-center gap-2">
                          <ScanLine className="h-4 w-4" />
                          {t('receiptScanner.scannedItems')} ({editedData.items.length})
                        </Label>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {editedData.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.quantity > 1 && `${item.quantity}x `}
                                  {item.brand && <span className="ml-1">• {item.brand}</span>}
                                </p>
                              </div>
                              <span className="font-medium whitespace-nowrap ml-2">
                                {Number(item.total_price).toFixed(2)} {editedData.currency}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={handleCloseReceiptDialog}
                    >
                      <X className="h-4 w-4" />
                      {t('dialogs.cancel')}
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleSaveTransaction}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {t('dialogs.save')}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Retake button */}
              {previewUrl && !scanning && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setPreviewUrl(null);
                    setReceiptData(null);
                    setEditedData(null);
                    cameraInputRef.current?.click();
                  }}
                >
                  {t('receiptScanner.scanAnother')}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Actions */}
        <div>
          <h2 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4">{t('dashboard.quickActions')}</h2>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4">
            {quickActions.map((action, index) => {
              const content = (
                <Card className="p-3 lg:p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer group">
                  <div className="flex flex-col items-center text-center gap-1.5 lg:gap-3">
                    <div className={`${action.color} group-hover:scale-110 transition-transform`}>
                      {React.cloneElement(action.icon as React.ReactElement, { 
                        className: 'h-5 w-5 lg:h-6 lg:w-6' 
                      })}
                    </div>
                    <div>
                      <p className={`font-medium text-xs lg:text-base ${action.color}`}>{action.label}</p>
                      <p className="text-[10px] lg:text-sm text-muted-foreground hidden sm:block">
                        {action.text || `${action.count} ${t('dashboard.items')}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground sm:hidden">
                        {action.count !== undefined ? action.count : ''}
                      </p>
                    </div>
                  </div>
                </Card>
              );

              if (action.onClick) {
                return (
                  <div key={index} onClick={action.onClick}>
                    {content}
                  </div>
                );
              }

              return (
                <Link key={action.href} to={action.href!}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Draggable Widgets */}
        <DraggableWidgetContainer
          storageKey="dashboard-widget-order"
          widgets={[
            { id: 'receipt-scanner', component: <ReceiptScannerWidget /> },
            { id: 'ai-insights', component: <AIInsightsWidget /> },
            { id: 'unpaid-fixed', component: <UnpaidFixedPaymentsWidget /> },
            { id: 'recent-transactions', component: <RecentTransactionsWidget /> },
          ]}
        />


        {/* Floating Action Button with Popover */}
        <Popover open={scanMenuOpen} onOpenChange={setScanMenuOpen}>
          <PopoverTrigger asChild>
            <Button 
              className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 h-12 lg:h-14 w-12 lg:w-auto lg:px-6 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              size="lg"
            >
              <Camera className="h-5 w-5 lg:mr-2" />
              <span className="hidden lg:inline">{t('dashboard.scanReceipt')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="end" 
            className="w-56 p-2"
            sideOffset={8}
          >
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => {
                  setScanMenuOpen(false);
                  cameraInputRef.current?.click();
                }}
              >
                <Camera className="h-5 w-5" />
                <span>{t('receiptScanner.takePhoto')}</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => {
                  setScanMenuOpen(false);
                  fileInputRef.current?.click();
                }}
              >
                <ImageIcon className="h-5 w-5" />
                <span>{t('receiptScanner.photoLibrary')}</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => {
                  setScanMenuOpen(false);
                  fileInputRef.current?.click();
                }}
              >
                <FolderOpen className="h-5 w-5" />
                <span>{t('receiptScanner.chooseFile')}</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Overdue Payment Dialog */}
      <Dialog open={overduePaymentDialogOpen} onOpenChange={setOverduePaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('widgets.makePayment')}
            </DialogTitle>
            <DialogDescription>
              {selectedOverduePayment?.name} - {t('widgets.overduePayment')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm text-muted-foreground">{t('widgets.minimumPayment')}</p>
              <p className="text-lg font-bold text-destructive">
                {selectedOverduePayment && formatCurrency(selectedOverduePayment.amount)}
              </p>
            </div>

            {selectedOverduePayment?.type === 'card' && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm text-muted-foreground">{t('widgets.totalDebt')}</p>
                <p className="text-lg font-bold">
                  {formatCurrency(selectedOverduePayment.balance || 0)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="overdue-payment-amount">{t('dialogs.paymentAmount')}</Label>
              <Input
                id="overdue-payment-amount"
                type="number"
                step="0.01"
                value={overduePaymentAmount}
                onChange={(e) => setOverduePaymentAmount(e.target.value)}
                placeholder={selectedOverduePayment?.amount.toString()}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOverduePaymentAmount(selectedOverduePayment?.amount.toString() || '')}
                >
                  {t('widgets.minPayment')}
                </Button>
                {selectedOverduePayment?.type === 'card' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOverduePaymentAmount(selectedOverduePayment?.balance?.toString() || '')}
                  >
                    {t('widgets.fullPayment')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOverduePaymentDialogOpen(false)}>
              {t('dialogs.cancel')}
            </Button>
            <Button onClick={handleOverduePayment} disabled={processingOverduePayment}>
              {processingOverduePayment ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {t('widgets.confirmPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
