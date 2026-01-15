import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { supabase } from '@/integrations/supabase/client';

// Page name mapping
const pageNameMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ai-advisor': 'AI Danışman',
  '/accounts': 'Hesaplar',
  '/cards': 'Kartlar',
  '/crypto': 'Kripto',
  '/currency': 'Döviz',
  '/transactions': 'İşlemler',
  '/receipt-history': 'Fiş Geçmişi',
  '/product-analysis': 'Ürün Analizi',
  '/fixed-payments': 'Sabit Ödemeler',
  '/payment-history': 'Ödeme Geçmişi',
  '/installments': 'Taksitler',
  '/loans': 'Krediler',
  '/reports': 'Raporlar',
  '/calendar': 'Takvim',
  '/family': 'Aile',
  '/settings': 'Ayarlar',
  '/admin': 'Admin',
};

export function usePageTracking() {
  const location = useLocation();
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const pageViewIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Don't track in demo mode or for non-authenticated users
    if (isDemoMode || !user) return;

    const currentPath = location.pathname;
    const pageName = pageNameMap[currentPath] || currentPath;

    // Save duration for previous page
    const savePreviousPageDuration = async () => {
      if (pageViewIdRef.current) {
        const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (durationSeconds > 0) {
          await supabase
            .from('page_views')
            .update({ duration_seconds: durationSeconds })
            .eq('id', pageViewIdRef.current);
        }
      }
    };

    // Track new page view
    const trackPageView = async () => {
      await savePreviousPageDuration();
      
      startTimeRef.current = Date.now();
      
      const { data, error } = await supabase
        .from('page_views')
        .insert({
          user_id: user.id,
          page_path: currentPath,
          page_name: pageName,
          session_id: sessionIdRef.current,
        })
        .select('id')
        .single();

      if (!error && data) {
        pageViewIdRef.current = data.id;
      }
    };

    trackPageView();

    // Save duration when leaving the page
    return () => {
      savePreviousPageDuration();
    };
  }, [location.pathname, user, isDemoMode]);

  // Save duration on page unload
  useEffect(() => {
    if (isDemoMode || !user) return;

    const handleBeforeUnload = async () => {
      if (pageViewIdRef.current) {
        const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        // Use navigator.sendBeacon for reliable tracking on page close
        const data = JSON.stringify({
          id: pageViewIdRef.current,
          duration_seconds: durationSeconds,
        });
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/page_views?id=eq.${pageViewIdRef.current}`,
          data
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, isDemoMode]);
}
