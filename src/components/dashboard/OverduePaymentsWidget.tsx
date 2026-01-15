import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OverduePayment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  due_date: string;
  type: string;
  balance?: number;
}

export const OverduePaymentsWidget = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<OverduePayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchOverduePayments();
    }
  }, [user]);

  const fetchOverduePayments = async () => {
    try {
      const today = new Date();
      const currentDay = today.getDate();

      // Fetch credit cards with overdue payments
      const { data: cards, error: cardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user?.id)
        .lt('due_date', currentDay)
        .gt('minimum_payment', 0);

      if (cardsError) throw cardsError;

      const overdue: OverduePayment[] = cards?.map(card => ({
        id: card.id,
        name: card.name,
        amount: Number(card.minimum_payment) || 0,
        currency: card.currency,
        due_date: `${card.due_date}. ${t('widgets.dayOfMonth')}`,
        type: t('widgets.creditCard'),
        balance: Number(card.balance) || 0,
      })) || [];

      setOverduePayments(overdue);
    } catch (error) {
      console.error('Error fetching overdue payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = (payment: OverduePayment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.amount.toString());
    setPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedPayment || !user) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('dialogs.invalidAmount'));
      return;
    }

    setProcessing(true);
    try {
      // Update card balance
      const newBalance = Math.max(0, (selectedPayment.balance || 0) - amount);
      const newMinPayment = newBalance > 0 ? Math.min(selectedPayment.amount, newBalance * 0.1) : 0;

      const { error: updateError } = await supabase
        .from('credit_cards')
        .update({ 
          balance: newBalance,
          minimum_payment: newMinPayment
        })
        .eq('id', selectedPayment.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          card_id: selectedPayment.id,
          amount: amount,
          currency: selectedPayment.currency,
          category: 'Kredi Ödemesi',
          description: `${selectedPayment.name} - Gecikmiş Ödeme`,
          transaction_type: 'expense',
          transaction_date: new Date().toISOString().split('T')[0],
        });

      if (transactionError) throw transactionError;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: t('widgets.paymentCompleted'),
        message: `${selectedPayment.name} - ${formatCurrency(amount)}`,
        notification_type: 'payment_completed',
        priority: 'low',
        related_entity_type: 'credit_card',
        related_entity_id: selectedPayment.id,
      });

      toast.success(t('widgets.paymentSuccess'));
      setPaymentDialogOpen(false);
      setSelectedPayment(null);
      setPaymentAmount('');
      fetchOverduePayments();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(t('widgets.paymentError'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return null;
  }

  if (overduePayments.length === 0) {
    return null;
  }

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">{t('widgets.overduePayments')}</CardTitle>
          </div>
          <CardDescription>
            {t('widgets.overdueCount', { count: overduePayments.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(totalOverdue)}
          </div>
          
          <div className="space-y-2">
            {overduePayments.slice(0, 3).map((payment) => (
              <div 
                key={payment.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={() => handlePaymentClick(payment)}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="font-medium text-sm">{payment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.type} - {payment.due_date}
                    </p>
                  </div>
                </div>
                <Badge variant="destructive" className="cursor-pointer">
                  {formatCurrency(payment.amount)}
                </Badge>
              </div>
            ))}
            {overduePayments.length > 3 && (
              <p className="text-sm text-muted-foreground text-center">
                +{overduePayments.length - 3} {t('widgets.more')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('widgets.makePayment')}
            </DialogTitle>
            <DialogDescription>
              {selectedPayment?.name} - {t('widgets.overduePayment')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm text-muted-foreground">{t('widgets.minimumPayment')}</p>
              <p className="text-lg font-bold text-destructive">
                {selectedPayment && formatCurrency(selectedPayment.amount)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm text-muted-foreground">{t('widgets.totalDebt')}</p>
              <p className="text-lg font-bold">
                {selectedPayment && formatCurrency(selectedPayment.balance || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">{t('dialogs.paymentAmount')}</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={selectedPayment?.amount.toString()}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(selectedPayment?.amount.toString() || '')}
                >
                  {t('widgets.minPayment')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(selectedPayment?.balance?.toString() || '')}
                >
                  {t('widgets.fullPayment')}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              {t('dialogs.cancel')}
            </Button>
            <Button onClick={handlePayment} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {t('widgets.confirmPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};