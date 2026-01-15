import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';

interface UpcomingInstallment {
  id: string;
  name: string;
  monthly_amount: number;
  currency: string;
  next_payment_date: Date;
  card_name?: string;
  days_until: number;
  remaining_months: number;
}

export const UpcomingInstallmentsWidget = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const [upcomingInstallments, setUpcomingInstallments] = useState<UpcomingInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUpcomingInstallments();
    }
  }, [user]);

  const fetchUpcomingInstallments = async () => {
    try {
      const today = new Date();
      
      // Fetch active installments with card info
      const { data: installments, error } = await supabase
        .from('installments')
        .select(`
          *,
          credit_cards(name)
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;

      const upcoming: UpcomingInstallment[] = [];

      installments?.forEach(inst => {
        const startDate = new Date(inst.start_date);
        const nextPaymentDate = new Date(startDate);
        nextPaymentDate.setMonth(startDate.getMonth() + inst.paid_months);
        
        const daysUntil = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Show installments due in the next 30 days
        if (daysUntil >= 0 && daysUntil <= 30) {
          upcoming.push({
            id: inst.id,
            name: inst.name,
            monthly_amount: Number(inst.monthly_amount),
            currency: inst.currency,
            next_payment_date: nextPaymentDate,
            card_name: inst.credit_cards?.name,
            days_until: daysUntil,
            remaining_months: inst.total_months - inst.paid_months,
          });
        }
      });

      // Sort by days until payment
      upcoming.sort((a, b) => a.days_until - b.days_until);
      setUpcomingInstallments(upcoming);
    } catch (error) {
      console.error('Error fetching upcoming installments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (upcomingInstallments.length === 0) {
    return null;
  }

  const totalUpcoming = upcomingInstallments.reduce((sum, i) => sum + i.monthly_amount, 0);

  return (
    <Card className="border-blue-500">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-blue-500">{t('widgets.upcomingInstallments')}</CardTitle>
        </div>
        <CardDescription>
          {t('widgets.upcomingInstallmentsNext30Days', { count: upcomingInstallments.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold text-blue-500">
          {formatCurrency(totalUpcoming)}
        </div>
        
        <div className="space-y-2">
          {upcomingInstallments.slice(0, 3).map((installment) => (
            <div key={installment.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5">
              <div>
                <p className="font-medium text-sm">{installment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {installment.card_name || t('widgets.noCardSelected')} • {installment.days_until} {t('widgets.daysLater')} • {installment.remaining_months} {t('widgets.monthsRemaining')}
                </p>
              </div>
              <Badge className="bg-blue-500">
                {formatCurrency(installment.monthly_amount)}
              </Badge>
            </div>
          ))}
          {upcomingInstallments.length > 3 && (
            <p className="text-sm text-muted-foreground text-center">
              +{upcomingInstallments.length - 3} {t('widgets.more')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};