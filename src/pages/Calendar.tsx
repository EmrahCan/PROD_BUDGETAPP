import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo, DEMO_MOCK_DATA } from '@/contexts/DemoContext';
import { toast } from 'sonner';
import { Layout } from "@/components/Layout";
import { addMonths, getDate, startOfMonth, getDay, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, List, CreditCard, Receipt, ShoppingCart, Landmark, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePaymentCelebration } from '@/hooks/usePaymentCelebration';
import confetti from 'canvas-confetti';

interface PaymentEvent {
  id: string;
  title: string;
  amount: number;
  currency: string;
  day: number;
  type: 'fixed' | 'card' | 'installment' | 'loan';
  bank_name?: string;
  isPaid?: boolean;
}

const Calendar = () => {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { formatMonthYear, formatDayMonth, getLocale } = useDateFormat();
  const { celebrate } = usePaymentCelebration();
  const { isDemoMode, demoData } = useDemo();
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'calendar'
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidFixedPaymentIds, setPaidFixedPaymentIds] = useState<Set<string>>(new Set());
  const [demoPaidIds, setDemoPaidIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Filter states
  const [showFixed, setShowFixed] = useState(true);
  const [showCards, setShowCards] = useState(true);
  const [showInstallments, setShowInstallments] = useState(true);
  const [showLoans, setShowLoans] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      loadDemoEvents();
    } else if (user) {
      fetchPaymentEvents();
    }
  }, [user, currentMonth, isDemoMode]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Load demo events
  const loadDemoEvents = () => {
    const allEvents: PaymentEvent[] = [
      // Fixed payments
      ...demoData.fixed_payments.filter(fp => fp.is_active).map(fp => ({
        id: fp.id,
        title: fp.name,
        amount: Number(fp.amount),
        currency: fp.currency,
        day: fp.payment_day,
        type: 'fixed' as const,
        isPaid: demoPaidIds.has(fp.id),
      })),
      // Credit cards
      ...demoData.credit_cards.map(card => ({
        id: card.id,
        title: `${card.name} - ${t('calendar.lastPayment')}`,
        amount: Number(card.balance),
        currency: card.currency,
        day: card.due_date,
        type: 'card' as const,
        bank_name: card.bank_name,
      })),
      // Installments
      ...demoData.installments.filter(inst => {
        if (!inst.is_active) return false;
        const startDate = new Date(inst.start_date);
        const paidMonths = inst.paid_months || 0;
        const remainingMonths = inst.total_months - paidMonths;
        
        for (let i = 0; i < remainingMonths; i++) {
          const paymentDate = addMonths(startDate, paidMonths + i);
          if (paymentDate.getFullYear() === currentMonth.getFullYear() && 
              paymentDate.getMonth() === currentMonth.getMonth()) {
            return true;
          }
        }
        return false;
      }).map(inst => {
        const startDate = new Date(inst.start_date);
        const paymentDay = getDate(startDate);
        const card = demoData.credit_cards.find(c => c.id === inst.card_id);
        
        return {
          id: inst.id,
          title: inst.name,
          amount: Number(inst.monthly_amount),
          currency: inst.currency,
          day: paymentDay,
          type: 'installment' as const,
          bank_name: card?.bank_name,
          isPaid: demoPaidIds.has(inst.id),
        };
      }),
      // Loans
      ...demoData.loans.filter(l => l.is_active).map(loan => ({
        id: loan.id,
        title: loan.name,
        amount: Number(loan.monthly_payment),
        currency: loan.currency,
        day: loan.payment_day,
        type: 'loan' as const,
        bank_name: loan.bank_name || undefined,
        isPaid: demoPaidIds.has(loan.id),
      })),
    ];

    setEvents(allEvents);
    setLoading(false);
  };

  const fetchPaymentEvents = async () => {
    try {
      const monthStart = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;

      // Fetch all data in parallel
      const [
        { data: fixedPayments, error: fixedError },
        { data: cards, error: cardsError },
        { data: installments, error: installmentsError },
        { data: loans, error: loansError },
        { data: paymentRecords, error: paymentRecordsError }
      ] = await Promise.all([
        supabase.from('fixed_payments').select('*').eq('user_id', user?.id).eq('is_active', true),
        supabase.from('credit_cards').select('*').eq('user_id', user?.id),
        supabase.from('installments').select('*, credit_cards(bank_name)').eq('user_id', user?.id).eq('is_active', true),
        supabase.from('loans').select('*').eq('user_id', user?.id).eq('is_active', true),
        supabase.from('payment_records').select('fixed_payment_id').eq('user_id', user?.id).eq('payment_month', monthStart)
      ]);

      if (fixedError) throw fixedError;
      if (cardsError) throw cardsError;
      if (installmentsError) throw installmentsError;
      if (loansError) throw loansError;
      if (paymentRecordsError) throw paymentRecordsError;

      // Track paid fixed payments
      const paidIds = new Set((paymentRecords || []).map(r => r.fixed_payment_id).filter(Boolean) as string[]);
      setPaidFixedPaymentIds(paidIds);

      const allEvents: PaymentEvent[] = [
        ...(fixedPayments?.map(fp => ({
          id: fp.id,
          title: fp.name,
          amount: Number(fp.amount),
          currency: fp.currency,
          day: fp.payment_day,
          type: 'fixed' as const,
          isPaid: paidIds.has(fp.id),
        })) || []),
        ...(cards?.map(card => ({
          id: card.id,
          title: `${card.name} - ${t('calendar.lastPayment')}`,
          amount: Number(card.balance),
          currency: card.currency,
          day: card.due_date,
          type: 'card' as const,
          bank_name: card.bank_name,
        })) || []),
        ...(installments?.filter(inst => {
          // Check if this installment has a payment due in the current displayed month
          const startDate = new Date(inst.start_date);
          const paidMonths = inst.paid_months || 0;
          const remainingMonths = inst.total_months - paidMonths;
          
          // Check each remaining payment
          for (let i = 0; i < remainingMonths; i++) {
            const paymentDate = addMonths(startDate, paidMonths + i);
            if (paymentDate.getFullYear() === currentMonth.getFullYear() && 
                paymentDate.getMonth() === currentMonth.getMonth()) {
              return true;
            }
          }
          return false;
        }).map(inst => {
          const startDate = new Date(inst.start_date);
          const paymentDay = getDate(startDate);
          
          return {
            id: inst.id,
            title: inst.name,
            amount: Number(inst.monthly_amount),
            currency: inst.currency,
            day: paymentDay,
            type: 'installment' as const,
            bank_name: inst.credit_cards?.bank_name,
          };
        }) || []),
        ...(loans?.map(loan => ({
          id: loan.id,
          title: loan.name,
          amount: Number(loan.monthly_payment),
          currency: loan.currency,
          day: loan.payment_day,
          type: 'loan' as const,
          bank_name: loan.bank_name || undefined,
        })) || []),
      ];

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching payment events:', error);
      toast.error(t('calendar.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    if (event.type === 'fixed' && !showFixed) return false;
    if (event.type === 'card' && !showCards) return false;
    if (event.type === 'installment' && !showInstallments) return false;
    if (event.type === 'loan' && !showLoans) return false;
    return true;
  });

  const getEventsForDay = (day: number) => {
    return filteredEvents.filter(event => event.day === day);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'card':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'installment':
        return 'bg-accent/50 text-accent-foreground border-accent';
      case 'loan':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getFirstDayOfMonth = () => {
    const firstDay = startOfMonth(currentMonth);
    // getDay returns 0-6 (Sunday-Saturday), we need Monday as 0
    const day = getDay(firstDay);
    return day === 0 ? 6 : day - 1; // Convert Sunday (0) to 6, others shift by -1
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'fixed':
        return { label: t('calendar.fixed'), variant: 'default' as const };
      case 'card':
        return { label: t('calendar.card'), variant: 'destructive' as const };
      case 'installment':
        return { label: t('calendar.installment'), variant: 'secondary' as const };
      case 'loan':
        return { label: t('loans.loan'), variant: 'outline' as const };
      default:
        return { label: t('categories.other'), variant: 'outline' as const };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fixed':
        return Receipt;
      case 'card':
        return CreditCard;
      case 'installment':
        return ShoppingCart;
      case 'loan':
        return Landmark;
      default:
        return Receipt;
    }
  };

  const handleDayClick = (day: number) => {
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length > 0) {
      setSelectedDay(day);
      setIsModalOpen(true);
    }
  };

  const handleMarkAsPaid = async (event: PaymentEvent) => {
    setPayingId(event.id);

    // Demo mode handling
    if (isDemoMode) {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add to demo paid ids
      setDemoPaidIds(prev => new Set([...prev, event.id]));
      
      // Update event as paid
      setEvents(prev => prev.map(e => 
        e.id === event.id ? { ...e, isPaid: true } : e
      ));
      
      celebrate(event.title, event.amount, event.currency);
      
      if (event.type === 'fixed') {
        toast.success(t('fixedPayments.markedAsPaid'));
      } else if (event.type === 'installment') {
        toast.success(t('installments.paymentRecorded'));
      } else if (event.type === 'loan') {
        toast.success(t('loans.paymentRecorded'));
      }
      
      setPayingId(null);
      return;
    }

    if (!user) {
      setPayingId(null);
      return;
    }

    try {
      const today = new Date();
      const currentMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

      if (event.type === 'fixed') {
        // Insert payment record for fixed payment
        const { error } = await supabase
          .from('payment_records')
          .insert({
            user_id: user.id,
            fixed_payment_id: event.id,
            payment_month: currentMonthStart,
            amount: event.amount,
            paid_at: new Date().toISOString()
          });

        if (error) throw error;
        
        celebrate(event.title, event.amount, event.currency);
        toast.success(t('fixedPayments.markedAsPaid'));
        
      } else if (event.type === 'installment') {
        // Update installment paid_months
        const { data: installment, error: fetchError } = await supabase
          .from('installments')
          .select('paid_months, total_months')
          .eq('id', event.id)
          .single();

        if (fetchError) throw fetchError;

        const newPaidMonths = (installment?.paid_months || 0) + 1;
        const isCompleted = newPaidMonths >= (installment?.total_months || 0);

        const { error } = await supabase
          .from('installments')
          .update({ 
            paid_months: newPaidMonths,
            is_active: !isCompleted 
          })
          .eq('id', event.id);

        if (error) throw error;
        
        celebrate(event.title, event.amount, event.currency);
        toast.success(t('installments.paymentRecorded'));
        
      } else if (event.type === 'loan') {
        // Update loan paid_months and remaining_amount
        const { data: loan, error: fetchError } = await supabase
          .from('loans')
          .select('paid_months, total_months, monthly_payment, remaining_amount')
          .eq('id', event.id)
          .single();

        if (fetchError) throw fetchError;

        const newPaidMonths = (loan?.paid_months || 0) + 1;
        const newRemaining = Math.max(0, (Number(loan?.remaining_amount) || 0) - (Number(loan?.monthly_payment) || 0));
        const isCompleted = newPaidMonths >= (loan?.total_months || 0);

        const { error } = await supabase
          .from('loans')
          .update({ 
            paid_months: newPaidMonths,
            remaining_amount: newRemaining,
            is_active: !isCompleted 
          })
          .eq('id', event.id);

        if (error) throw error;
        
        celebrate(event.title, event.amount, event.currency);
        toast.success(t('loans.paymentRecorded'));
      }

      // Refresh data
      await fetchPaymentEvents();
      
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error(t('errors.saveFailed'));
    } finally {
      setPayingId(null);
    }
  };

  const sortedEvents = [...filteredEvents].sort((a, b) => a.day - b.day);
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const selectedDayTotal = selectedDayEvents.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return <Layout><div className="p-8">{t('common.loading')}</div></Layout>;
  }

  return (
    <Layout>
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-500/60 shadow-lg">
            <CalendarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('calendar.title')}</h1>
            <p className="text-muted-foreground">
              {formatMonthYear(currentMonth)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              {t('calendar.today')}
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {t('calendar.calendarView')}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            {t('calendar.listView')}
          </Button>
        </div>
      </div>

      {/* Filter toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">{t('calendar.filters')}:</span>
        <Button
          variant={showFixed ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFixed(!showFixed)}
          className={showFixed ? 'bg-primary/90' : ''}
        >
          <Receipt className="h-4 w-4 mr-2" />
          {t('calendar.fixedPayments')}
        </Button>
        <Button
          variant={showInstallments ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowInstallments(!showInstallments)}
          className={showInstallments ? 'bg-accent text-accent-foreground' : ''}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {t('calendar.installments')}
        </Button>
        <Button
          variant={showLoans ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowLoans(!showLoans)}
          className={showLoans ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
        >
          <Landmark className="h-4 w-4 mr-2" />
          {t('loans.title')}
        </Button>
        <Button
          variant={showCards ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowCards(!showCards)}
          className={showCards ? 'bg-destructive hover:bg-destructive/90' : ''}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {t('calendar.cardPayments')}
        </Button>
      </div>

      {viewMode === 'calendar' ? (
        <>
        {/* Desktop Calendar Grid */}
        <div className="hidden md:grid grid-cols-7 gap-4">
        {[t('calendar.monday'), t('calendar.tuesday'), t('calendar.wednesday'), t('calendar.thursday'), t('calendar.friday'), t('calendar.saturday'), t('calendar.sunday')].map((day) => (
          <div key={day} className="text-center font-semibold text-sm text-muted-foreground">
            {day}
          </div>
        ))}
        
        {/* Empty cells for days before month starts */}
        {Array.from({ length: getFirstDayOfMonth() }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[120px]" />
        ))}
        
        {/* Actual days of the month */}
        {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = new Date().getDate() === day && 
                         new Date().getMonth() === currentMonth.getMonth() &&
                         new Date().getFullYear() === currentMonth.getFullYear();
          
          return (
            <Card 
              key={day} 
              className={`min-h-[120px] ${isToday ? 'ring-2 ring-primary' : ''} ${dayEvents.length > 0 ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
              onClick={() => dayEvents.length > 0 && handleDayClick(day)}
            >
              <CardHeader className="p-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {dayEvents.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const isPaidEvent = event.isPaid || (event.type === 'fixed' && paidFixedPaymentIds.has(event.id)) || demoPaidIds.has(event.id);
                  return (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded border ${isPaidEvent ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 line-through opacity-60' : getTypeColor(event.type)}`}
                    >
                      <div className="font-medium truncate flex items-center gap-1">
                        {isPaidEvent && <Check className="h-3 w-3" />}
                        {event.title}
                      </div>
                      <div className="text-xs">
                        {formatCurrency(event.amount)}
                      </div>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} {t('calendar.more')}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        </div>

        {/* Mobile Calendar Grid - Compact */}
        <div className="md:hidden grid grid-cols-7 gap-1">
        {[t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat'), t('calendar.sun')].map((day) => (
          <div key={day} className="text-center font-medium text-xs text-muted-foreground py-1">
            {day}
          </div>
        ))}
        
        {/* Empty cells for days before month starts */}
        {Array.from({ length: getFirstDayOfMonth() }).map((_, i) => (
          <div key={`empty-mobile-${i}`} className="aspect-square" />
        ))}
        
        {/* Actual days of the month - Mobile */}
        {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = new Date().getDate() === day && 
                         new Date().getMonth() === currentMonth.getMonth() &&
                         new Date().getFullYear() === currentMonth.getFullYear();
          
          return (
            <div 
              key={day} 
              className={`aspect-square p-1 rounded-lg border ${isToday ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'} ${dayEvents.length > 0 ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
              onClick={() => dayEvents.length > 0 && handleDayClick(day)}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold bg-secondary text-secondary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                {dayEvents.length > 0 && (
                  <div className="flex-1 flex flex-wrap gap-0.5 mt-0.5 overflow-hidden">
                    {dayEvents.slice(0, 4).map((event) => {
                      const isPaidEvent = event.isPaid || (event.type === 'fixed' && paidFixedPaymentIds.has(event.id)) || demoPaidIds.has(event.id);
                      const dotColor = isPaidEvent 
                        ? 'bg-emerald-500' 
                        : event.type === 'fixed' 
                          ? 'bg-primary' 
                          : event.type === 'card' 
                            ? 'bg-destructive' 
                            : event.type === 'loan' 
                              ? 'bg-orange-500' 
                              : 'bg-accent';
                      return (
                        <div
                          key={event.id}
                          className={`w-2 h-2 rounded-full ${dotColor}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
        </>
      ) : (
        <div className="space-y-4">
          {sortedEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t('calendar.noPayments')}
              </CardContent>
            </Card>
          ) : (
            sortedEvents.map((event) => {
              const badge = getTypeBadge(event.type);
              const isPaidEvent = event.isPaid || (event.type === 'fixed' && paidFixedPaymentIds.has(event.id)) || demoPaidIds.has(event.id);
              const canMarkAsPaid = (event.type === 'fixed' || event.type === 'installment' || event.type === 'loan') && !isPaidEvent;
              const isLoading = payingId === event.id;
              
              return (
                <Card key={event.id} className={isPaidEvent ? 'opacity-60 border-emerald-500/30' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className={`text-lg flex items-center gap-2 ${isPaidEvent ? 'line-through' : ''}`}>
                          {isPaidEvent && <Check className="h-5 w-5 text-emerald-500" />}
                          {event.title}
                        </CardTitle>
                        {event.bank_name && (
                          <CardDescription>{event.bank_name}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isPaidEvent && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            {t('fixedPayments.paid')}
                          </Badge>
                        )}
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {formatDayMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), event.day))}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${isPaidEvent ? 'text-muted-foreground' : ''}`}>
                          {formatCurrency(event.amount)}
                        </div>
                        {canMarkAsPaid && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPaid(event)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                {t('fixedPayments.markAsPaid')}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('calendar.fixedPayments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.type === 'fixed').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('calendar.cardPayments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.type === 'card').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('calendar.installments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.type === 'installment').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('loans.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.type === 'loan').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedDay && formatDayMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay))}
            </DialogTitle>
            <DialogDescription>
              {selectedDayEvents.length} {t('calendar.scheduledPayments')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Total Amount */}
            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t('calendar.totalAmount')}</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedDayTotal)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment List */}
            <div className="space-y-3">
              {selectedDayEvents.map((event) => {
                const badge = getTypeBadge(event.type);
                const IconComponent = getTypeIcon(event.type);
                const canMarkAsPaid = event.type === 'fixed' || event.type === 'installment' || event.type === 'loan';
                const isPaid = event.isPaid || (event.type === 'fixed' && paidFixedPaymentIds.has(event.id)) || demoPaidIds.has(event.id);
                const isLoading = payingId === event.id;
                
                return (
                  <Card key={event.id} className={`overflow-hidden ${isPaid ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${getTypeColor(event.type)}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-semibold flex items-center gap-2">
                                {event.title}
                                {isPaid && <Check className="h-4 w-4 text-emerald-500" />}
                              </h4>
                              {event.bank_name && (
                                <p className="text-sm text-muted-foreground">{event.bank_name}</p>
                              )}
                            </div>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t('calendar.amount')}</span>
                            <span className="text-lg font-bold">
                              {formatCurrency(event.amount)}
                            </span>
                          </div>
                          {canMarkAsPaid && !isPaid && (
                            <Button
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => handleMarkAsPaid(event)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  {t('common.loading')}
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  {t('fixedPayments.markAsPaid')}
                                </>
                              )}
                            </Button>
                          )}
                          {isPaid && (
                            <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm mt-2">
                              <Check className="h-4 w-4" />
                              {t('fixedPayments.paid')}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </Layout>
  );
};

export default Calendar;
