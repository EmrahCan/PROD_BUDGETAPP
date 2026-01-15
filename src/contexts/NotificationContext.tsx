import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  related_id: string | null;
  related_entity_id: string | null;
  related_entity_type: string | null;
  priority: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.length || 0);
  };

  // Check and create notifications for upcoming payments
  const checkAndCreatePaymentNotifications = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    const currentDay = today.getDate();
    
    // Use month start for duplicate check to avoid re-creating within the same month
    const currentMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    try {
      // Fetch this month's existing notifications to avoid duplicates within the same month
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('related_entity_id, notification_type')
        .eq('user_id', user.id)
        .gte('created_at', currentMonthStart);

      const existingSet = new Set(
        (existingNotifications || []).map(n => `${n.notification_type}-${n.related_entity_id}`)
      );

      // Check fixed payments
      const { data: fixedPayments } = await supabase
        .from('fixed_payments')
        .select('id, name, amount, payment_day, currency')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Check payment records for this month
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const { data: paidRecords, error: paidRecordsError } = await supabase
        .from('payment_records')
        .select('fixed_payment_id')
        .eq('user_id', user.id)
        .eq('payment_month', currentMonth);

      if (paidRecordsError) {
        console.error('Error fetching payment records:', paidRecordsError);
        return;
      }

      const paidIds = (paidRecords || [])
        .map(r => r.fixed_payment_id)
        .filter(Boolean) as string[];

      const paidSet = new Set(paidIds);

      // If a fixed payment is marked paid, make sure its reminders/overdue notifications don't show up again.
      if (paidIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('related_entity_type', 'fixed_payment')
          .in('related_entity_id', paidIds)
          .in('notification_type', ['payment_reminder', 'payment_overdue'])
          .eq('is_read', false);
      }

      const notificationsToCreate: any[] = [];

      // Fixed payment notifications
      (fixedPayments || []).forEach(fp => {
        // Skip if already paid this month
        if (paidSet.has(fp.id)) return;

        const reminderKey = `payment_reminder-${fp.id}`;
        const overdueKey = `payment_overdue-${fp.id}`;
        if (existingSet.has(reminderKey)) return;

        // Payment is today
        if (fp.payment_day === currentDay) {
          notificationsToCreate.push({
            user_id: user.id,
            title: `Bugün Ödeme Günü: ${fp.name}`,
            message: `${fp.name} ödemesi bugün yapılmalı. Tutar: ${fp.amount.toLocaleString('tr-TR')} ${fp.currency}`,
            notification_type: 'payment_reminder',
            priority: 'high',
            related_entity_type: 'fixed_payment',
            related_entity_id: fp.id,
            action_url: '/fixed-payments'
          });
        }
        // Payment is tomorrow
        else if (fp.payment_day === currentDay + 1) {
          notificationsToCreate.push({
            user_id: user.id,
            title: `Yarın Ödeme Günü: ${fp.name}`,
            message: `${fp.name} ödemesi yarın. Tutar: ${fp.amount.toLocaleString('tr-TR')} ${fp.currency}`,
            notification_type: 'payment_reminder',
            priority: 'medium',
            related_entity_type: 'fixed_payment',
            related_entity_id: fp.id,
            action_url: '/fixed-payments'
          });
        }
        // Payment is overdue
        else if (fp.payment_day < currentDay) {
          // Already checked paidSet above, so we know this is unpaid
          if (!existingSet.has(overdueKey)) {
            notificationsToCreate.push({
              user_id: user.id,
              title: `Gecikmiş Ödeme: ${fp.name}`,
              message: `${fp.name} ödemesi ${currentDay - fp.payment_day} gün gecikti. Tutar: ${fp.amount.toLocaleString('tr-TR')} ${fp.currency}`,
              notification_type: 'payment_overdue',
              priority: 'high',
              related_entity_type: 'fixed_payment',
              related_entity_id: fp.id,
              action_url: '/fixed-payments'
            });
          }
        }
      });

      // Check credit cards - skip if balance is 0 (already paid)
      const { data: cards } = await supabase
        .from('credit_cards')
        .select('id, name, balance, minimum_payment, due_date, currency')
        .eq('user_id', user.id);

      (cards || []).forEach(card => {
        const minimumPayment = Number((card as any).minimum_payment) || 0;

        // Skip if minimum payment is 0 (paid) - also clean up any existing notifications
        if (minimumPayment <= 0) {
          // Mark existing notifications for this card as read (asynchronously)
          supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('related_entity_id', card.id)
            .eq('related_entity_type', 'credit_card')
            .eq('is_read', false)
            .then(() => {});
          return;
        }

        const cardKey = `card_payment_reminder-${card.id}`;
        if (existingSet.has(cardKey)) return;

        // Card payment is today
        if (card.due_date === currentDay) {
          notificationsToCreate.push({
            user_id: user.id,
            title: `Kart Ödeme Günü: ${card.name}`,
            message: `${card.name} kartı son ödeme günü bugün. Asgari ödeme: ${minimumPayment.toLocaleString('tr-TR')} ${card.currency}`,
            notification_type: 'card_payment_reminder',
            priority: 'high',
            related_entity_type: 'credit_card',
            related_entity_id: card.id,
            action_url: '/cards'
          });
        }
        // Card payment is in 3 days
        else if (card.due_date === currentDay + 3) {
          notificationsToCreate.push({
            user_id: user.id,
            title: `Kart Ödeme Yaklaşıyor: ${card.name}`,
            message: `${card.name} kartı son ödeme tarihi 3 gün sonra. Asgari ödeme: ${minimumPayment.toLocaleString('tr-TR')} ${card.currency}`,
            notification_type: 'card_payment_reminder',
            priority: 'medium',
            related_entity_type: 'credit_card',
            related_entity_id: card.id,
            action_url: '/cards'
          });
        }
        // Card payment is overdue
        else if (card.due_date < currentDay) {
          const overdueCardKey = `card_payment_overdue-${card.id}`;
          if (!existingSet.has(overdueCardKey)) {
            notificationsToCreate.push({
              user_id: user.id,
              title: `Gecikmiş Kart Ödemesi: ${card.name}`,
              message: `${card.name} kartı ödemesi ${currentDay - card.due_date} gün gecikti. Asgari ödeme: ${minimumPayment.toLocaleString('tr-TR')} ${card.currency}`,
              notification_type: 'card_payment_overdue',
              priority: 'high',
              related_entity_type: 'credit_card',
              related_entity_id: card.id,
              action_url: '/cards'
            });
          }
        }
      });

      // Check installments
      const { data: installments } = await supabase
        .from('installments')
        .select('id, name, monthly_amount, currency, start_date, paid_months, total_months')
        .eq('user_id', user.id)
        .eq('is_active', true);

      (installments || []).forEach(inst => {
        const startDate = new Date(inst.start_date);
        const nextPaymentDate = new Date(startDate);
        nextPaymentDate.setMonth(startDate.getMonth() + inst.paid_months);
        
        const daysUntil = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const instKey = `installment_reminder-${inst.id}`;
        if (existingSet.has(instKey)) return;

        // Installment is due today
        if (daysUntil === 0) {
          notificationsToCreate.push({
            user_id: user.id,
            title: `Taksit Ödeme Günü: ${inst.name}`,
            message: `${inst.name} taksiti bugün ödenmeli. Tutar: ${inst.monthly_amount.toLocaleString('tr-TR')} ${inst.currency}. Kalan: ${inst.total_months - inst.paid_months} taksit`,
            notification_type: 'installment_reminder',
            priority: 'high',
            related_entity_type: 'installment',
            related_entity_id: inst.id,
            action_url: '/installments'
          });
        }
        // Installment is in 3 days
        else if (daysUntil === 3) {
          notificationsToCreate.push({
            user_id: user.id,
            title: `Taksit Yaklaşıyor: ${inst.name}`,
            message: `${inst.name} taksiti 3 gün sonra. Tutar: ${inst.monthly_amount.toLocaleString('tr-TR')} ${inst.currency}`,
            notification_type: 'installment_reminder',
            priority: 'medium',
            related_entity_type: 'installment',
            related_entity_id: inst.id,
            action_url: '/installments'
          });
        }
        // Installment is overdue
        else if (daysUntil < 0) {
          const overdueInstKey = `installment_overdue-${inst.id}`;
          if (!existingSet.has(overdueInstKey)) {
            notificationsToCreate.push({
              user_id: user.id,
              title: `Gecikmiş Taksit: ${inst.name}`,
              message: `${inst.name} taksiti ${Math.abs(daysUntil)} gün gecikti. Tutar: ${inst.monthly_amount.toLocaleString('tr-TR')} ${inst.currency}`,
              notification_type: 'installment_overdue',
              priority: 'high',
              related_entity_type: 'installment',
              related_entity_id: inst.id,
              action_url: '/installments'
            });
          }
        }
      });

      // Insert all notifications
      if (notificationsToCreate.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notificationsToCreate);

        if (error) {
          console.error('Error creating notifications:', error);
        } else {
          // Refresh notifications after creating new ones
          await fetchNotifications();
        }
      }
    } catch (error) {
      console.error('Error checking payment notifications:', error);
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      await fetchNotifications();
    }
  };

  const dismissNotification = async (id: string) => {
    // "X" = gizle: silmek yerine okundu yapıyoruz.
    // Böylece ödeme hatırlatıcıları aynı ay içinde tekrar üretilmez.
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      await fetchNotifications();
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    
    // Check for payment notifications on load and periodically
    checkAndCreatePaymentNotifications();
    
    // Check every hour for new notifications
    const interval = setInterval(checkAndCreatePaymentNotifications, 60 * 60 * 1000);

    // Set up realtime subscription
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Show toast for new notification
          toast.info(newNotification.title, {
            description: newNotification.message,
            action: newNotification.action_url ? {
              label: 'Görüntüle',
              onClick: () => window.location.href = newNotification.action_url!
            } : undefined
          });
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, checkAndCreatePaymentNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        dismissNotification,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};