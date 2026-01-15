import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, Loader2, Clock, CalendarDays, Globe, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type EmailFrequency = 'none' | 'daily' | 'weekly' | 'monthly';
type EmailLanguage = 'tr' | 'en' | 'de';

interface EmailPreference {
  id: string;
  frequency: EmailFrequency;
  email: string;
  is_active: boolean;
  preferred_hour: number;
  preferred_minute?: number;
  preferred_day?: number;
  timezone?: string;
  language?: EmailLanguage;
}

const LANGUAGES = [
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

// Timezone definitions with UTC offsets
const TIMEZONES = [
  { value: 'Europe/Istanbul', label: 'timezoneIstanbul', offset: 3 },
  { value: 'Europe/London', label: 'timezoneLondon', offset: 0 },
  { value: 'Europe/Berlin', label: 'timezoneBerlin', offset: 1 },
  { value: 'America/New_York', label: 'timezoneNewYork', offset: -5 },
  { value: 'America/Los_Angeles', label: 'timezoneLosAngeles', offset: -8 },
];

// Convert local time to UTC based on timezone offset
const localToUtc = (hour: number, timezoneOffset: number): number => {
  let utcHour = hour - timezoneOffset;
  if (utcHour < 0) utcHour += 24;
  if (utcHour >= 24) utcHour -= 24;
  return utcHour;
};

// Convert UTC time to local time based on timezone offset
const utcToLocal = (utcHour: number, timezoneOffset: number): number => {
  let localHour = utcHour + timezoneOffset;
  if (localHour < 0) localHour += 24;
  if (localHour >= 24) localHour -= 24;
  return localHour;
};

export function EmailPreferencesWidget() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [preferences, setPreferences] = useState<EmailPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<EmailFrequency>("none");
  const [isActive, setIsActive] = useState(true);
  const [preferredHour, setPreferredHour] = useState(9); // Local time
  const [preferredMinute, setPreferredMinute] = useState(0);
  const [preferredDay, setPreferredDay] = useState(1);
  const [timezone, setTimezone] = useState('Europe/Istanbul');
  const [language, setLanguage] = useState<EmailLanguage>('tr');

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const getTimezoneOffset = (tz: string): number => {
    return TIMEZONES.find(t => t.value === tz)?.offset ?? 3;
  };

  const fetchPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data) {
        const typedData = data as EmailPreference;
        const savedTimezone = (data as any).timezone || 'Europe/Istanbul';
        const savedLanguage = (data as any).language || 'tr';
        const offset = getTimezoneOffset(savedTimezone);
        
        setPreferences(typedData);
        setEmail(typedData.email);
        setFrequency(typedData.frequency);
        setIsActive(typedData.is_active);
        setTimezone(savedTimezone);
        setLanguage(savedLanguage as EmailLanguage);
        // Convert UTC hour from DB to local time
        setPreferredHour(utcToLocal(typedData.preferred_hour ?? 9, offset));
        setPreferredMinute(typedData.preferred_minute ?? 0);
        setPreferredDay(typedData.preferred_day ?? 1);
      } else {
        setEmail(user.email || "");
        // Set language based on current i18n language
        const currentLang = i18n.language as EmailLanguage;
        if (['tr', 'en', 'de'].includes(currentLang)) {
          setLanguage(currentLang);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user || !email) return;
    
    setSaving(true);
    try {
      const offset = getTimezoneOffset(timezone);
      // Convert local time to UTC for storage
      const utcHour = localToUtc(preferredHour, offset);
      
      const prefData = {
        user_id: user.id,
        email,
        frequency,
        is_active: isActive,
        preferred_hour: utcHour, // Store as UTC
        preferred_minute: preferredMinute,
        preferred_day: preferredDay,
        timezone: timezone,
        language: language
      };

      if (preferences) {
        const { error } = await supabase
          .from('email_preferences')
          .update(prefData)
          .eq('id', preferences.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('email_preferences')
          .insert(prefData)
          .select()
          .single();

        if (error) throw error;
        setPreferences(data as EmailPreference);
      }

      toast.success(t('emailPrefs.saved'));
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(t('emailPrefs.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const sendTestReport = async () => {
    if (!user) return;
    
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: { userId: user.id, frequency: 'manual' }
      });

      if (error) throw error;

      toast.success(t('emailPrefs.sent'));
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error(t('emailPrefs.sendError'));
    } finally {
      setSending(false);
    }
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0')
  }));

  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0')
  }));

  const weekDays = [
    { value: 1, label: t('emailPrefs.monday') },
    { value: 2, label: t('emailPrefs.tuesday') },
    { value: 3, label: t('emailPrefs.wednesday') },
    { value: 4, label: t('emailPrefs.thursday') },
    { value: 5, label: t('emailPrefs.friday') },
    { value: 6, label: t('emailPrefs.saturday') },
    { value: 0, label: t('emailPrefs.sunday') },
  ];

  const monthDays = Array.from({ length: 28 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}`
  }));

  const getTimezoneLabel = () => {
    const tz = TIMEZONES.find(t => t.value === timezone);
    return tz ? t(`emailPrefs.${tz.label}`) : timezone;
  };

  const getScheduleDescription = () => {
    if (frequency === 'none') return null;
    
    const timeStr = `${preferredHour.toString().padStart(2, '0')}:${preferredMinute.toString().padStart(2, '0')}`;
    const tzLabel = getTimezoneLabel();
    
    if (frequency === 'daily') {
      return t('emailPrefs.scheduleDaily', { time: timeStr, timezone: tzLabel });
    }
    if (frequency === 'weekly') {
      const dayName = weekDays.find(d => d.value === preferredDay)?.label || '';
      return t('emailPrefs.scheduleWeekly', { day: dayName, time: timeStr, timezone: tzLabel });
    }
    if (frequency === 'monthly') {
      return t('emailPrefs.scheduleMonthly', { day: preferredDay, time: timeStr, timezone: tzLabel });
    }
    return null;
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-lg">{t('emailPrefs.title')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('emailPrefs.email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">{t('emailPrefs.frequency')}</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as EmailFrequency)}>
            <SelectTrigger id="frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('emailPrefs.none')}</SelectItem>
              <SelectItem value="daily">{t('emailPrefs.daily')}</SelectItem>
              <SelectItem value="weekly">{t('emailPrefs.weekly')}</SelectItem>
              <SelectItem value="monthly">{t('emailPrefs.monthly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {frequency !== 'none' && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              {t('emailPrefs.scheduleSettings')}
            </div>

            {/* Language selector */}
            <div className="space-y-2">
              <Label htmlFor="language" className="text-xs flex items-center gap-1">
                <Languages className="h-3 w-3" />
                {t('emailPrefs.reportLanguage')}
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as EmailLanguage)}>
                <SelectTrigger id="language" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.flag} {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timezone selector */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-xs flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {t('emailPrefs.timezone')}
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {t(`emailPrefs.${tz.label}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Time selector - hour and minute */}
              <div className="space-y-2">
                <Label htmlFor="hour" className="text-xs">{t('emailPrefs.sendTime')}</Label>
                <div className="flex items-center gap-1">
                  <Select value={preferredHour.toString()} onValueChange={(v) => setPreferredHour(parseInt(v))}>
                    <SelectTrigger id="hour" className="h-9 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {hourOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground font-medium">:</span>
                  <Select value={preferredMinute.toString()} onValueChange={(v) => setPreferredMinute(parseInt(v))}>
                    <SelectTrigger className="h-9 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {minuteOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Day selector - shown for weekly */}
              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="weekday" className="text-xs flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {t('emailPrefs.sendDay')}
                  </Label>
                  <Select value={preferredDay.toString()} onValueChange={(v) => setPreferredDay(parseInt(v))}>
                    <SelectTrigger id="weekday" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Day of month selector - shown for monthly */}
              {frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="monthday" className="text-xs flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {t('emailPrefs.sendDayOfMonth')}
                  </Label>
                  <Select value={preferredDay.toString()} onValueChange={(v) => setPreferredDay(parseInt(v))}>
                    <SelectTrigger id="monthday" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {monthDays.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}. {t('emailPrefs.dayOfMonth')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Schedule description */}
            {getScheduleDescription() && (
              <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded border">
                📅 {getScheduleDescription()}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="active">{t('emailPrefs.active')}</Label>
          <Switch
            id="active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={savePreferences} 
            disabled={saving || !email}
            className="flex-1"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {t('common.save')}
          </Button>
          
          <Button
            variant="outline"
            onClick={sendTestReport}
            disabled={sending || !preferences}
            title={t('emailPrefs.sendNow')}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
