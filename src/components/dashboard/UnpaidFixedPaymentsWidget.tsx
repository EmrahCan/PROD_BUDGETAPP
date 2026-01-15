import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CalendarClock, 
  Check, 
  CheckCircle2,
  Home, 
  Zap, 
  Droplets, 
  Flame, 
  Wifi, 
  Phone, 
  Tv, 
  Shield, 
  Car, 
  GraduationCap, 
  Dumbbell, 
  Heart, 
  Music, 
  Gamepad2, 
  Building2, 
  CreditCard,
  Sparkles,
  MoreHorizontal,
  LucideIcon,
  Wallet,
  Loader2
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { Link } from "react-router-dom";
import { usePaymentCelebration } from "@/hooks/usePaymentCelebration";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const categoryIcons: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  rent: { icon: Home, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  electricity: { icon: Zap, color: "text-yellow-500", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  water: { icon: Droplets, color: "text-cyan-500", bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
  gas: { icon: Flame, color: "text-orange-500", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  internet: { icon: Wifi, color: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  phone: { icon: Phone, color: "text-green-500", bgColor: "bg-green-100 dark:bg-green-900/30" },
  tv: { icon: Tv, color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/30" },
  streaming: { icon: Sparkles, color: "text-pink-500", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
  insurance: { icon: Shield, color: "text-indigo-500", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  car: { icon: Car, color: "text-slate-500", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
  education: { icon: GraduationCap, color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  gym: { icon: Dumbbell, color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  health: { icon: Heart, color: "text-rose-500", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
  music: { icon: Music, color: "text-violet-500", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
  gaming: { icon: Gamepad2, color: "text-lime-500", bgColor: "bg-lime-100 dark:bg-lime-900/30" },
  apartment: { icon: Building2, color: "text-teal-500", bgColor: "bg-teal-100 dark:bg-teal-900/30" },
  loan: { icon: CreditCard, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  other: { icon: MoreHorizontal, color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-900/30" },
};

const getCategoryIcon = (category: string) => {
  return categoryIcons[category] || categoryIcons.other;
};

// Get the first day of the current month in YYYY-MM-DD format
const getCurrentMonthStart = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

interface FixedPayment {
  id: string;
  name: string;
  amount: number;
  category: string;
  payment_day: number;
  currency?: string;
  account_id?: string | null;
  card_id?: string | null;
}

interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

interface CreditCard {
  id: string;
  name: string;
  balance: number;
  card_limit: number;
  currency: string;
}

export function UnpaidFixedPaymentsWidget() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { celebrate } = usePaymentCelebration();
  const [payments, setPayments] = useState<FixedPayment[]>([]);
  const [paidPaymentIds, setPaidPaymentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<FixedPayment | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch active fixed payments with account/card info
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("fixed_payments")
        .select("id, name, amount, category, payment_day, currency, account_id, card_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("payment_day", { ascending: true });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch payment records for current month
      const currentMonth = getCurrentMonthStart();
      const { data: recordsData, error: recordsError } = await supabase
        .from("payment_records")
        .select("fixed_payment_id")
        .eq("user_id", user.id)
        .eq("payment_month", currentMonth);

      if (recordsError) throw recordsError;
      
      const paidIds = new Set((recordsData || []).map(r => r.fixed_payment_id));
      setPaidPaymentIds(paidIds);

      // Fetch accounts and cards for payment selection
      const [accountsRes, cardsRes] = await Promise.all([
        supabase.from("accounts").select("id, name, balance, currency").eq("user_id", user.id),
        supabase.from("credit_cards").select("id, name, balance, card_limit, currency").eq("user_id", user.id)
      ]);

      if (accountsRes.data) setAccounts(accountsRes.data);
      if (cardsRes.data) setCards(cardsRes.data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentDialog = (payment: FixedPayment) => {
    setSelectedPayment(payment);
    // Pre-select payment method if already defined on the payment
    if (payment.account_id) {
      setSelectedPaymentMethod(`account-${payment.account_id}`);
    } else if (payment.card_id) {
      setSelectedPaymentMethod(`card-${payment.card_id}`);
    } else {
      setSelectedPaymentMethod("");
    }
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!user || !selectedPayment) return;
    
    setProcessing(true);
    const currentMonth = getCurrentMonthStart();
    
    try {
      // Insert payment record
      const { error } = await supabase
        .from("payment_records")
        .insert({
          user_id: user.id,
          fixed_payment_id: selectedPayment.id,
          payment_month: currentMonth,
          amount: selectedPayment.amount
        });

      if (error) throw error;

      // Deduct from account if selected
      if (selectedPaymentMethod.startsWith("account-")) {
        const accountId = selectedPaymentMethod.replace("account-", "");
        const { data: account } = await supabase
          .from("accounts")
          .select("balance")
          .eq("id", accountId)
          .single();
        
        if (account) {
          await supabase
            .from("accounts")
            .update({ balance: account.balance - selectedPayment.amount })
            .eq("id", accountId);
        }
      }

      // Add to card balance if selected
      if (selectedPaymentMethod.startsWith("card-")) {
        const cardId = selectedPaymentMethod.replace("card-", "");
        const { data: card } = await supabase
          .from("credit_cards")
          .select("balance")
          .eq("id", cardId)
          .single();
        
        if (card) {
          await supabase
            .from("credit_cards")
            .update({ balance: card.balance + selectedPayment.amount })
            .eq("id", cardId);
        }
      }
      
      // Mark related notifications as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("related_entity_id", selectedPayment.id)
        .eq("related_entity_type", "fixed_payment")
        .in("notification_type", ["payment_reminder", "payment_overdue"])
        .eq("is_read", false);

      celebrate(selectedPayment.name, selectedPayment.amount, selectedPayment.currency || 'TRY');
      setPaidPaymentIds(prev => new Set([...prev, selectedPayment.id]));
      setPaymentDialogOpen(false);
      setSelectedPayment(null);
      setSelectedPaymentMethod("");
      
      // Refresh accounts/cards data
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const unpaidPayments = payments.filter(p => !paidPaymentIds.has(p.id));
  const paidCount = payments.length - unpaidPayments.length;
  const totalCount = payments.length;
  const progressPercent = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
  const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-500" />
            {t('fixedPayments.thisMonth')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={unpaidPayments.length > 0 ? 'border-amber-500/50' : 'border-success/50'}>
      <CardHeader className="pb-2 lg:pb-3 px-3 lg:px-6 pt-3 lg:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm lg:text-lg">
            <CalendarClock className="h-4 w-4 lg:h-5 lg:w-5 text-amber-500" />
            {t('fixedPayments.thisMonth')}
          </CardTitle>
          <Link to="/fixed-payments">
            <Button variant="ghost" size="sm" className="h-7 lg:h-8 text-xs lg:text-sm px-2 lg:px-3">
              {t('dashboard.seeAll')}
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 lg:space-y-4 px-3 lg:px-6 pb-3 lg:pb-6">
        {/* Progress Section */}
        <div className="space-y-1.5 lg:space-y-2">
          <div className="flex justify-between text-xs lg:text-sm">
            <span className="text-muted-foreground">{paidCount}/{totalCount} {t('fixedPayments.paidThisMonth')}</span>
            <span className="font-medium">{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5 lg:h-2" />
        </div>

        {unpaidPayments.length === 0 ? (
          <div className="text-center py-4 lg:py-6">
            <CheckCircle2 className="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-2 text-success" />
            <p className="text-success font-medium text-sm lg:text-base">{t('fixedPayments.paidThisMonth')}</p>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              {formatCurrency(payments.reduce((sum, p) => sum + Number(p.amount), 0))} {t('fixedPayments.totalMonthlyPayment').toLowerCase()}
            </p>
          </div>
        ) : (
          <>
            {/* Unpaid Amount Summary */}
            <div className="p-2 lg:p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-muted-foreground">{t('installments.remaining')}</p>
              <p className="text-lg lg:text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalUnpaid)}</p>
            </div>

            {/* Unpaid Payments List */}
            <div className="space-y-1.5 lg:space-y-2 max-h-[200px] lg:max-h-[250px] overflow-y-auto pr-1">
              {unpaidPayments.slice(0, 5).map((payment) => {
                const catConfig = getCategoryIcon(payment.category);
                const Icon = catConfig.icon;
                const today = new Date().getDate();
                const isOverdue = payment.payment_day < today;
                
                return (
                  <div
                    key={payment.id}
                    className={`flex items-center justify-between p-2 lg:p-3 rounded-lg border transition-colors ${
                      isOverdue 
                        ? 'border-destructive/50 bg-destructive/5' 
                        : 'border-border bg-card hover:bg-accent/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                      <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full ${catConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-3.5 w-3.5 lg:h-4 lg:w-4 ${catConfig.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs lg:text-sm truncate">{payment.name}</p>
                        <p className="text-[10px] lg:text-xs text-muted-foreground">
                          {t('fixedPayments.everyMonth')} {payment.payment_day}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                      <span className="font-semibold text-xs lg:text-sm">{formatCurrency(payment.amount)}</span>
                      {isOverdue ? (
                        <Badge variant="destructive" className="text-[9px] lg:text-xs h-5 px-1 lg:px-1.5">
                          !
                        </Badge>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 lg:h-8 lg:w-8 text-success hover:bg-success/10"
                        onClick={() => openPaymentDialog(payment)}
                      >
                        <Check className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {unpaidPayments.length > 5 && (
                <Link to="/fixed-payments">
                  <Button variant="ghost" className="w-full text-xs lg:text-sm h-7 lg:h-9">
                    +{unpaidPayments.length - 5} {t('calendar.more')}
                  </Button>
                </Link>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {t('widgets.makePayment')}
            </DialogTitle>
            <DialogDescription>
              {selectedPayment?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Payment Amount */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">{t('dialogs.amount')}</p>
              <p className="text-2xl font-bold text-primary">
                {selectedPayment && formatCurrency(selectedPayment.amount)}
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label>{t('fixedPayments.paymentSource')}</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder={t('fixedPayments.selectPaymentSource')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('fixedPayments.noDeduction')}</SelectItem>
                  {accounts.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {t('accounts.title')}
                      </div>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={`account-${account.id}`}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{account.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(account.balance)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {cards.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {t('cards.title')}
                      </div>
                      {cards.map(card => (
                        <SelectItem key={card.id} value={`card-${card.id}`}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{card.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(card.card_limit - card.balance)} {t('cards.available')}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('fixedPayments.paymentSourceDescription')}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmPayment} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {t('fixedPayments.markAsPaid')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}