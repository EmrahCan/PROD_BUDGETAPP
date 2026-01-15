import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Trash2, 
  ShieldCheck, 
  ShieldOff, 
  Users, 
  CreditCard, 
  Wallet, 
  RefreshCw,
  Mail,
  BarChart3,
  UserPlus,
  Activity,
  Clock,
  AlertTriangle,
  Globe,
  LogIn,
  LogOut,
  Shield,
  Timer,
  Users2,
  TrendingUp,
  PieChart,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  MousePointer,
  Eye,
  Radio,
  Wifi,
  Monitor,
  Smartphone,
  Tablet,
  Chrome
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from "@/components/Layout";
import { useTranslation } from 'react-i18next';
import { useOnlineUsers, PresenceUser, DeviceInfo } from '@/hooks/usePresence';
import { UserLocationMap } from '@/components/admin/UserLocationMap';
import { EmailAnalyticsDashboard } from '@/components/admin/EmailAnalyticsDashboard';
import { AICacheAnalytics } from '@/components/admin/AICacheAnalytics';

interface User {
  id: string;
  full_name: string | null;
  roles: string[];
  created_at: string;
}

// Platform istatistikleri - FİNANSAL VERİ İÇERMEZ
interface PlatformStats {
  totalUsers: number;
  totalTransactions: number;
  totalAccounts: number;
  totalCards: number;
  todayTransactionsCount: number;
  newUsersToday: number;
  activeUsersWeek: number;
}

interface LoginLog {
  id: string;
  masked_name: string;
  masked_user_id: string;
  login_at: string;
  event_type: 'login' | 'logout';
  masked_ip: string;
  country_code: string | null;
  city: string | null;
  is_suspicious: boolean;
  suspicious_reason: string | null;
  is_admin: boolean;
}

interface SuspiciousAlert {
  id: string;
  masked_user_id: string;
  masked_name: string;
  alert_type: string;
  severity: string;
  description: string;
  created_at: string;
  is_resolved: boolean;
}

interface SessionStats {
  activeSessions: number;
  avgSessionDurationMinutes: number;
  logins24h: number;
  logouts24h: number;
  uniqueUsers24h: number;
  uniqueUsers7d: number;
  completedSessions: number;
}

interface TopActiveUser {
  masked_user_id: string;
  masked_name: string;
  login_count: number;
  last_active: string;
  is_admin: boolean;
}

interface TopCategory {
  category: string;
  transaction_type: string;
  transaction_count: number;
  total_amount_masked: string;
}

interface TransactionReport {
  topCategories: TopCategory[];
  summary: {
    totalTransactions: number;
    expenseCount: number;
    incomeCount: number;
    transferCount: number;
    period: string;
  };
}

interface TopUserByTransactions {
  masked_user_id: string;
  masked_name: string;
  top_category: string;
  top_category_type: string;
  top_category_count: number;
  total_transactions: number;
  is_admin: boolean;
}

interface PageViewStats {
  page_path: string;
  page_name: string;
  view_count: number;
  unique_users: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
}

