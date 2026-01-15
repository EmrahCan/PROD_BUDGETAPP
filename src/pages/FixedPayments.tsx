import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FixedPaymentDialog } from "@/components/fixed-payments/FixedPaymentDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { 
  Trash2, 
  Calendar as CalendarIcon, 
  ToggleLeft, 
  ToggleRight,
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
  Check,
  X,
  Pencil
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { Progress } from "@/components/ui/progress";
import { usePaymentCelebration } from "@/hooks/usePaymentCelebration";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function FixedPayments() {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { celebrate } = usePaymentCelebration();
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState<any | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (user || isDemoMode) {
      fetchPayments();
    }
  }, [user, isDemoMode]);

  const fetchPayments = async () => {
    if (isDemoMode) {
      setPayments(demoData.fixed_payments);
      // Create mock payment records for demo - all unpaid by default
      setPaymentRecords({});
      setLoading(false);
      return;
    }
    
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch fixed payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("fixed_payments")
        .select("*")
        .eq("user_id", user.id)
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
      
      // Create a map of paid payments
      const paidMap: Record<string, boolean> = {};
      (recordsData || []).forEach(record => {
        paidMap[record.fixed_payment_id] = true;
      });
      setPaymentRecords(paidMap);
    } catch (error: any) {
      toast.error(t('fixedPayments.loadError') || "Sabit ödemeler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isDemoMode) {
      toast.info(t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz");
      setDeleteId(null);
      return;
    }
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("fixed_payments")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast.success(t('fixedPayments.paymentDeleted'));
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (isDemoMode) {
      toast.info(t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz");
      return;
    }
    try {
      const { error } = await supabase
        .from("fixed_payments")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentStatus ? t('fixedPayments.paymentDeactivated') : t('fixedPayments.paymentActivated'));
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const togglePaid = async (paymentId: string, amount: number, paymentName: string, payment: any) => {
    if (isDemoMode) {
      toast.info(t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz");
      return;
    }
    if (!user) return;
    
    const currentMonth = getCurrentMonthStart();
    const isPaid = paymentRecords[paymentId];

    try {
      if (isPaid) {
        // Remove payment record
        const { error } = await supabase
          .from("payment_records")
          .delete()
          .eq("fixed_payment_id", paymentId)
          .eq("payment_month", currentMonth);

        if (error) throw error;

        // Reverse the account balance deduction
        if (payment.account_id) {
          const { data: account } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", payment.account_id)
            .single();
          
          if (account) {
            await supabase
              .from("accounts")
              .update({ balance: account.balance + amount })
              .eq("id", payment.account_id);
          }
        }

        // Reverse the card balance addition
        if (payment.card_id) {
          const { data: card } = await supabase
            .from("credit_cards")
            .select("balance")
            .eq("id", payment.card_id)
            .single();
          
          if (card) {
            await supabase
              .from("credit_cards")
              .update({ balance: card.balance - amount })
              .eq("id", payment.card_id);
          }
        }

        toast.success(t('fixedPayments.paymentMarkedAsUnpaid'));
      } else {
        // Add payment record
        const { error } = await supabase
          .from("payment_records")
          .insert({
            user_id: user.id,
            fixed_payment_id: paymentId,
            payment_month: currentMonth,
            amount: amount
          });

        if (error) throw error;

        // Deduct from account balance if account is selected
        if (payment.account_id) {
          const { data: account } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", payment.account_id)
            .single();
          
          if (account) {
            await supabase
              .from("accounts")
              .update({ balance: account.balance - amount })
              .eq("id", payment.account_id);
          }
        }

        // Add to card balance if card is selected
        if (payment.card_id) {
          const { data: card } = await supabase
            .from("credit_cards")
            .select("balance")
            .eq("id", payment.card_id)
            .single();
          
          if (card) {
            await supabase
              .from("credit_cards")
              .update({ balance: card.balance + amount })
              .eq("id", payment.card_id);
          }
        }
        
        // Delete related notifications for this payment
        await supabase
          .from("notifications")
          .delete()
          .eq("user_id", user.id)
          .eq("related_entity_id", paymentId)
          .eq("related_entity_type", "fixed_payment");
        
        // Also mark any related notifications as read
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("related_entity_id", paymentId);
        
        celebrate(paymentName, amount, payment.currency || 'TRY');
      }
      
      // Update local state
      setPaymentRecords(prev => ({
        ...prev,
        [paymentId]: !isPaid
      }));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Get unique categories from payments
  const categories = [...new Set(payments.map(p => p.category))];

  // Filter payments by category
  const filteredPayments = categoryFilter === "all" 
    ? payments 
    : payments.filter(p => p.category === categoryFilter);

  const totalMonthly = payments
    .filter(p => p.is_active)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const paidThisMonth = payments
    .filter(p => p.is_active && paymentRecords[p.id])
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const paidCount = payments.filter(p => p.is_active && paymentRecords[p.id]).length;
  const activeCount = payments.filter(p => p.is_active).length;
  const progressPercent = activeCount > 0 ? (paidCount / activeCount) * 100 : 0;

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-amber-500 to-amber-500/60 shadow-lg">
            <CalendarIcon className="h-5 w-5 lg:h-8 lg:w-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg lg:text-3xl font-bold text-foreground truncate">{t('fixedPayments.title')}</h1>
            <p className="text-xs lg:text-base text-muted-foreground hidden sm:block">{t('fixedPayments.description')}</p>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          {/* Summary Cards - 2 columns on mobile */}
          <div className="grid grid-cols-2 gap-2 lg:gap-4">
            <Card className="p-3 lg:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-0">
                <div className="min-w-0">
                  <p className="text-[10px] lg:text-sm text-muted-foreground truncate">{t('fixedPayments.totalMonthlyPayment')}</p>
                  <p className="text-sm lg:text-3xl font-bold truncate">{formatCurrency(totalMonthly)}</p>
                </div>
                <CalendarIcon className="h-6 w-6 lg:h-8 lg:w-8 text-primary hidden lg:block" />
              </div>
            </Card>

            <Card className="p-3 lg:p-6">
              <div className="space-y-1.5 lg:space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] lg:text-sm text-muted-foreground">{t('fixedPayments.thisMonth')}</p>
                  <span className="text-xs lg:text-sm font-medium">{paidCount}/{activeCount}</span>
                </div>
                <Progress value={progressPercent} className="h-1.5 lg:h-2" />
                <div className="flex flex-col lg:flex-row justify-between text-[9px] lg:text-sm gap-0.5">
                  <span className="text-success truncate">{formatCurrency(paidThisMonth)}</span>
                  <span className="text-muted-foreground truncate">{formatCurrency(totalMonthly - paidThisMonth)} {t('installments.remaining')}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-3 lg:p-6">
            <div className="flex flex-col gap-3 lg:gap-4 mb-4 lg:mb-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base lg:text-xl font-bold truncate">{t('fixedPayments.allFixedPayments')}</h2>
                <FixedPaymentDialog onSuccess={fetchPayments} />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-8 lg:h-10 text-xs lg:text-sm">
                  <SelectValue placeholder={t('transactions.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('transactions.allCategories')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {String(t(`fixedCategories.${category}`, category))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8 text-sm">{t('common.loading')}</p>
            ) : filteredPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {categoryFilter === "all" ? t('fixedPayments.noPaymentsYet') : t('transactions.noTransactionsFiltered')}
              </p>
            ) : (
              <div className="space-y-2 lg:space-y-3">
                {filteredPayments.map((payment) => {
                  const catConfig = getCategoryIcon(payment.category);
                  const Icon = catConfig.icon;
                  const isPaid = paymentRecords[payment.id];
                  
                  return (
                    <div
                      key={payment.id}
                      className={`p-2.5 lg:p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors ${isPaid ? 'border-success/50 bg-success/5' : ''}`}
                    >
                      {/* Mobile Layout */}
                      <div className="flex items-center gap-2 sm:hidden">
                        <div className={`w-9 h-9 rounded-full ${catConfig.bgColor} flex items-center justify-center shrink-0`}>
                          <Icon className={`h-4 w-4 ${catConfig.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-medium text-sm truncate max-w-[100px]">{payment.name}</p>
                            <p className="text-sm font-bold whitespace-nowrap">
                              {formatCurrency(parseFloat(payment.amount))}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[10px] text-muted-foreground truncate">
                              {payment.payment_day}. gün
                            </p>
                            <div className="flex items-center gap-0.5">
                              {payment.is_active && (
                                <Badge 
                                  variant={isPaid ? "outline" : "destructive"} 
                                  className={`text-[8px] px-1 py-0 h-4 ${isPaid ? "border-success text-success" : ""}`}
                                >
                                  {isPaid ? "✓" : "✗"}
                                </Badge>
                              )}
                              {!payment.is_active && (
                                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">
                                  {t('fixedPayments.inactive')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Mobile Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {payment.is_active && (
                            <Button
                              variant={isPaid ? "outline" : "default"}
                              size="icon"
                              className={`h-7 w-7 ${isPaid ? "border-success text-success hover:bg-success/10" : "bg-success hover:bg-success/90"}`}
                              onClick={() => togglePaid(payment.id, parseFloat(payment.amount), payment.name, payment)}
                            >
                              {isPaid ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditPayment(payment)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(payment.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${catConfig.bgColor} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${catConfig.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{payment.name}</p>
                            <Badge variant={payment.is_active ? "default" : "secondary"}>
                              {payment.is_active ? t('fixedPayments.active') : t('fixedPayments.inactive')}
                            </Badge>
                            {payment.is_active && (
                              <Badge variant={isPaid ? "outline" : "destructive"} className={isPaid ? "border-success text-success" : ""}>
                                {isPaid ? t('fixedPayments.paidThisMonth') : t('fixedPayments.notPaidThisMonth')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t(`fixedCategories.${payment.category}`, payment.category)} • {t('fixedPayments.everyMonth')} {payment.payment_day}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-semibold">
                          {formatCurrency(parseFloat(payment.amount))}
                        </p>
                        {payment.is_active && (
                          <Button
                            variant={isPaid ? "outline" : "default"}
                            size="sm"
                            onClick={() => togglePaid(payment.id, parseFloat(payment.amount), payment.name, payment)}
                            className={isPaid ? "border-success text-success hover:bg-success/10" : "bg-success hover:bg-success/90"}
                          >
                            {isPaid ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                {t('fixedPayments.markAsPaid')}
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                {t('fixedPayments.markAsUnpaid')}
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(payment.id, payment.is_active)}
                        >
                          {payment.is_active ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditPayment(payment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(payment.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('fixedPayments.deleteConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('fixedPayments.cannotBeUndone')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Payment Dialog */}
        {editPayment && (
          <FixedPaymentDialog
            payment={editPayment}
            onSuccess={() => {
              setEditPayment(null);
              fetchPayments();
            }}
            open={!!editPayment}
            onOpenChange={(open) => !open && setEditPayment(null)}
          />
        )}
      </div>
    </Layout>
  );
}