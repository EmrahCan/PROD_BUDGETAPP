import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { RealtimeChannel } from '@supabase/supabase-js';

// Device/Browser detection utilities
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  // Device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/Mobile|Android|iPhone|iPod/.test(ua) && !/iPad/.test(ua)) {
    deviceType = 'mobile';
  } else if (/iPad|Tablet|PlayBook/.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(ua))) {
    deviceType = 'tablet';
  }

  // Operating System
  let os = 'Unknown';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iOS|iPhone|iPad|iPod/.test(ua)) os = 'iOS';

  // Browser
  let browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
  else if (/Opera|OPR\//.test(ua)) browser = 'Opera';

  return { deviceType, os, browser };
};

export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
}

export interface PresenceUser {
  id: string;
  name: string;
  currentPage: string;
  lastSeen: string;
  isAdmin: boolean;
  sessionStart: string;
  pageHistory: { page: string; count: number }[];
  device: DeviceInfo;
}

export function usePresence(currentPage: string = '') {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sessionStartRef = useRef<string>(new Date().toISOString());
  const pageHistoryRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (isDemoMode || !user) return;

    const fetchProfileName = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      return data?.full_name || 'Kullanıcı';
    };

    const checkIsAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    };

    const setupPresence = async () => {
      const [name, isAdmin] = await Promise.all([fetchProfileName(), checkIsAdmin()]);

      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Update page history
      pageHistoryRef.current[currentPage] = (pageHistoryRef.current[currentPage] || 0) + 1;

      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          // Presence state synced
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            const pageHistory = Object.entries(pageHistoryRef.current)
              .map(([page, count]) => ({ page, count }))
              .sort((a, b) => b.count - a.count);

            await channel.track({
              id: user.id,
              name,
              currentPage,
              lastSeen: new Date().toISOString(),
              isAdmin,
              sessionStart: sessionStartRef.current,
              pageHistory,
              device: getDeviceInfo(),
            });
          }
        });

      channelRef.current = channel;
    };

    setupPresence();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, isDemoMode]);

  // Update presence when page changes
  useEffect(() => {
    if (isDemoMode || !user || !channelRef.current) return;

    // Update page history
    pageHistoryRef.current[currentPage] = (pageHistoryRef.current[currentPage] || 0) + 1;

    const updatePresence = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (channelRef.current) {
        const pageHistory = Object.entries(pageHistoryRef.current)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count);

        await channelRef.current.track({
          id: user.id,
          name: data?.full_name || 'Kullanıcı',
          currentPage,
          lastSeen: new Date().toISOString(),
          isAdmin: !!roleData,
          sessionStart: sessionStartRef.current,
          pageHistory,
          device: getDeviceInfo(),
        });
      }
    };

    updatePresence();
  }, [currentPage, user, isDemoMode]);
}

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'admin-viewer',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];

        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.id && presence.id !== 'admin-viewer') {
              users.push({
                id: presence.id,
                name: presence.name || 'Kullanıcı',
                currentPage: presence.currentPage || '-',
                lastSeen: presence.lastSeen || new Date().toISOString(),
                isAdmin: presence.isAdmin || false,
                sessionStart: presence.sessionStart || new Date().toISOString(),
                pageHistory: presence.pageHistory || [],
                device: presence.device || { deviceType: 'desktop', os: 'Unknown', browser: 'Unknown' },
              });
            }
          });
        });

        // Remove duplicates by user ID
        const uniqueUsers = users.reduce((acc, user) => {
          const existing = acc.find(u => u.id === user.id);
          if (!existing || new Date(user.lastSeen) > new Date(existing.lastSeen)) {
            return [...acc.filter(u => u.id !== user.id), user];
          }
          return acc;
        }, [] as PresenceUser[]);

        setOnlineUsers(uniqueUsers);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return onlineUsers;
}