interface UserPageActivity {
  masked_user_id: string;
  masked_name: string;
  total_page_views: number;
  total_time_seconds: number;
  top_page: string;
  top_page_views: number;
  last_active: string;
}

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState<SuspiciousAlert[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [topActiveUsers, setTopActiveUsers] = useState<TopActiveUser[]>([]);
  const [transactionReport, setTransactionReport] = useState<TransactionReport | null>(null);
  const [topUsersByTransactions, setTopUsersByTransactions] = useState<TopUserByTransactions[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [pageViewStats, setPageViewStats] = useState<PageViewStats[]>([]);
  const [userPageActivity, setUserPageActivity] = useState<UserPageActivity[]>([]);
  const [behaviorLoading, setBehaviorLoading] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const onlineUsers = useOnlineUsers();

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchUserBehavior();
  }, []);

  useEffect(() => {
    if (user) fetchLoginLogs();
  }, [user]);

  const fetchLoginLogs = async () => {
    if (!user) return;

    setLogsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-logs');

      if (error) throw error;
      setLoginLogs(data?.logs || []);
      setSuspiciousAlerts(data?.alerts || []);
      setSessionStats(data?.sessionStats || null);
      setTopActiveUsers(data?.topActiveUsers || []);
      setTransactionReport(data?.transactionReport || null);
      setTopUsersByTransactions(data?.topUsersByTransactions || []);
    } catch (error) {
      console.error('Error fetching login logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchUserBehavior = async () => {
    setBehaviorLoading(true);
    try {
      // Fetch page view statistics
      const { data: pageViews, error: pageViewsError } = await supabase
        .from('page_views')
        .select('page_path, page_name, duration_seconds, user_id');

      if (pageViewsError) throw pageViewsError;

      // Process page view stats
      const pageStats: Record<string, { view_count: number; unique_users: Set<string>; total_duration: number }> = {};
      const userStats: Record<string, { 
        views: number; 
        total_time: number; 
        pages: Record<string, number>; 
        last_active: string;
      }> = {};

      for (const view of pageViews || []) {
        // Page stats
        if (!pageStats[view.page_path]) {
          pageStats[view.page_path] = { view_count: 0, unique_users: new Set(), total_duration: 0 };
        }
        pageStats[view.page_path].view_count++;
        pageStats[view.page_path].unique_users.add(view.user_id);
        pageStats[view.page_path].total_duration += view.duration_seconds || 0;

        // User stats
        if (!userStats[view.user_id]) {
          userStats[view.user_id] = { views: 0, total_time: 0, pages: {}, last_active: '' };
        }
        userStats[view.user_id].views++;
        userStats[view.user_id].total_time += view.duration_seconds || 0;
        userStats[view.user_id].pages[view.page_name] = (userStats[view.user_id].pages[view.page_name] || 0) + 1;
      }

      // Convert to arrays
      const pageViewStatsArray: PageViewStats[] = Object.entries(pageStats).map(([path, stats]) => {
        const pageName = (pageViews || []).find(v => v.page_path === path)?.page_name || path;
        return {
          page_path: path,
          page_name: pageName,
          view_count: stats.view_count,
          unique_users: stats.unique_users.size,
          total_duration_seconds: stats.total_duration,
          avg_duration_seconds: Math.round(stats.total_duration / stats.view_count),
        };
      }).sort((a, b) => b.view_count - a.view_count);

      // Fetch profiles for user names (masked)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      const userActivityArray: UserPageActivity[] = Object.entries(userStats).map(([userId, stats]) => {
        const name = profileMap.get(userId) || 'Kullanıcı';
        const topPage = Object.entries(stats.pages).sort((a, b) => b[1] - a[1])[0];
        return {
          masked_user_id: userId.substring(0, 4) + '****' + userId.substring(userId.length - 4),
          masked_name: name ? name.charAt(0) + '***' + (name.split(' ')[1]?.charAt(0) || '') : '***',
          total_page_views: stats.views,
          total_time_seconds: stats.total_time,
          top_page: topPage?.[0] || '-',
          top_page_views: topPage?.[1] || 0,
          last_active: new Date().toISOString(),
        };
      }).sort((a, b) => b.total_page_views - a.total_page_views).slice(0, 20);

      setPageViewStats(pageViewStatsArray);
      setUserPageActivity(userActivityArray);
    } catch (error) {
      console.error('Error fetching user behavior:', error);
    } finally {
      setBehaviorLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // SADECE SAYISAL İSTATİSTİKLER - FİNANSAL VERİ YOK
      // Onboarding_emails tablosundan da kullanıcı sayısını al (demo hesaplar dahil)
      const [
        { count: profileUsers },
        { count: onboardingUsers },
        { count: totalTransactions },
        { count: totalAccounts },
        { count: totalCards },
        { count: todayTransactionsCount },
        { data: newProfileUsers },
        { data: newOnboardingUsers }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('onboarding_emails').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('accounts').select('*', { count: 'exact', head: true }),
        supabase.from('credit_cards').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()),
        supabase.from('profiles').select('id').gte('created_at', yesterday.toISOString()),
        supabase.from('onboarding_emails').select('id').gte('created_at', yesterday.toISOString())
      ]);

      // Toplam kullanıcı sayısı: profiles + onboarding_emails (unique)
      const totalUsers = Math.max(profileUsers || 0, onboardingUsers || 0);
      const newUsersToday = Math.max(newProfileUsers?.length || 0, newOnboardingUsers?.length || 0);

      setStats({
        totalUsers,
        totalTransactions: totalTransactions || 0,
        totalAccounts: totalAccounts || 0,
        totalCards: totalCards || 0,
        todayTransactionsCount: todayTransactionsCount || 0,
        newUsersToday,
        activeUsersWeek: 0 // Bu bilgi auth loglarından alınabilir ama şimdilik 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSendDailyReport = async () => {
    setSendingReport(true);
    try {
      const { error } = await supabase.functions.invoke('admin-notification', {
        body: { type: 'daily_stats' }
      });
      
      if (error) throw error;
      toast.success(t('admin.reportSent'));
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error(t('admin.reportError'));
    } finally {
      setSendingReport(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // SADECE PROFİL BİLGİLERİ - FİNANSAL VERİ YOK
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at');

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const combinedUsers = profiles?.map(profile => {
        const roles = userRoles?.filter(r => r.user_id === profile.id).map(r => r.role) || [];
        
        return {
          id: profile.id,
          full_name: profile.full_name,
          roles,
          created_at: profile.created_at || '',
        };
      }) || [];

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('admin.roleError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: deleteUserId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(t('admin.userDeleted'));
      setDeleteUserId(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('admin.deleteError'));
    }
  };

  const handleToggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        
        if (error) throw error;
        toast.success(t('admin.adminRemoved'));
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });
        
        if (error) throw error;
        toast.success(t('admin.userMadeAdmin'));

        // Send notification to admins about new admin
        const userProfile = users.find(u => u.id === userId);
        await supabase.functions.invoke('admin-notification', {
          body: {
            type: 'new_admin_registration',
            data: {
              adminName: userProfile?.full_name || 'Unknown',
              registeredAt: new Date().toISOString()
            }
          }
        });
      }
      
      fetchUsers();
    } catch (error) {
      console.error('Error toggling admin role:', error);
      toast.error(t('admin.roleError'));
    }
  };

  if (loading) {
    return <Layout><div className="p-8">{t('common.loading')}</div></Layout>;
  }

  return (
    <Layout>
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.managementPanel')}</h1>
          <p className="text-muted-foreground">
            {t('admin.viewManageUsers')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchStats()}
            disabled={statsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
            {t('admin.refreshStats')}
          </Button>
          <Button
            onClick={handleSendDailyReport}
            disabled={sendingReport}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            {sendingReport ? t('admin.sendingReport') : t('admin.sendDailyReport')}
          </Button>
        </div>
      </div>

      {/* Privacy Notice */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {t('admin.privacyNotice')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('admin.privacyDescription')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Statistics - ONLY COUNTS, NO FINANCIAL DATA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              {t('admin.totalUsersCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
            {stats?.newUsersToday ? (
              <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                <UserPlus className="h-3 w-3" />
                +{stats.newUsersToday} {t('admin.newUsersToday').toLowerCase()}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              {t('admin.totalTransactionsCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalTransactions || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.todayTransactionsCount || 0} {t('admin.todayTransactions').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" />
              {t('admin.totalAccounts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalAccounts || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-500" />
              {t('admin.totalCards')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalCards || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Activity Summary - NO FINANCIAL AMOUNTS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('admin.platformOverview')}
          </CardTitle>
          <CardDescription>{t('admin.platformActivityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('admin.totalUsersCount')}</p>
              <p className="text-xl font-bold">{stats?.totalUsers || 0}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <Activity className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('admin.todayTransactions')}</p>
              <p className="text-xl font-bold">{stats?.todayTransactionsCount || 0} {t('admin.transactionCount')}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center md:col-span-1 col-span-2">
              <Clock className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('admin.newUsersToday')}</p>
              <p className="text-xl font-bold">{stats?.newUsersToday || 0} {t('admin.userCount')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
          <TabsTrigger value="loginLogs">{t('admin.loginLogs')}</TabsTrigger>
          <TabsTrigger value="userBehavior">{t('admin.userBehavior')}</TabsTrigger>
          <TabsTrigger value="emailAnalytics">E-posta Analytics</TabsTrigger>
          <TabsTrigger value="aiCache">AI Cache</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.users')}</CardTitle>
              <CardDescription>
                {t('admin.registeredUsers', { count: users.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{t('admin.noUsers')}</p>
                  <div className="text-sm text-left bg-muted p-4 rounded-lg max-w-2xl mx-auto">
                    <p className="font-semibold mb-2">{t('admin.firstAdminInstructions')}</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>{t('admin.step1')}</li>
                      <li>{t('admin.step2')}</li>
                      <li>{t('admin.step3')}</li>
                      <li>{t('admin.step4')}
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li>{t('admin.step4a')}</li>
                          <li>{t('admin.step4b')}</li>
                        </ul>
                      </li>
                      <li>{t('admin.step5')}</li>
                    </ol>
                  </div>
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.userId')}</TableHead>
                    <TableHead>{t('admin.name')}</TableHead>
                    <TableHead>{t('admin.roles')}</TableHead>
                    <TableHead>{t('admin.registrationDate')}</TableHead>
                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">
                        {u.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{u.full_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {u.roles.length > 0 ? (
                            u.roles.map((role) => (
                              <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">user</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleAdminRole(u.id, u.roles.includes('admin'))}
                                disabled={u.id === user.id}
                                title={u.roles.includes('admin') ? t('admin.removeAdmin') : t('admin.makeAdmin')}
                              >
                                {u.roles.includes('admin') ? (
                                  <ShieldOff className="h-4 w-4 text-orange-500" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteUserId(u.id)}
                                disabled={u.id === user.id}
                                title={t('admin.deleteUserTitle')}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loginLogs" className="mt-6 space-y-6">
          {/* Session Statistics Cards */}
          {sessionStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Users2 className="h-3.5 w-3.5 text-emerald-500" />
                    {t('admin.activeSessions')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-emerald-600">{sessionStats.activeSessions}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5 text-blue-500" />
                    {t('admin.avgSessionDuration')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-blue-600">
                    {sessionStats.avgSessionDurationMinutes > 60 
                      ? `${Math.floor(sessionStats.avgSessionDurationMinutes / 60)}h ${sessionStats.avgSessionDurationMinutes % 60}m`
                      : `${sessionStats.avgSessionDurationMinutes}m`
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <LogIn className="h-3.5 w-3.5 text-green-500" />
                    {t('admin.logins24h')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-green-600">{sessionStats.logins24h}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <LogOut className="h-3.5 w-3.5 text-orange-500" />
                    {t('admin.logouts24h')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-orange-600">{sessionStats.logouts24h}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-purple-500" />
                    {t('admin.uniqueUsers24h')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-purple-600">{sessionStats.uniqueUsers24h}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-indigo-500" />
                    {t('admin.uniqueUsers7d')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-indigo-600">{sessionStats.uniqueUsers7d}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-500" />
                    {t('admin.completedSessions')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-2xl font-bold text-cyan-600">{sessionStats.completedSessions}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Active Users Card */}
          {topActiveUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {t('admin.topActiveUsers')}
                </CardTitle>
                <CardDescription>
                  {t('admin.topActiveUsersDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('admin.maskedUserId')}</TableHead>
                      <TableHead>{t('admin.maskedName')}</TableHead>
                      <TableHead>{t('admin.loginCount')}</TableHead>
                      <TableHead>{t('admin.lastActive')}</TableHead>
                      <TableHead>{t('admin.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topActiveUsers.map((user, index) => (
                      <TableRow key={user.masked_user_id}>
                        <TableCell>
                          <Badge variant={index < 3 ? 'default' : 'secondary'} className={
                            index === 0 ? 'bg-amber-500 hover:bg-amber-600' :
                            index === 1 ? 'bg-slate-400 hover:bg-slate-500' :
                            index === 2 ? 'bg-amber-700 hover:bg-amber-800' : ''
                          }>
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {user.masked_user_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.masked_name}
                            {user.is_admin && (
                              <Badge variant="outline" className="gap-1">
                                <Shield className="h-3 w-3" />
                                Admin
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <LogIn className="h-3 w-3 text-emerald-500" />
                            <span className="font-medium">{user.login_count}</span>
                            <span className="text-muted-foreground text-xs">{t('admin.logins')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(user.last_active).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t('admin.active')}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Transaction Report Card */}
          {transactionReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  {t('admin.transactionReport')}
                </CardTitle>
                <CardDescription>
                  {t('admin.transactionReportDesc', { period: transactionReport.summary.period })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Transaction Type Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-lg p-4 text-center">
                    <ArrowDownCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t('admin.expenses')}</p>
                    <p className="text-2xl font-bold text-red-600">{transactionReport.summary.expenseCount}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4 text-center">
                    <ArrowUpCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t('admin.incomes')}</p>
                    <p className="text-2xl font-bold text-green-600">{transactionReport.summary.incomeCount}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4 text-center">
                    <ArrowLeftRight className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t('admin.transfers')}</p>
                    <p className="text-2xl font-bold text-blue-600">{transactionReport.summary.transferCount}</p>
                  </div>
                </div>

                {/* Top Categories Table */}
                {transactionReport.topCategories.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {t('admin.topCategories')}
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>{t('admin.category')}</TableHead>
                          <TableHead>{t('admin.transactionType')}</TableHead>
                          <TableHead>{t('admin.transactionCountLabel')}</TableHead>
                          <TableHead>{t('admin.volumeRange')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionReport.topCategories.map((cat, index) => (
                          <TableRow key={`${cat.category}-${cat.transaction_type}`}>
                            <TableCell>
                              <Badge variant={index < 3 ? 'default' : 'secondary'} className={
                                index === 0 ? 'bg-amber-500 hover:bg-amber-600' :
                                index === 1 ? 'bg-slate-400 hover:bg-slate-500' :
                                index === 2 ? 'bg-amber-700 hover:bg-amber-800' : ''
                              }>
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {t(`categories.${cat.category}`, cat.category)}
                            </TableCell>
                            <TableCell>
                              {cat.transaction_type === 'expense' ? (
                                <Badge variant="outline" className="gap-1 text-red-600 border-red-600/50">
                                  <ArrowDownCircle className="h-3 w-3" />
                                  {t('admin.expense')}
                                </Badge>
                              ) : cat.transaction_type === 'income' ? (
                                <Badge variant="outline" className="gap-1 text-green-600 border-green-600/50">
                                  <ArrowUpCircle className="h-3 w-3" />
                                  {t('admin.income')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-blue-600 border-blue-600/50">
                                  <ArrowLeftRight className="h-3 w-3" />
                                  {t('admin.transfer')}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{cat.transaction_count}</span>
                              <span className="text-muted-foreground text-xs ml-1">{t('admin.transactions')}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{cat.total_amount_masked}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    {t('admin.transactionReportPrivacyNote')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Transaction Statistics Card */}
          {topUsersByTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t('admin.userTransactionStats')}
                </CardTitle>
                <CardDescription>
                  {t('admin.userTransactionStatsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('admin.maskedUserId')}</TableHead>
                      <TableHead>{t('admin.maskedName')}</TableHead>
                      <TableHead>{t('admin.favoriteCategory')}</TableHead>
                      <TableHead>{t('admin.categoryTransactions')}</TableHead>
                      <TableHead>{t('admin.totalUserTransactions')}</TableHead>
                      <TableHead>{t('admin.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsersByTransactions.map((user, index) => (
                      <TableRow key={user.masked_user_id}>
                        <TableCell>
                          <Badge variant={index < 3 ? 'default' : 'secondary'} className={
                            index === 0 ? 'bg-amber-500 hover:bg-amber-600' :
                            index === 1 ? 'bg-slate-400 hover:bg-slate-500' :
                            index === 2 ? 'bg-amber-700 hover:bg-amber-800' : ''
                          }>
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {user.masked_user_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.masked_name}
                            {user.is_admin && (
                              <Badge variant="outline" className="gap-1">
                                <Shield className="h-3 w-3" />
                                Admin
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t(`categories.${user.top_category}`, user.top_category)}</span>
                            {user.top_category_type === 'expense' ? (
                              <Badge variant="outline" className="text-red-600 border-red-600/50 text-xs">
                                <ArrowDownCircle className="h-2.5 w-2.5 mr-1" />
                                {t('admin.expense')}
                              </Badge>
                            ) : user.top_category_type === 'income' ? (
                              <Badge variant="outline" className="text-green-600 border-green-600/50 text-xs">
                                <ArrowUpCircle className="h-2.5 w-2.5 mr-1" />
                                {t('admin.income')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-blue-600 border-blue-600/50 text-xs">
                                <ArrowLeftRight className="h-2.5 w-2.5 mr-1" />
                                {t('admin.transfer')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{user.top_category_count}</span>
                          <span className="text-muted-foreground text-xs ml-1">{t('admin.transactions')}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3 text-purple-500" />
                            <span className="font-bold">{user.total_transactions}</span>
                            <span className="text-muted-foreground text-xs">{t('admin.transactions')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t('admin.active')}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    {t('admin.userTransactionStatsPrivacyNote')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-primary" />
                    {t('admin.loginLogs')}
                  </CardTitle>
                  <CardDescription>
                    {t('admin.loginLogsDescription')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLoginLogs}
                  disabled={logsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                  {t('admin.refresh')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : loginLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.noLoginLogs')}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Suspicious Activity Alerts */}
                  {suspiciousAlerts.length > 0 && (
                    <div className="p-4 border border-destructive/50 bg-destructive/5 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-destructive font-medium">
                        <AlertTriangle className="h-5 w-5" />
                        {t('admin.suspiciousAlerts')} ({suspiciousAlerts.length})
                      </div>
                      {suspiciousAlerts.slice(0, 5).map((alert) => (
                        <div key={alert.id} className="p-3 bg-background rounded border flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'high' ? 'destructive' : 'secondary'}>
                                {alert.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{alert.masked_user_id}</span>
                            </div>
                            <p className="text-sm">{alert.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Login Logs Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.maskedUserId')}</TableHead>
                        <TableHead>{t('admin.maskedName')}</TableHead>
                        <TableHead>{t('admin.eventType')}</TableHead>
                        <TableHead>{t('admin.loginTime')}</TableHead>
                        <TableHead>{t('admin.maskedIp')}</TableHead>
                        <TableHead>{t('admin.location')}</TableHead>
                        <TableHead>{t('admin.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginLogs.map((log) => (
                        <TableRow key={log.id} className={log.is_suspicious ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-mono text-xs">
                            {log.masked_user_id}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {log.masked_name}
                              {log.is_admin && (
                                <Badge variant="outline" className="gap-1">
                                  <Shield className="h-3 w-3" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.event_type === 'logout' ? (
                              <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600/50">
                                <LogOut className="h-3 w-3" />
                                {t('admin.logout')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600/50">
                                <LogIn className="h-3 w-3" />
                                {t('admin.login')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {new Date(log.login_at).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              {log.masked_ip}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.country_code || log.city ? `${log.city || ''} ${log.country_code || ''}`.trim() : '-'}
                          </TableCell>
                          <TableCell>
                            {log.is_suspicious ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {t('admin.suspicious')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{t('admin.normal')}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  {t('admin.loginLogsPrivacyNote')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Behavior Tab */}
        <TabsContent value="userBehavior" className="mt-6 space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUserBehavior}
              disabled={behaviorLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${behaviorLoading ? 'animate-spin' : ''}`} />
              {t('admin.refresh')}
            </Button>
          </div>

          {/* Online Users Card - Real-time */}
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="relative">
                  <Wifi className="h-5 w-5 text-emerald-500" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                {t('admin.onlineUsers')}
                <Badge variant="secondary" className="ml-2 bg-emerald-500/20 text-emerald-600">
                  {onlineUsers.filter(u => !u.isAdmin).length} {t('admin.activeNow')}
                </Badge>
              </CardTitle>
              <CardDescription>
                {t('admin.onlineUsersDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {onlineUsers.filter(u => !u.isAdmin).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                  <Radio className="h-8 w-8 text-muted-foreground/50" />
                  <p>{t('admin.noOnlineUsers')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {onlineUsers.filter(u => !u.isAdmin).map((onlineUser) => {
                      const sessionDurationMs = new Date().getTime() - new Date(onlineUser.sessionStart).getTime();
                      const sessionMinutes = Math.floor(sessionDurationMs / 60000);
                      const sessionHours = Math.floor(sessionMinutes / 60);
                      const remainingMinutes = sessionMinutes % 60;
                      const sessionDurationText = sessionHours > 0 
                        ? `${sessionHours}h ${remainingMinutes}m` 
                        : `${sessionMinutes}m`;
                      
                      const lastSeenMs = new Date().getTime() - new Date(onlineUser.lastSeen).getTime();
                      const lastSeenSeconds = Math.floor(lastSeenMs / 1000);
                      const lastSeenText = lastSeenSeconds < 60 
                        ? t('admin.justNow')
                        : lastSeenSeconds < 3600 
                          ? `${Math.floor(lastSeenSeconds / 60)} ${t('admin.minutesAgo')}`
                          : `${Math.floor(lastSeenSeconds / 3600)} ${t('admin.hoursAgo')}`;

                      const topFeature = onlineUser.pageHistory?.[0];

                      return (
                        <div
                          key={onlineUser.id}
                          className="flex flex-col gap-3 p-4 bg-background/50 rounded-lg border border-border/50 hover:border-emerald-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-medium">
                                {onlineUser.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="absolute bottom-0 right-0 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background"></span>
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {onlineUser.name.charAt(0)}***{onlineUser.name.split(' ')[1]?.charAt(0) || ''}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MousePointer className="h-3 w-3" />
                                <span className="truncate">
                                  {onlineUser.currentPage === '/dashboard' ? t('nav.dashboard') :
                                   onlineUser.currentPage === '/accounts' ? t('nav.accounts') :
                                   onlineUser.currentPage === '/cards' ? t('nav.cards') :
                                   onlineUser.currentPage === '/transactions' ? t('nav.transactions') :
                                   onlineUser.currentPage === '/reports' ? t('nav.reports') :
                                   onlineUser.currentPage === '/settings' ? t('nav.settings') :
                                   onlineUser.currentPage === '/ai-advisor' ? t('nav.aiAdvisor') :
                                   onlineUser.currentPage === '/crypto' ? t('nav.crypto') :
                                   onlineUser.currentPage === '/currency' ? t('nav.currency') :
                                   onlineUser.currentPage === '/calendar' ? t('nav.calendar') :
                                   onlineUser.currentPage === '/family' ? t('nav.family') :
                                   onlineUser.currentPage === '/fixed-payments' ? t('nav.fixedPayments') :
                                   onlineUser.currentPage === '/installments' ? t('nav.installments') :
                                   onlineUser.currentPage === '/loans' ? t('nav.loans') :
                                   onlineUser.currentPage || '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Session info */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
                            <div className="flex items-center gap-1.5">
                              <Timer className="h-3 w-3 text-blue-500" />
                              <div>
                                <p className="text-[10px] text-muted-foreground">{t('admin.sessionDuration')}</p>
                                <p className="text-xs font-medium">{sessionDurationText}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-amber-500" />
                              <div>
                                <p className="text-[10px] text-muted-foreground">{t('admin.onlineLastActivity')}</p>
                                <p className="text-xs font-medium">{lastSeenText}</p>
                              </div>
                            </div>
                          </div>

                          {/* Top feature used */}
                          {topFeature && (
                            <div className="flex items-center gap-1.5 pt-2 border-t border-border/30">
                              <TrendingUp className="h-3 w-3 text-purple-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-muted-foreground">{t('admin.topFeatureUsed')}</p>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {topFeature.page === '/dashboard' ? t('nav.dashboard') :
                                     topFeature.page === '/accounts' ? t('nav.accounts') :
                                     topFeature.page === '/cards' ? t('nav.cards') :
                                     topFeature.page === '/transactions' ? t('nav.transactions') :
                                     topFeature.page === '/reports' ? t('nav.reports') :
                                     topFeature.page === '/settings' ? t('nav.settings') :
                                     topFeature.page === '/ai-advisor' ? t('nav.aiAdvisor') :
                                     topFeature.page === '/crypto' ? t('nav.crypto') :
                                     topFeature.page === '/currency' ? t('nav.currency') :
                                     topFeature.page === '/calendar' ? t('nav.calendar') :
                                     topFeature.page === '/family' ? t('nav.family') :
                                     topFeature.page === '/fixed-payments' ? t('nav.fixedPayments') :
                                     topFeature.page === '/installments' ? t('nav.installments') :
                                     topFeature.page === '/loans' ? t('nav.loans') :
                                     topFeature.page || '-'}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({topFeature.count} {t('admin.visits')})
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Device info */}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-border/30">
                            {onlineUser.device.deviceType === 'mobile' ? (
                              <Smartphone className="h-3 w-3 text-rose-500" />
                            ) : onlineUser.device.deviceType === 'tablet' ? (
                              <Tablet className="h-3 w-3 text-orange-500" />
                            ) : (
                              <Monitor className="h-3 w-3 text-sky-500" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-muted-foreground">{t('admin.deviceInfo')}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {onlineUser.device.os}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {onlineUser.device.browser}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device & Browser Statistics */}
          {onlineUsers.filter(u => !u.isAdmin).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-sky-500" />
                  {t('admin.deviceBrowserStats')}
                </CardTitle>
                <CardDescription>
                  {t('admin.deviceBrowserStatsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const nonAdminUsers = onlineUsers.filter(u => !u.isAdmin);
                  
                  // Calculate device stats
                  const deviceStats = nonAdminUsers.reduce((acc, u) => {
                    acc[u.device.deviceType] = (acc[u.device.deviceType] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  // Calculate OS stats
                  const osStats = nonAdminUsers.reduce((acc, u) => {
                    acc[u.device.os] = (acc[u.device.os] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  // Calculate browser stats
                  const browserStats = nonAdminUsers.reduce((acc, u) => {
                    acc[u.device.browser] = (acc[u.device.browser] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  const total = nonAdminUsers.length;

                  return (
                    <div className="grid gap-6 md:grid-cols-3">
                      {/* Device Type */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-rose-500" />
                          {t('admin.deviceType')}
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(deviceStats).sort((a, b) => b[1] - a[1]).map(([device, count]) => (
                            <div key={device} className="flex items-center gap-2">
                              {device === 'mobile' ? (
                                <Smartphone className="h-4 w-4 text-rose-500" />
                              ) : device === 'tablet' ? (
                                <Tablet className="h-4 w-4 text-orange-500" />
                              ) : (
                                <Monitor className="h-4 w-4 text-sky-500" />
                              )}
                              <div className="flex-1">
                                <div className="flex justify-between text-sm">
                                  <span className="capitalize">
                                    {device === 'desktop' ? t('admin.desktop') :
                                     device === 'mobile' ? t('admin.mobile') :
                                     device === 'tablet' ? t('admin.tablet') : device}
                                  </span>
                                  <span className="text-muted-foreground">{count} ({Math.round((count / total) * 100)}%)</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${
                                      device === 'mobile' ? 'bg-rose-500' :
                                      device === 'tablet' ? 'bg-orange-500' : 'bg-sky-500'
                                    }`}
                                    style={{ width: `${(count / total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Operating System */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Globe className="h-4 w-4 text-emerald-500" />
                          {t('admin.operatingSystem')}
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(osStats).sort((a, b) => b[1] - a[1]).map(([os, count]) => (
                            <div key={os} className="flex items-center gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center">
                                {os}
                              </Badge>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm">
                                  <span>{count} {t('admin.usersCount')}</span>
                                  <span className="text-muted-foreground">{Math.round((count / total) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                                  <div 
                                    className="h-full rounded-full bg-emerald-500 transition-all"
                                    style={{ width: `${(count / total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Browser */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Chrome className="h-4 w-4 text-amber-500" />
                          {t('admin.browser')}
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(browserStats).sort((a, b) => b[1] - a[1]).map(([browser, count]) => (
                            <div key={browser} className="flex items-center gap-2">
                              <Badge variant="outline" className="min-w-[70px] justify-center">
                                {browser}
                              </Badge>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm">
                                  <span>{count} {t('admin.usersCount')}</span>
                                  <span className="text-muted-foreground">{Math.round((count / total) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                                  <div 
                                    className="h-full rounded-full bg-amber-500 transition-all"
                                    style={{ width: `${(count / total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* User Location Map */}
          <UserLocationMap onlineUsers={onlineUsers} />

          {/* Page Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                {t('admin.pageStats')}
              </CardTitle>
              <CardDescription>
                {t('admin.pageStatsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {behaviorLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : pageViewStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.noPageViews')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('admin.pageName')}</TableHead>
                      <TableHead>{t('admin.viewCount')}</TableHead>
                      <TableHead>{t('admin.uniqueVisitors')}</TableHead>
                      <TableHead>{t('admin.totalTime')}</TableHead>
                      <TableHead>{t('admin.avgTime')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageViewStats.map((page, index) => (
                      <TableRow key={page.page_path}>
                        <TableCell>
                          <Badge variant={index < 3 ? 'default' : 'secondary'} className={
                            index === 0 ? 'bg-amber-500 hover:bg-amber-600' :
                            index === 1 ? 'bg-slate-400 hover:bg-slate-500' :
                            index === 2 ? 'bg-amber-700 hover:bg-amber-800' : ''
                          }>
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MousePointer className="h-3 w-3 text-primary" />
                            <span className="font-medium">{page.page_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg">{page.view_count}</span>
                          <span className="text-muted-foreground text-xs ml-1">{t('admin.views')}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-blue-500" />
                            <span className="font-medium">{page.unique_users}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-emerald-500" />
                            <span>{formatDuration(page.total_duration_seconds)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatDuration(page.avg_duration_seconds)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* User Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {t('admin.userActivity')}
              </CardTitle>
              <CardDescription>
                {t('admin.userActivityDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {behaviorLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : userPageActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.noUserActivity')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('admin.maskedUserId')}</TableHead>
                      <TableHead>{t('admin.maskedName')}</TableHead>
                      <TableHead>{t('admin.totalPageViews')}</TableHead>
                      <TableHead>{t('admin.totalTimeSpent')}</TableHead>
                      <TableHead>{t('admin.mostUsedFeature')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userPageActivity.map((user, index) => (
                      <TableRow key={user.masked_user_id}>
                        <TableCell>
                          <Badge variant={index < 3 ? 'default' : 'secondary'} className={
                            index === 0 ? 'bg-amber-500 hover:bg-amber-600' :
                            index === 1 ? 'bg-slate-400 hover:bg-slate-500' :
                            index === 2 ? 'bg-amber-700 hover:bg-amber-800' : ''
                          }>
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {user.masked_user_id}
                        </TableCell>
                        <TableCell>{user.masked_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Eye className="h-3 w-3 text-blue-500" />
                            <span className="font-bold text-lg">{user.total_page_views}</span>
                            <span className="text-muted-foreground text-xs">{t('admin.views')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-emerald-500" />
                            <span className="font-medium">{formatDuration(user.total_time_seconds)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <MousePointer className="h-3 w-3" />
                              {user.top_page}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ({user.top_page_views} {t('admin.views')})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  {t('admin.userBehaviorPrivacyNote')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Analytics Tab */}
        <TabsContent value="emailAnalytics" className="mt-6">
          <EmailAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="aiCache" className="mt-6">
          <AICacheAnalytics />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.deleteUserConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </Layout>
  );
};

export default Admin;