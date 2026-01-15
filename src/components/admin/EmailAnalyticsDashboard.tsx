import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Mail, MousePointer, Eye, TrendingUp, Calendar, Users, CheckCircle2, Clock, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { Progress } from '@/components/ui/progress';

interface EmailStats {
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
}

interface DailyStats {
  date: string;
  opens: number;
  clicks: number;
}

interface EmailTypeStats {
  emailType: string;
  opens: number;
  clicks: number;
  openRate: number;
}

interface OnboardingProgress {
  day: number;
  totalUsers: number;
  emailsSent: number;
  completed: number;
}

interface OnboardingOverview {
  totalUsers: number;
  activeUsers: number;
  completedUsers: number;
  avgDay: number;
  languageBreakdown: { language: string; count: number }[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const DAY_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export const EmailAnalyticsDashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [emailTypeStats, setEmailTypeStats] = useState<EmailTypeStats[]>([]);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress[]>([]);
  const [onboardingOverview, setOnboardingOverview] = useState<OnboardingOverview | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all email analytics
      const { data: analytics, error } = await supabase
        .from('email_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch onboarding emails data
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('onboarding_emails')
        .select('*');

      if (onboardingError) throw onboardingError;

      // Calculate onboarding overview
      if (onboardingData) {
        const totalUsers = onboardingData.length;
        const completedUsers = onboardingData.filter(u => u.is_completed).length;
        const activeUsers = onboardingData.filter(u => !u.is_completed && u.last_sent_at).length;
        const avgDay = totalUsers > 0 
          ? onboardingData.reduce((sum, u) => sum + u.current_day, 0) / totalUsers 
          : 0;

        // Language breakdown
        const langMap: Record<string, number> = {};
        onboardingData.forEach(u => {
          const lang = u.language || 'en';
          langMap[lang] = (langMap[lang] || 0) + 1;
        });

        setOnboardingOverview({
          totalUsers,
          activeUsers,
          completedUsers,
          avgDay: Math.round(avgDay * 10) / 10,
          languageBreakdown: Object.entries(langMap).map(([language, count]) => ({
            language: language === 'tr' ? 'Türkçe' : language === 'en' ? 'English' : 'Deutsch',
            count
          }))
        });

        // Calculate progress by day
        const dayMap: Record<number, OnboardingProgress> = {};
        for (let i = 1; i <= 7; i++) {
          dayMap[i] = { day: i, totalUsers: 0, emailsSent: 0, completed: 0 };
        }
        
        onboardingData.forEach(u => {
          const currentDay = u.current_day;
          // Users at this day or past it
          for (let d = 1; d <= 7; d++) {
            if (currentDay > d) {
              dayMap[d].emailsSent++;
            }
            if (currentDay === d) {
              dayMap[d].totalUsers++;
            }
          }
          if (u.is_completed) {
            dayMap[7].completed++;
          }
        });

        setOnboardingProgress(Object.values(dayMap));
      }

      // Get total sent from onboarding_emails
      const totalSent = onboardingData?.filter(u => u.last_sent_at !== null).length || 0;

      // Calculate overall stats
      const opens = analytics?.filter(a => a.event_type === 'open') || [];
      const clicks = analytics?.filter(a => a.event_type === 'click') || [];
      
      const uniqueOpenEmails = new Set(opens.map(o => o.user_email));
      const uniqueClickEmails = new Set(clicks.map(c => c.user_email));

      const totalEmails = totalSent || 1; // Avoid division by zero

      setStats({
        totalSent: totalSent,
        totalOpens: opens.length,
        totalClicks: clicks.length,
        uniqueOpens: uniqueOpenEmails.size,
        uniqueClicks: uniqueClickEmails.size,
        openRate: Math.round((uniqueOpenEmails.size / totalEmails) * 100),
        clickRate: Math.round((uniqueClickEmails.size / totalEmails) * 100),
        clickToOpenRate: uniqueOpenEmails.size > 0 
          ? Math.round((uniqueClickEmails.size / uniqueOpenEmails.size) * 100) 
          : 0
      });

      // Calculate daily stats (last 14 days)
      const dailyMap: Record<string, { opens: number; clicks: number }> = {};
      const now = new Date();
      
      // Initialize last 14 days
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap[dateStr] = { opens: 0, clicks: 0 };
      }

      // Populate with actual data
      analytics?.forEach(a => {
        const dateStr = new Date(a.created_at).toISOString().split('T')[0];
        if (dailyMap[dateStr]) {
          if (a.event_type === 'open') {
            dailyMap[dateStr].opens++;
          } else if (a.event_type === 'click') {
            dailyMap[dateStr].clicks++;
          }
        }
      });

      setDailyStats(
        Object.entries(dailyMap).map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
          opens: stats.opens,
          clicks: stats.clicks
        }))
      );

      // Calculate email type stats
      const typeMap: Record<string, { opens: Set<string>; clicks: Set<string> }> = {};
      
      analytics?.forEach(a => {
        if (!typeMap[a.email_type]) {
          typeMap[a.email_type] = { opens: new Set(), clicks: new Set() };
        }
        if (a.event_type === 'open') {
          typeMap[a.email_type].opens.add(a.user_email);
        } else if (a.event_type === 'click') {
          typeMap[a.email_type].clicks.add(a.user_email);
        }
      });

      setEmailTypeStats(
        Object.entries(typeMap)
          .map(([emailType, data]) => ({
            emailType: emailType.replace('onboarding_day_', 'Gün '),
            opens: data.opens.size,
            clicks: data.clicks.size,
            openRate: data.opens.size > 0 ? Math.round((data.clicks.size / data.opens.size) * 100) : 0
          }))
          .sort((a, b) => a.emailType.localeCompare(b.emailType))
      );

    } catch (error) {
      console.error('Error fetching email analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            E-posta Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Onboarding e-postalarının açılma ve tıklanma istatistikleri
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              Gönderilen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalSent || 0}</p>
            <p className="text-xs text-muted-foreground">toplam e-posta</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-500" />
              Açılma Oranı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.openRate || 0}%</p>
            <p className="text-xs text-muted-foreground">{stats?.uniqueOpens} benzersiz açılma</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-purple-500" />
              Tıklanma Oranı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.clickRate || 0}%</p>
            <p className="text-xs text-muted-foreground">{stats?.uniqueClicks} benzersiz tıklama</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Tık/Açılma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.clickToOpenRate || 0}%</p>
            <p className="text-xs text-muted-foreground">açanların tıklaması</p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Series Overview */}
      {onboardingOverview && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              7 Günlük Onboarding Serisi
            </CardTitle>
            <CardDescription>Kullanıcıların onboarding e-posta serisi ilerlemesi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Users className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{onboardingOverview.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Toplam Kullanıcı</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Clock className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{onboardingOverview.activeUsers}</p>
                <p className="text-xs text-muted-foreground">Aktif (Devam Eden)</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold">{onboardingOverview.completedUsers}</p>
                <p className="text-xs text-muted-foreground">Tamamlayan</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">{onboardingOverview.avgDay}</p>
                <p className="text-xs text-muted-foreground">Ortalama Gün</p>
              </div>
            </div>

            {/* Language Breakdown */}
            <div>
              <h4 className="text-sm font-medium mb-3">Dil Dağılımı</h4>
              <div className="flex flex-wrap gap-2">
                {onboardingOverview.languageBreakdown.map((lang, idx) => (
                  <Badge 
                    key={lang.language} 
                    variant="outline"
                    className="px-3 py-1"
                    style={{ borderColor: DAY_COLORS[idx % DAY_COLORS.length] }}
                  >
                    {lang.language}: {lang.count} kullanıcı
                  </Badge>
                ))}
              </div>
            </div>

            {/* Day by Day Progress */}
            <div>
              <h4 className="text-sm font-medium mb-3">Gün Bazında İlerleme</h4>
              <div className="space-y-3">
                {onboardingProgress.map((day) => {
                  const sentPercentage = onboardingOverview.totalUsers > 0 
                    ? (day.emailsSent / onboardingOverview.totalUsers) * 100 
                    : 0;
                  return (
                    <div key={day.day} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: DAY_COLORS[day.day - 1] }}
                          />
                          Gün {day.day}
                        </span>
                        <span className="text-muted-foreground">
                          {day.emailsSent} / {onboardingOverview.totalUsers} gönderildi ({Math.round(sentPercentage)}%)
                        </span>
                      </div>
                      <Progress value={sentPercentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Günlük Trend (Son 14 Gün)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    angle={-45}
                    textAnchor="end"
                    height={50}
                    className="fill-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="opens" 
                    stroke="#10b981" 
                    fillOpacity={1}
                    fill="url(#colorOpens)"
                    name="Açılma"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#3b82f6" 
                    fillOpacity={1}
                    fill="url(#colorClicks)"
                    name="Tıklama"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Email Type Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              E-posta Türü Performansı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emailTypeStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis 
                    dataKey="emailType" 
                    type="category" 
                    tick={{ fontSize: 11 }} 
                    width={60}
                    className="fill-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="opens" fill="#10b981" name="Açılma" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="clicks" fill="#3b82f6" name="Tıklama" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detaylı İstatistikler</CardTitle>
          <CardDescription>Her e-posta türü için ayrıntılı performans</CardDescription>
        </CardHeader>
        <CardContent>
          {emailTypeStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz e-posta analytics verisi yok</p>
              <p className="text-sm mt-1">E-postalar gönderildiğinde veriler burada görünecek</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emailTypeStats.map((stat, index) => (
                <div 
                  key={stat.emailType}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{stat.emailType}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="gap-1">
                      <Eye className="h-3 w-3" />
                      {stat.opens} açılma
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <MousePointer className="h-3 w-3" />
                      {stat.clicks} tıklama
                    </Badge>
                    <Badge 
                      variant={stat.openRate >= 30 ? "default" : "secondary"}
                      className="gap-1"
                    >
                      <TrendingUp className="h-3 w-3" />
                      {stat.openRate}% CTR
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
