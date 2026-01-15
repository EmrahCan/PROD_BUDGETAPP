import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useTranslation } from "react-i18next";
import { LoanDialog } from "@/components/loans/LoanDialog";
import { Trash2, Edit2, Building2, GraduationCap, Home, Car, CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, isAfter, isBefore, differenceInDays } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePaymentCelebration } from "@/hooks/usePaymentCelebration";
import { TURKISH_BANKS } from "@/types/bank";
import { BankLogo } from "@/components/BankLogo";

interface Loan {
  id: string;
  name: string;
  loan_type: 'housing' | 'vehicle' | 'personal' | 'education';
  bank_id: string | null;
  bank_name: string | null;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number | null;
  start_date: string;
  end_date: string | null;
  payment_day: number;
  total_months: number;
  paid_months: number;
  currency: string;
  account_id: string | null;
  card_id: string | null;
  is_active: boolean;
  created_at: string;
}

const LOAN_TYPE_CONFIG = {
  housing: { icon: Home, label: 'Konut Kredisi', labelEn: 'Housing Loan', color: 'bg-blue-500' },
  vehicle: { icon: Car, label: 'Araç Kredisi', labelEn: 'Vehicle Loan', color: 'bg-orange-500' },
  personal: { icon: CreditCard, label: 'İhtiyaç Kredisi', labelEn: 'Personal Loan', color: 'bg-green-500' },
  education: { icon: GraduationCap, label: 'Eğitim Kredisi', labelEn: 'Education Loan', color: 'bg-purple-500' },
};

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormat();
  const { t, i18n } = useTranslation();
  const { celebrate } = usePaymentCelebration();

  const fetchLoans = async () => {
    if (isDemoMode) {
      setLoans(demoData.loans as Loan[]);
      setLoading(false);
      return;
    }
    
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: t('loans.loadError'), variant: "destructive" });
    } else {
      setLoans((data || []) as Loan[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user || isDemoMode) fetchLoans();
  }, [user, isDemoMode]);

  const handleDelete = async () => {
    if (isDemoMode) {
      toast({ title: t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz" });
      setDeleteId(null);
      return;
    }
    if (!deleteId) return;
    
    const { error } = await supabase.from('loans').delete().eq('id', deleteId);
    
    if (error) {
      toast({ title: t('loans.deleteError'), variant: "destructive" });
    } else {
      toast({ title: t('loans.deleted') });
      fetchLoans();
    }
    setDeleteId(null);
  };

  const handleMarkPaid = async (loan: Loan) => {
    if (isDemoMode) {
      toast({ title: t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz" });
      return;
    }
    const newPaidMonths = loan.paid_months + 1;
    const newRemainingAmount = Math.max(0, loan.remaining_amount - loan.monthly_payment);
    const isCompleted = newPaidMonths >= loan.total_months;
    
    const { error } = await supabase
      .from('loans')
      .update({
        paid_months: newPaidMonths,
        remaining_amount: newRemainingAmount,
        is_active: !isCompleted
      })
      .eq('id', loan.id);
    
    if (error) {
      toast({ title: t('loans.updateError'), variant: "destructive" });
    } else {
      toast({ title: t('loans.paymentMarked') });
      celebrate(loan.name, loan.monthly_payment, loan.currency);
      fetchLoans();
      
      // Mark related notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('related_entity_id', loan.id)
        .eq('related_entity_type', 'loan')
        .eq('is_read', false);
    }
  };

  const getNextPaymentDate = (loan: Loan) => {
    const startDate = new Date(loan.start_date);
    const nextPayment = addMonths(startDate, loan.paid_months);
    nextPayment.setDate(loan.payment_day);
    return nextPayment;
  };

  const getPaymentStatus = (loan: Loan) => {
    const nextPayment = getNextPaymentDate(loan);
    const today = new Date();
    const daysUntil = differenceInDays(nextPayment, today);
    
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 3) return 'upcoming';
    return 'normal';
  };

  const activeLoans = loans.filter(l => l.is_active);
  const completedLoans = loans.filter(l => !l.is_active);
  
  const totalRemaining = activeLoans.reduce((sum, l) => sum + l.remaining_amount, 0);
  const totalMonthlyPayment = activeLoans.reduce((sum, l) => sum + l.monthly_payment, 0);

  const dateLocale = i18n.language === 'tr' ? tr : enUS;

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-lg lg:text-2xl font-bold text-foreground truncate">{t('loans.title')}</h1>
            <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block">{t('loans.subtitle')}</p>
          </div>
          <LoanDialog onSuccess={fetchLoans} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
          <Card>
            <CardContent className="p-3 lg:pt-6 lg:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-muted-foreground truncate">{t('loans.totalRemaining')}</p>
                  <p className="text-sm lg:text-2xl font-bold text-foreground">{formatCurrency(totalRemaining, 'TRY')}</p>
                </div>
                <Building2 className="h-5 w-5 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 lg:pt-6 lg:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-muted-foreground truncate">{t('loans.monthlyPayment')}</p>
                  <p className="text-sm lg:text-2xl font-bold text-foreground">{formatCurrency(totalMonthlyPayment, 'TRY')}</p>
                </div>
                <CreditCard className="h-5 w-5 lg:h-8 lg:w-8 text-orange-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-2 lg:col-span-1">
            <CardContent className="p-3 lg:pt-6 lg:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-muted-foreground">{t('loans.activeLoans')}</p>
                  <p className="text-sm lg:text-2xl font-bold text-foreground">{activeLoans.length}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 lg:h-8 lg:w-8 text-green-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && loans.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('loans.noLoans')}</p>
              <p className="text-sm text-muted-foreground mt-2">{t('loans.noLoansHint')}</p>
            </CardContent>
          </Card>
        )}

        {/* Active Loans */}
        {!loading && activeLoans.length > 0 && (
          <div className="space-y-3 lg:space-y-4">
            <h2 className="text-base lg:text-lg font-semibold text-foreground">{t('loans.activeLoansTitle')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {activeLoans.map((loan) => {
                const config = LOAN_TYPE_CONFIG[loan.loan_type];
                const Icon = config.icon;
                const progress = (loan.paid_months / loan.total_months) * 100;
                const status = getPaymentStatus(loan);
                const nextPayment = getNextPaymentDate(loan);
                
                return (
                  <Card key={loan.id} className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${config.color}`} />
                    <CardContent className="p-3 lg:p-4 space-y-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 lg:p-2 rounded-lg ${config.color}/10 flex-shrink-0`}>
                            <Icon className={`h-4 w-4 lg:h-5 lg:w-5 ${config.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm lg:text-base font-semibold text-foreground truncate">{loan.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {i18n.language === 'tr' ? config.label : config.labelEn}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {status === 'overdue' && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                              <AlertCircle className="h-3 w-3 lg:mr-1" />
                              <span className="hidden lg:inline">{t('loans.overdue')}</span>
                            </Badge>
                          )}
                          {status === 'upcoming' && (
                            <Badge variant="default" className="text-xs px-1.5 py-0.5 bg-orange-500">
                              <AlertCircle className="h-3 w-3 lg:mr-1" />
                              <span className="hidden lg:inline">{t('loans.upcoming')}</span>
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 lg:h-8 lg:w-8"
                            onClick={() => setEditLoan(loan)}
                          >
                            <Edit2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 lg:h-8 lg:w-8"
                            onClick={() => setDeleteId(loan.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Bank Info */}
                      {loan.bank_id && (
                        <div className="flex items-center gap-2 text-xs lg:text-sm text-muted-foreground">
                          <BankLogo bankId={loan.bank_id} size="sm" />
                          <span className="truncate">{loan.bank_name}</span>
                        </div>
                      )}
                      
                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs lg:text-sm">
                          <span className="text-muted-foreground">
                            {loan.paid_months} / {loan.total_months} {t('loans.months')}
                          </span>
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 lg:h-2" />
                      </div>
                      
                      {/* Amounts */}
                      <div className="grid grid-cols-2 gap-2 lg:gap-4 text-xs lg:text-sm">
                        <div>
                          <p className="text-muted-foreground">{t('loans.monthlyAmount')}</p>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(loan.monthly_payment, loan.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('loans.remaining')}</p>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(loan.remaining_amount, loan.currency)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Interest Rate - Hidden on mobile */}
                      {loan.interest_rate && (
                        <div className="text-xs lg:text-sm hidden lg:block">
                          <span className="text-muted-foreground">{t('loans.interestRate')}: </span>
                          <span className="font-medium">%{loan.interest_rate}</span>
                        </div>
                      )}
                      
                      {/* Next Payment */}
                      <div className="flex items-center justify-between pt-2 border-t gap-2">
                        <div className="text-xs lg:text-sm min-w-0">
                          <span className="text-muted-foreground">{t('loans.nextPayment')}: </span>
                          <span className="font-medium">
                            {format(nextPayment, 'd MMM', { locale: dateLocale })}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleMarkPaid(loan)}
                          className="gap-1 h-7 lg:h-8 text-xs lg:text-sm px-2 lg:px-3"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          <span className="hidden sm:inline">{t('loans.markPaid')}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Loans */}
        {!loading && completedLoans.length > 0 && (
          <div className="space-y-3 lg:space-y-4">
            <h2 className="text-base lg:text-lg font-semibold text-foreground">{t('loans.completedLoansTitle')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {completedLoans.map((loan) => {
                const config = LOAN_TYPE_CONFIG[loan.loan_type];
                const Icon = config.icon;
                
                return (
                  <Card key={loan.id} className="relative overflow-hidden opacity-75">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                    <CardContent className="p-3 lg:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 lg:p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                            <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm lg:text-base font-semibold text-foreground truncate">{loan.name}</p>
                              <CheckCircle2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-500 flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {i18n.language === 'tr' ? config.label : config.labelEn}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs lg:text-sm font-semibold text-green-600">
                            {formatCurrency(loan.total_amount, loan.currency)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 lg:h-8 lg:w-8"
                            onClick={() => setDeleteId(loan.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        {editLoan && (
          <LoanDialog
            loan={editLoan}
            onSuccess={() => {
              setEditLoan(null);
              fetchLoans();
            }}
            onClose={() => setEditLoan(null)}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('loans.deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('loans.deleteConfirmDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}