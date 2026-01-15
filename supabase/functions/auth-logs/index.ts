import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user via the JWT from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    console.log('Auth check:', { hasUser: !!user, authError: authError?.message });

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role key for privileged reads (never return sensitive user data)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check if caller is admin
    const { data: adminRole, error: adminRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminRoleError) {
      console.error('Error checking admin role:', adminRoleError);
      return new Response(JSON.stringify({ error: 'Failed to verify admin role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch real login events from login_events table
    const { data: loginEvents, error: eventsError } = await supabaseAdmin
      .from('login_events')
      .select('*')
      .order('login_at', { ascending: false })
      .limit(100);

    if (eventsError) {
      console.error('Error fetching login events:', eventsError);
      throw eventsError;
    }

    // Calculate session statistics
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all events for statistics calculation
    const { data: allRecentEvents } = await supabaseAdmin
      .from('login_events')
      .select('user_id, login_at, event_type')
      .gte('login_at', last7Days.toISOString())
      .order('login_at', { ascending: true });

    // Calculate active sessions (users who logged in but haven't logged out)
    const userLastEvents = new Map<string, { type: string; time: Date }>();
    allRecentEvents?.forEach(event => {
      userLastEvents.set(event.user_id, {
        type: event.event_type || 'login',
        time: new Date(event.login_at)
      });
    });

    let activeSessionsCount = 0;
    const activeSessions24h = new Set<string>();
    userLastEvents.forEach((event, userId) => {
      // Consider active if last event was login (not logout) and within last 24 hours
      if (event.type === 'login' && event.time >= last24Hours) {
        activeSessionsCount++;
        activeSessions24h.add(userId);
      }
    });

    // Calculate average session duration (from login to logout pairs)
    const userSessions: { userId: string; loginTime: Date; logoutTime?: Date }[] = [];
    const pendingLogins = new Map<string, Date>();

    allRecentEvents?.forEach(event => {
      const eventType = event.event_type || 'login';
      if (eventType === 'login') {
        pendingLogins.set(event.user_id, new Date(event.login_at));
      } else if (eventType === 'logout') {
        const loginTime = pendingLogins.get(event.user_id);
        if (loginTime) {
          userSessions.push({
            userId: event.user_id,
            loginTime,
            logoutTime: new Date(event.login_at)
          });
          pendingLogins.delete(event.user_id);
        }
      }
    });

    // Calculate average session duration in minutes
    let avgSessionDuration = 0;
    if (userSessions.length > 0) {
      const totalDuration = userSessions.reduce((sum, session) => {
        if (session.logoutTime) {
          return sum + (session.logoutTime.getTime() - session.loginTime.getTime());
        }
        return sum;
      }, 0);
      avgSessionDuration = Math.round(totalDuration / userSessions.length / 1000 / 60); // in minutes
    }

    // Count logins/logouts in last 24 hours
    const logins24h = allRecentEvents?.filter(e => 
      (e.event_type || 'login') === 'login' && new Date(e.login_at) >= last24Hours
    ).length || 0;
    
    const logouts24h = allRecentEvents?.filter(e => 
      e.event_type === 'logout' && new Date(e.login_at) >= last24Hours
    ).length || 0;

    // Unique users in last 24h and 7 days
    const uniqueUsers24h = new Set(
      allRecentEvents?.filter(e => new Date(e.login_at) >= last24Hours).map(e => e.user_id)
    ).size;
    
    const uniqueUsers7d = new Set(allRecentEvents?.map(e => e.user_id)).size;

    const sessionStats = {
      activeSessions: activeSessionsCount,
      avgSessionDurationMinutes: avgSessionDuration,
      logins24h,
      logouts24h,
      uniqueUsers24h,
      uniqueUsers7d,
      completedSessions: userSessions.length
    };

    // Calculate most active users (by login count in last 7 days)
    const userActivityCount = new Map<string, { logins: number; lastActive: Date }>();
    allRecentEvents?.forEach(event => {
      const eventType = event.event_type || 'login';
      const current = userActivityCount.get(event.user_id) || { logins: 0, lastActive: new Date(0) };
      
      if (eventType === 'login') {
        current.logins += 1;
      }
      
      const eventTime = new Date(event.login_at);
      if (eventTime > current.lastActive) {
        current.lastActive = eventTime;
      }
      
      userActivityCount.set(event.user_id, current);
    });

    // Sort by login count and get top 10
    const sortedUsers = Array.from(userActivityCount.entries())
      .sort((a, b) => b[1].logins - a[1].logins)
      .slice(0, 10);

    // Fetch profiles for masking names
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name');

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    // Fetch user roles
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    const roleMap = new Map<string, string[]>();
    userRoles?.forEach(r => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    // Transform to masked format
    const loginLogs = loginEvents?.map(event => {
      const fullName = profileMap.get(event.user_id);
      const roles = roleMap.get(event.user_id) || [];
      
      // Mask IP address - show first two octets only
      let maskedIp = '***.***.***.***';
      if (event.ip_address && event.ip_address !== 'unknown') {
        const parts = event.ip_address.split('.');
        if (parts.length === 4) {
          maskedIp = `${parts[0]}.${parts[1]}.***.***`;
        }
      }

      return {
        id: event.id,
        masked_user_id: event.user_id.substring(0, 8) + '...',
        masked_name: fullName 
          ? `${fullName.charAt(0)}${'*'.repeat(Math.min(fullName.length - 1, 5))}`
          : 'Anonymous',
        login_at: event.login_at,
        event_type: event.event_type || 'login',
        masked_ip: maskedIp,
        country_code: event.country_code,
        city: event.city,
        is_suspicious: event.is_suspicious,
        suspicious_reason: event.suspicious_reason,
        is_admin: roles.includes('admin'),
      };
    }) || [];

    // Fetch suspicious activity alerts
    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('suspicious_activity_alerts')
      .select('*')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
    }

    // Mask alerts data
    const maskedAlerts = alerts?.map(alert => {
      const fullName = profileMap.get(alert.user_id);
      return {
        id: alert.id,
        masked_user_id: alert.user_id.substring(0, 8) + '...',
        masked_name: fullName 
          ? `${fullName.charAt(0)}${'*'.repeat(Math.min(fullName.length - 1, 5))}`
          : 'Anonymous',
        alert_type: alert.alert_type,
        severity: alert.severity,
        description: alert.description,
        created_at: alert.created_at,
        is_resolved: alert.is_resolved,
      };
    }) || [];

    // Create masked top active users list
    const topActiveUsers = sortedUsers.map(([userId, activity]) => {
      const fullName = profileMap.get(userId);
      const roles = roleMap.get(userId) || [];
      
      return {
        masked_user_id: userId.substring(0, 8) + '...',
        masked_name: fullName 
          ? `${fullName.charAt(0)}${'*'.repeat(Math.min(fullName.length - 1, 5))}`
          : 'Anonymous',
        login_count: activity.logins,
        last_active: activity.lastActive.toISOString(),
        is_admin: roles.includes('admin'),
      };
    });

    // Fetch transaction statistics - top categories (last 30 days)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: transactionStats } = await supabaseAdmin
      .from('transactions')
      .select('category, transaction_type, amount')
      .gte('transaction_date', last30Days.toISOString().split('T')[0]);

    // Calculate category statistics
    const categoryStats = new Map<string, { count: number; total: number; type: string }>();
    transactionStats?.forEach(tx => {
      const key = `${tx.category}-${tx.transaction_type}`;
      const current = categoryStats.get(key) || { count: 0, total: 0, type: tx.transaction_type };
      current.count += 1;
      current.total += Number(tx.amount);
      categoryStats.set(key, current);
    });

    // Sort by count and get top 10
    const topCategories = Array.from(categoryStats.entries())
      .map(([key, stats]) => ({
        category: key.split('-')[0],
        transaction_type: stats.type,
        transaction_count: stats.count,
        total_amount_masked: stats.total > 10000 ? '10K+' : stats.total > 5000 ? '5K+' : stats.total > 1000 ? '1K+' : '<1K'
      }))
      .sort((a, b) => b.transaction_count - a.transaction_count)
      .slice(0, 10);

    // Transaction type breakdown
    const expenseCount = transactionStats?.filter(tx => tx.transaction_type === 'expense').length || 0;
    const incomeCount = transactionStats?.filter(tx => tx.transaction_type === 'income').length || 0;
    const transferCount = transactionStats?.filter(tx => tx.transaction_type === 'transfer').length || 0;

    const transactionReport = {
      topCategories,
      summary: {
        totalTransactions: transactionStats?.length || 0,
        expenseCount,
        incomeCount,
        transferCount,
        period: '30 days'
      }
    };

    // Calculate user-based transaction statistics - which user does what the most
    const userTransactionStats = new Map<string, Map<string, { count: number; type: string }>>();
    
    transactionStats?.forEach(tx => {
      // We need user_id for this - fetch transactions with user_id
    });

    // Fetch transactions with user_id for user-based stats
    const { data: userTransactions } = await supabaseAdmin
      .from('transactions')
      .select('user_id, category, transaction_type')
      .gte('transaction_date', last30Days.toISOString().split('T')[0]);

    // Build user transaction map
    const userCategoryMap = new Map<string, Map<string, { count: number; type: string }>>();
    
    userTransactions?.forEach(tx => {
      if (!userCategoryMap.has(tx.user_id)) {
        userCategoryMap.set(tx.user_id, new Map());
      }
      const userStats = userCategoryMap.get(tx.user_id)!;
      const key = `${tx.category}-${tx.transaction_type}`;
      const current = userStats.get(key) || { count: 0, type: tx.transaction_type };
      current.count += 1;
      userStats.set(key, current);
    });

    // Find top category for each user and rank users
    const userTopCategories: { 
      userId: string; 
      topCategory: string; 
      transactionType: string;
      count: number; 
      totalTransactions: number;
    }[] = [];

    userCategoryMap.forEach((categories, userId) => {
      let topCategory = '';
      let topType = '';
      let maxCount = 0;
      let totalTx = 0;

      categories.forEach((stats, key) => {
        totalTx += stats.count;
        if (stats.count > maxCount) {
          maxCount = stats.count;
          topCategory = key.split('-')[0];
          topType = stats.type;
        }
      });

      if (topCategory) {
        userTopCategories.push({
          userId,
          topCategory,
          transactionType: topType,
          count: maxCount,
          totalTransactions: totalTx
        });
      }
    });

    // Sort by total transactions and get top 10
    const topUsersByTransactions = userTopCategories
      .sort((a, b) => b.totalTransactions - a.totalTransactions)
      .slice(0, 10)
      .map(user => {
        const fullName = profileMap.get(user.userId);
        const roles = roleMap.get(user.userId) || [];
        
        return {
          masked_user_id: user.userId.substring(0, 8) + '...',
          masked_name: fullName 
            ? `${fullName.charAt(0)}${'*'.repeat(Math.min(fullName.length - 1, 5))}`
            : 'Anonymous',
          top_category: user.topCategory,
          top_category_type: user.transactionType,
          top_category_count: user.count,
          total_transactions: user.totalTransactions,
          is_admin: roles.includes('admin'),
        };
      });

    return new Response(JSON.stringify({ 
      logs: loginLogs,
      alerts: maskedAlerts,
      sessionStats,
      topActiveUsers,
      transactionReport,
      topUsersByTransactions,
      note: 'User data and IP addresses are masked for privacy compliance'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching auth logs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
