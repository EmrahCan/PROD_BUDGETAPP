import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Lock, 
  Mail, 
  Save, 
  Loader2, 
  Clock, 
  CalendarDays,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  Bell,
  BellOff,
  Globe,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";
import { toast } from "sonner";
import { BadgesWidget } from "@/components/dashboard/BadgesWidget";

type EmailFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

interface EmailPreference {
  id: string;
  frequency: EmailFrequency;
  email: string;
  is_active: boolean;
  preferred_hour: number;
  preferred_minute?: number;
  preferred_day?: number;
  timezone?: string;
}

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

const getTimezoneOffset = (tz: string): number => {
  return TIMEZONES.find(t => t.value === tz)?.offset ?? 3;
};

interface PushPreferences {
  enabled: boolean;
  payment_reminders: boolean;
  budget_alerts: boolean;
  achievement_alerts: boolean;
}

const Settings = () => {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  
  // Profile state
  const [fullName, setFullName] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  
  // Email preferences state
  const [preferences, setPreferences] = useState<EmailPreference | null>(null);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<EmailFrequency>("none");
  const [isActive, setIsActive] = useState(true);
  const [preferredHour, setPreferredHour] = useState(9);
  const [preferredMinute, setPreferredMinute] = useState(0);
  const [preferredDay, setPreferredDay] = useState(1);
  const [timezone, setTimezone] = useState('Europe/Istanbul');

  // Push notification state
  const [pushPreferences, setPushPreferences] = useState<PushPreferences>({
    enabled: false,
    payment_reminders: true,
    budget_alerts: true,
    achievement_alerts: true,
  });
  const [pushLoading, setPushLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);

  // Support form state
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
  });

  useEffect(() => {
    if (isDemoMode) {
      loadDemoSettings();
    } else if (user) {
      fetchProfile();
      fetchEmailPreferences();
      fetchPushPreferences();
    }
  }, [user, isDemoMode]);

  const loadDemoSettings = () => {
    // Profile
    setFullName(demoData.profile.full_name);
    setProfileLoading(false);

    // Email preferences
    const ep = demoData.email_preferences;
    setPreferences(ep as EmailPreference);
    setEmail(ep.email);
    setFrequency(ep.frequency as EmailFrequency);
    setIsActive(ep.is_active);
    setPreferredHour(ep.preferred_hour);
    setPreferredMinute(ep.preferred_minute);
    setPreferredDay(ep.preferred_day);
    setEmailLoading(false);

    // Push preferences
    const pp = demoData.push_preferences;
    setPushPreferences({
      enabled: pp.enabled,
      payment_reminders: pp.payment_reminders,
      budget_alerts: pp.budget_alerts,
      achievement_alerts: pp.achievement_alerts,
    });
    setPushLoading(false);
  };

  const fetchProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setFullName(data.full_name || "");
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success(t('settings.profileSaved'));
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('settings.profileSaveError'));
    } finally {
      setProfileSaving(false);
    }
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('settings.passwordTooShort'));
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success(t('settings.passwordUpdated'));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || t('settings.passwordUpdateError'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const fetchEmailPreferences = async () => {
    if (!user) return;
    setEmailLoading(true);
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
        const offset = getTimezoneOffset(savedTimezone);
        
        setPreferences(typedData);
        setEmail(typedData.email);
        setFrequency(typedData.frequency);
        setIsActive(typedData.is_active);
        setTimezone(savedTimezone);
        // Convert UTC hour from DB to local time
        setPreferredHour(utcToLocal(typedData.preferred_hour ?? 9, offset));
        setPreferredMinute(typedData.preferred_minute ?? 0);
        setPreferredDay(typedData.preferred_day ?? 1);
      } else {
        setEmail(user.email || "");
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setEmailLoading(false);
    }
  };

  const saveEmailPreferences = async () => {
    if (!user || !email) return;
    setEmailSaving(true);
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
        timezone: timezone
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
      setEmailSaving(false);
    }
  };

  const sendTestReport = async () => {
    if (!user) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-report-email', {
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

  const fetchPushPreferences = async () => {
    if (!user) return;
    setPushLoading(true);
    try {
      const { data, error } = await supabase
        .from('push_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPushPreferences({
          enabled: data.enabled || false,
          payment_reminders: data.payment_reminders ?? true,
          budget_alerts: data.budget_alerts ?? true,
          achievement_alerts: data.achievement_alerts ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching push preferences:', error);
    } finally {
      setPushLoading(false);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error(t('notifications.notSupported'));
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const enablePushNotifications = async () => {
    if (!user) return;
    setEnabling(true);
    try {
      const granted = await requestPermission();
      if (!granted) {
        toast.error(t('notifications.permissionDenied'));
        return;
      }

      const { error } = await supabase
        .from('push_notification_preferences')
        .upsert({
          user_id: user.id,
          enabled: true,
          payment_reminders: pushPreferences.payment_reminders,
          budget_alerts: pushPreferences.budget_alerts,
          achievement_alerts: pushPreferences.achievement_alerts,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      setPushPreferences(prev => ({ ...prev, enabled: true }));
      toast.success(t('notifications.enabled'));
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      toast.error(t('notifications.enableError'));
    } finally {
      setEnabling(false);
    }
  };

  const updatePushPreference = async (key: keyof PushPreferences, value: boolean) => {
    if (!user) return;

    const newPreferences = { ...pushPreferences, [key]: value };
    setPushPreferences(newPreferences);

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
      setPushPreferences(prev => ({ ...prev, [key]: !value }));
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

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      toast.error(t("support.requiredFields"));
      return;
    }

    setSupportSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("support-request", {
        body: {
          email: user?.email,
          subject: supportForm.subject,
          message: supportForm.message,
        },
      });

      if (error) throw error;

      toast.success(t("support.success"));
      setSupportForm({ subject: "", message: "" });
    } catch (error) {
      console.error("Support request error:", error);
      toast.error(t("support.error"));
    } finally {
      setSupportSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.description')}</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.security')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.notifications')}</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.support')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('settings.profileInfo')}
                </CardTitle>
                <CardDescription>{t('settings.profileDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('settings.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">{t('settings.emailNote')}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t('settings.fullName')}</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('settings.fullNamePlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {t('settings.language')}
                      </Label>
                      <Select 
                        value={i18n.language} 
                        onValueChange={async (lang) => {
                          i18n.changeLanguage(lang);
                          localStorage.setItem('language', lang);
                          
                          // Update email_preferences language in database
                          if (user && !isDemoMode) {
                            try {
                              const { error } = await supabase
                                .from('email_preferences')
                                .upsert({
                                  user_id: user.id,
                                  email: user.email || '',
                                  language: lang
                                }, { onConflict: 'user_id' });
                              
                              if (error) throw error;
                              toast.success(t('settings.languageSaved'));
                            } catch (error) {
                              console.error('Error saving language:', error);
                            }
                          }
                        }}
                      >
                        <SelectTrigger id="language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tr">
                            <span className="flex items-center gap-2">🇹🇷 Türkçe</span>
                          </SelectItem>
                          <SelectItem value="en">
                            <span className="flex items-center gap-2">🇬🇧 English</span>
                          </SelectItem>
                          <SelectItem value="de">
                            <span className="flex items-center gap-2">🇩🇪 Deutsch</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{t('settings.languageNote')}</p>
                    </div>

                    <Button onClick={saveProfile} disabled={profileSaving} className="gap-2">
                      {profileSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t('common.save')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Badges Section */}
            <BadgesWidget />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  {t('settings.changePassword')}
                </CardTitle>
                <CardDescription>{t('settings.passwordDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('settings.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  {newPassword && confirmPassword && newPassword === confirmPassword && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('settings.passwordMatch')}
                    </p>
                  )}
                </div>

                <Button 
                  onClick={updatePassword} 
                  disabled={passwordSaving || !newPassword || newPassword !== confirmPassword}
                  className="gap-2"
                >
                  {passwordSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {t('settings.updatePassword')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {t('emailPrefs.title')}
                </CardTitle>
                <CardDescription>{t('settings.emailPrefsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {emailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="reportEmail">{t('emailPrefs.email')}</Label>
                      <Input
                        id="reportEmail"
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

                    <Separator />

                    <div className="flex gap-2">
                      <Button onClick={saveEmailPreferences} disabled={emailSaving || !email} className="flex-1 gap-2">
                        {emailSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {t('common.save')}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={sendTestReport}
                        disabled={sending || !preferences}
                        title={t('emailPrefs.sendNow')}
                        className="gap-2"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {t('emailPrefs.sendNow')}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Push Notifications Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {pushPreferences.enabled ? (
                    <Bell className="h-5 w-5" />
                  ) : (
                    <BellOff className="h-5 w-5" />
                  )}
                  {t('notifications.pushTitle')}
                </CardTitle>
                <CardDescription>{t('notifications.pushDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pushLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !pushPreferences.enabled ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('notifications.pushEnabled')}
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
                      <Label htmlFor="push-payment-reminders" className="text-sm">
                        {t('notifications.paymentReminders')}
                      </Label>
                      <Switch
                        id="push-payment-reminders"
                        checked={pushPreferences.payment_reminders}
                        onCheckedChange={(v) => updatePushPreference('payment_reminders', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-budget-alerts" className="text-sm">
                        {t('notifications.budgetAlerts')}
                      </Label>
                      <Switch
                        id="push-budget-alerts"
                        checked={pushPreferences.budget_alerts}
                        onCheckedChange={(v) => updatePushPreference('budget_alerts', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-achievement-alerts" className="text-sm">
                        {t('notifications.achievementAlerts')}
                      </Label>
                      <Switch
                        id="push-achievement-alerts"
                        checked={pushPreferences.achievement_alerts}
                        onCheckedChange={(v) => updatePushPreference('achievement_alerts', v)}
                      />
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => updatePushPreference('enabled', false)}
                    >
                      <BellOff className="h-4 w-4 mr-2" />
                      {t('notifications.disablePush')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t("support.formTitle")}
                </CardTitle>
                <CardDescription>
                  {t("support.formDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSupportSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="support-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t("support.email")}
                    </Label>
                    <Input
                      id="support-email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("support.emailNote")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="support-subject">{t("support.subject")}</Label>
                    <Input
                      id="support-subject"
                      value={supportForm.subject}
                      onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                      placeholder={t("support.subjectPlaceholder")}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="support-message">{t("support.message")}</Label>
                    <Textarea
                      id="support-message"
                      value={supportForm.message}
                      onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                      placeholder={t("support.messagePlaceholder")}
                      rows={6}
                      maxLength={2000}
                      required
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {supportForm.message.length}/2000
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={supportSubmitting}>
                    {supportSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("support.sending")}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {t("support.send")}
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
                  <p>{t("support.directEmail")}: <a href="mailto:support@budgetapp.site" className="text-primary hover:underline">support@budgetapp.site</a></p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
