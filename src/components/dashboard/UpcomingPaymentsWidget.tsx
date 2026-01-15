import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';

interface UpcomingPayment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  due_date: string;
  type: string;
  days_until: number;
}

export const UpcomingPaymentsWidget = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUpcomingPayments();
    }
  }, [user]);

  const fetchUpcomingPayments = async () => {
    try {
      const today = new Date();
      const currentDay = today.getDate();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

      // Fetch fixed payments
      const { data: fixedPayments, error: fixedError } = await supabase
        .from('fixed_payments')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .gte('payment_day', currentDay)
        .lte('payment_day', currentDay + 7);

      if (fixedError) throw fixedError;

      // Fetch credit cards
      const { data: cards, error: cardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user?.id)
        .gte('due_date', currentDay)
        .lte('due_date', currentDay + 7);

      if (cardsError) throw cardsError;

      const upcoming: UpcomingPayment[] = [
        ...(fixedPayments?.map(fp => ({
          id: fp.id,
          name: fp.name,
          amount: Number(fp.amount),
          currency: fp.currency,
          due_date: `${fp.payment_day}. ${t('widgets.dayOfMonth')}`,
          type: t('widgets.fixedPayment'),
          days_until: fp.payment_day - currentDay,
        })) || []),
        ...(cards?.map(card => ({
          id: card.id,
          name: card.name,
          amount: Number(card.balance),
          currency: card.currency,
          due_date: `${card.due_date}. ${t('widgets.dayOfMonth')}`,
          type: t('widgets.creditCard'),
          days_until: card.due_date - currentDay,
        })) || []),
      ].sort((a, b) => a.days_until - b.days_until);

      setUpcomingPayments(upcoming);
    } catch (error) {
      console.error('Error fetching upcoming payments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (upcomingPayments.length === 0) {
    return null;
  }

  const totalUpcoming = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card className="border-orange-500">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-orange-500">{t('widgets.upcomingPayments')}</CardTitle>
        </div>
        <CardDescription>
          {t('widgets.upcomingPaymentsNext7Days', { count: upcomingPayments.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold text-orange-500">
          {formatCurrency(totalUpcoming)}
        </div>
        
        <div className="space-y-2">
          {upcomingPayments.slice(0, 3).map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5">
              <div>
                <p className="font-medium text-sm">{payment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {payment.type} - {payment.days_until} {t('widgets.daysLater')}
                </p>
              </div>
              <Badge className="bg-orange-500">
                {formatCurrency(payment.amount)}
              </Badge>
            </div>
          ))}
          {upcomingPayments.length > 3 && (
            <p className="text-sm text-muted-foreground text-center">
              +{upcomingPayments.length - 3} {t('widgets.more')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
