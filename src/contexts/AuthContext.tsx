import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthSessionInvalid = (msg: string) =>
    /Auth session missing|session_not_found|invalid jwt|jwt expired/i.test(msg);

  const handleInvalidSession = async (reason?: string) => {
    console.warn('Geçersiz oturum tespit edildi:', reason);

    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setLoading(false);
      toast.error('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
      navigate('/auth', { replace: true });
    }
  };

  const validateSession = async (session: Session | null) => {
    if (!session?.access_token) return false;

    const { error } = await supabase.auth.getUser(session.access_token);
    if (error) {
      const msg = error.message ?? String(error);
      if (isAuthSessionInvalid(msg)) {
        await handleInvalidSession(msg);
      }
      return false;
    }

    return true;
  };

  // Log auth event to backend (best-effort)
  const logAuthEvent = async (eventType: 'login' | 'logout') => {
    try {
      const { error } = await supabase.functions.invoke('log-login', {
        body: { eventType }
      });

      if (error) {
        const msg = (error as any)?.message ?? String(error);
        if (isAuthSessionInvalid(msg) || /Unauthorized/i.test(msg)) {
          if (eventType === 'login') {
            await handleInvalidSession(msg);
          }
          return;
        }
        console.error(`Failed to log ${eventType} event:`, error);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isAuthSessionInvalid(msg) || /Unauthorized/i.test(msg)) {
        if (eventType === 'login') {
          await handleInvalidSession(msg);
        }
        return;
      }
      console.error(`Failed to log ${eventType} event:`, error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Validate session (clears broken sessions) then log once
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        void (async () => {
          const ok = await validateSession(session);
          if (ok) await logAuthEvent('login');
        })();
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session) {
        void validateSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      navigate('/dashboard');
    }
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    // Get current language for welcome email
    const currentLanguage = localStorage.getItem('i18nextLng') || 'en';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (!error && data?.user) {
      // Send welcome email in user's language (fire and forget)
      supabase.functions.invoke('welcome-email', {
        body: {
          userId: data.user.id,
          userEmail: email,
          userName: fullName,
          language: currentLanguage
        }
      }).catch(err => console.error('Welcome email failed:', err));
      
      navigate('/dashboard');
    }
    return { error };
  };

  const signOut = async () => {
    // Log logout event before signing out (best-effort)
    try {
      await logAuthEvent('logout');
    } catch (e) {
      console.error('Failed to log logout:', e);
    }
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
