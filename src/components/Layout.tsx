import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { 
  LayoutDashboard, 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  LogOut,
  Menu,
  X,
  Calendar,
  Shield,
  Receipt,
  ShoppingCart,
  BarChart3,
  Brain,
  ScanLine,
  User,
  Eye,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Bitcoin,
  History,
  Settings,
  Landmark,
  Coins,
  Package
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePageTracking } from "@/hooks/usePageTracking";
import { usePresence } from "@/hooks/usePresence";
import { useTranslation } from "react-i18next";
import logoImage from "@/assets/logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'aiAdvisor', href: '/ai-advisor', icon: Brain, highlight: true },
  { name: 'accounts', href: '/accounts', icon: Wallet },
  { name: 'cards', href: '/cards', icon: CreditCard },
  { name: 'crypto', href: '/crypto', icon: Bitcoin },
  { name: 'currency', href: '/currency', icon: Coins },
  { name: 'transactions', href: '/transactions', icon: TrendingUp },
  { name: 'receiptHistory', href: '/receipt-history', icon: ScanLine },
  { name: 'productAnalysis', href: '/product-analysis', icon: Package },
  { name: 'fixedPayments', href: '/fixed-payments', icon: Receipt },
  { name: 'paymentHistory', href: '/payment-history', icon: History },
  { name: 'installments', href: '/installments', icon: ShoppingCart },
  { name: 'loans', href: '/loans', icon: Landmark },
  { name: 'reports', href: '/reports', icon: BarChart3 },
  { name: 'calendar', href: '/calendar', icon: Calendar },
  { name: 'family', href: '/family', icon: User },
  { name: 'settings', href: '/settings', icon: Settings },
  { name: 'admin', href: '/admin', icon: Shield },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [profileName, setProfileName] = useState<string | null>(null);
  const { signOut, user } = useAuth();
  const { isDemoMode, endDemo, demoData } = useDemo();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation();
  
  // Track page views
  usePageTracking();
  
  // Track user presence for real-time online users
  usePresence(location.pathname);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Fetch profile name from profiles table
  useEffect(() => {
    if (isDemoMode) {
      setProfileName(demoData.profile?.full_name || null);
      return;
    }
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await import("@/integrations/supabase/client").then(m => 
        m.supabase.from("profiles").select("full_name").eq("id", user.id).single()
      );
      if (data) {
        setProfileName(data.full_name);
      }
    };

    fetchProfile();

    // Subscribe to profile changes
    import("@/integrations/supabase/client").then(({ supabase }) => {
      const channel = supabase
        .channel('layout-profiles')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          () => {
            fetchProfile();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [user, isDemoMode, demoData]);

  const handleExitDemo = () => {
    endDemo();
    navigate('/');
  };

  const visibleNavigation = navigation.filter(item => 
    item.href !== '/admin' || (isAdmin && !isDemoMode)
  );

  // Use profile name from profiles table, fallback to user_metadata, then email
  const displayName = profileName || user?.user_metadata?.full_name || null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside 
          className={cn(
            "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:overflow-y-auto bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "lg:w-[72px]" : "lg:w-64"
          )}
        >
          <div className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border transition-all duration-300",
            sidebarCollapsed ? "px-3 justify-center" : "px-6"
          )}>
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="relative">
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br from-primary/30 to-teal-500/30 rounded-lg blur-sm group-hover:blur-md transition-all",
                  sidebarCollapsed ? "rounded-md" : "rounded-lg"
                )} />
                <img src={logoImage} alt="BudgetApp Logo" className={cn(
                  "relative object-contain transition-all duration-300 drop-shadow-md group-hover:scale-110",
                  sidebarCollapsed ? "h-9" : "h-11"
                )} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-bold bg-gradient-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent animate-fade-in">BudgetApp</span>
              )}
            </Link>
          </div>

          {isDemoMode && !sidebarCollapsed && (
            <div className="mx-4 mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-fade-in">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">{t('demo.modeActive')}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('demo.viewOnly')}</p>
            </div>
          )}

          <nav className={cn(
            "flex flex-col gap-1 flex-1 transition-all duration-300",
            sidebarCollapsed ? "p-2" : "p-4"
          )}>
            {visibleNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              const isHighlight = 'highlight' in item && item.highlight;
              
              const linkContent = (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                    sidebarCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isHighlight && !isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isHighlight && "text-primary",
                    !sidebarCollapsed && "group-hover:scale-110"
                  )} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="animate-fade-in">{t(`nav.${item.name}`)}</span>
                      {isHighlight && (
                        <span className="ml-auto flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </>
                  )}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {t(`nav.${item.name}`)}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>

          <div className={cn(
            "border-t border-sidebar-border space-y-2 transition-all duration-300",
            sidebarCollapsed ? "p-2" : "p-4"
          )}>
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between px-3 py-2 animate-fade-in">
                <span className="text-sm text-sidebar-foreground">{t('nav.theme')}</span>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            )}

            {sidebarCollapsed && (
              <div className="flex flex-col items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div><ThemeToggle /></div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('nav.theme')}</TooltipContent>
                </Tooltip>
              </div>
            )}

            {isDemoMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleExitDemo}
                    className={cn(
                      "text-amber-600 hover:bg-amber-500/10 hover:text-amber-700",
                      sidebarCollapsed ? "w-full justify-center p-3" : "w-full justify-start"
                    )}
                  >
                    <XCircle className={cn("h-5 w-5", !sidebarCollapsed && "mr-3")} />
                    {!sidebarCollapsed && t('demo.exit')}
                  </Button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">{t('demo.exit')}</TooltipContent>
                )}
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => signOut()}
                    className={cn(
                      "text-sidebar-foreground hover:bg-sidebar-accent",
                      sidebarCollapsed ? "w-full justify-center p-3" : "w-full justify-start"
                    )}
                  >
                    <LogOut className={cn("h-5 w-5", !sidebarCollapsed && "mr-3")} />
                    {!sidebarCollapsed && t('nav.logout')}
                  </Button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">{t('nav.logout')}</TooltipContent>
                )}
              </Tooltip>
            )}

            {/* Collapse Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "w-full text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200",
                sidebarCollapsed ? "justify-center p-3" : "justify-start"
              )}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <>
                  <ChevronLeft className="h-5 w-5 mr-3" />
                  <span className="text-sm">{t('nav.collapse') || 'Daralt'}</span>
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-header border-b border-header-border">
          <div className="flex h-16 items-center justify-between px-4">
            <Link to="/dashboard" className="flex items-center gap-2 group min-w-0">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-teal-500/30 rounded-md blur-sm" />
                <img src={logoImage} alt="BudgetApp Logo" className="relative h-9 object-contain drop-shadow-md" />
              </div>
              <span className="min-w-0 truncate text-lg font-bold bg-gradient-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                BudgetApp
              </span>
            </Link>
            <div className="flex flex-none items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-header-foreground"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <nav className="border-t border-sidebar-border bg-sidebar p-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto animate-fade-in">
              {/* User Profile Section */}
              <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-sidebar-accent/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {displayName 
                      ? displayName.charAt(0).toUpperCase() 
                      : user?.email?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {displayName || t('nav.user')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {visibleNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                const isHighlight = 'highlight' in item && item.highlight;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isHighlight && !isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", isHighlight && "text-primary")} />
                    {t(`nav.${item.name}`)}
                    {isHighlight && (
                      <span className="ml-auto flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </Link>
                );
              })}

              {/* Logout/Exit Demo button in mobile menu */}
              <div className="pt-2 mt-2 border-t border-sidebar-border">
                {isDemoMode ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleExitDemo();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                  >
                    <XCircle className="h-5 w-5 mr-3" />
                    {t('demo.exit')}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    {t('nav.logout')}
                  </Button>
                )}
              </div>
            </nav>
          )}
        </div>

        {/* Main content */}
        <main className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        )}>
          <div className="pt-20 lg:pt-0">
            <div className="hidden lg:flex items-center justify-between h-16 px-8 border-b border-header-border bg-header">
              <Link to="/dashboard" className="flex items-center gap-2 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-teal-500/30 rounded-md blur-sm group-hover:blur-md transition-all" />
                  <img src={logoImage} alt="BudgetApp Logo" className="relative h-9 object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent">BudgetApp</span>
              </Link>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
                <NotificationBell />
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};
