import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  checkPushSupport,
  requestPushPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/lib/pushNotifications";

interface PushPreferences {
  enabled: boolean;
  payment_reminders: boolean;
  budget_alerts: boolean;
  achievement_alerts: boolean;
}

export function PushNotificationsWidget() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<PushPreferences>({
    enabled: false,
    payment_reminders: true,
    budget_alerts: true,
    achievement_alerts: true,
  });
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);

  useEffect(() => {
    checkSupport();
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const checkSupport = async () => {
    const { supported } = await checkPushSupport();
    setPushSupported(supported);
  };

  const fetchPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('push_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          enabled: data.enabled || false,
          payment_reminders: data.payment_reminders ?? true,
          budget_alerts: data.budget_alerts ?? true,
          achievement_alerts: data.achievement_alerts ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching push preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const enablePushNotifications = async () => {
    if (!user) return;

    setEnabling(true);
    try {
      // Check permission
      const permission = await requestPushPermission();
      
      if (permission !== 'granted') {
        toast.error(t('notifications.permissionDenied'));
        return;
      }

      // Subscribe to push notifications
      await subscribeToPushNotifications(user.id);

      // Update preferences
      const { error } = await supabase
        .from('push_notification_preferences')
        .upsert({
          user_id: user.id,
          enabled: true,
          payment_reminders: preferences.payment_reminders,
          budget_alerts: preferences.budget_alerts,
          achievement_alerts: preferences.achievement_alerts,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, enabled: true }));
      toast.success(t('notifications.enabled'));
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setEnabling(false);
    }
  };

  const disablePushNotifications = async () => {
    if (!user) return;

    try {
      await unsubscribeFromPushNotifications(user.id);
      setPreferences(prev => ({ ...prev, enabled: false }));
      toast.success(t('notifications.disabled'));
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      toast.error('Failed to disable notifications');
    }
  };

  const sendTestNotification = async () => {
    if (!user) return;

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: 'Test Bildirimi 🔔',
          message: 'Push bildirimleri başarıyla çalışıyor!',
          url: '/dashboard',
          tag: 'test',
          priority: 'medium'
        }
      });

      if (error) throw error;

      if (data?.sent > 0) {
        toast.success('Test bildirimi gönderildi!');
      } else {
        toast.info('Bildirim gönderilemedi - subscription bulunamadı');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Test bildirimi gönderilemedi');
    } finally {
      setTesting(false);
    }
  };

  const updatePreference = async (key: keyof PushPreferences, value: boolean) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from('push_notification_preferences')
        .upsert({
          user_id: user.id,
          enabled: newPreferences.enabled,
          payment_reminders: newPreferences.payment_reminders,
          budget_alerts: newPreferences.budget_alerts,
          achievement_alerts: newPreferences.achievement_alerts,
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference:', error);
      setPreferences(prev => ({ ...prev, [key]: !value })); // Revert
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pushSupported) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-muted">
              <BellOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">{t('notifications.pushTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('notifications.notSupported')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
            {preferences.enabled ? (
              <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            ) : (
              <BellOff className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            )}
          </div>
          <CardTitle className="text-lg">{t('notifications.pushTitle')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preferences.enabled ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('notifications.pushDescription')}
            </p>
            <Button onClick={enablePushNotifications} disabled={enabling}>
              {enabling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              {t('notifications.enablePush')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="payment-reminders" className="text-sm">
                {t('notifications.paymentReminders')}
              </Label>
              <Switch
                id="payment-reminders"
                checked={preferences.payment_reminders}
                onCheckedChange={(v) => updatePreference('payment_reminders', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="budget-alerts" className="text-sm">
                {t('notifications.budgetAlerts')}
              </Label>
              <Switch
                id="budget-alerts"
                checked={preferences.budget_alerts}
                onCheckedChange={(v) => updatePreference('budget_alerts', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="achievement-alerts" className="text-sm">
                {t('notifications.achievementAlerts')}
              </Label>
              <Switch
                id="achievement-alerts"
                checked={preferences.achievement_alerts}
                onCheckedChange={(v) => updatePreference('achievement_alerts', v)}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={sendTestNotification}
                disabled={testing}
                className="flex-1"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {t('notifications.sendTest')}
              </Button>
            </div>

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={disablePushNotifications}
            >
              <BellOff className="h-4 w-4 mr-2" />
              {t('notifications.disablePush')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
