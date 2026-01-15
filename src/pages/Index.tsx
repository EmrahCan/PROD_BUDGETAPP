import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  Shield, 
  ArrowRight, 
  CreditCard, 
  PieChart, 
  Bell, 
  Calendar,
  CheckCircle2,
  Star,
  Brain,
  ScanLine,
  Sparkles,
  Play,
  Users,
  Trophy,
  Target,
  Smartphone,
  Mail,
  Wallet,
  BarChart3,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X,
  Linkedin
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useDemo } from "@/contexts/DemoContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useScrollPosition } from "@/hooks/useParallax";
import {
  AnimatedGradientBackground,
  AnimatedBlob,
  MorphingBlob,
  ParallaxElement,
  MouseParallaxElement,
  GlowingOrb,
  GridPattern
} from "@/components/landing/AnimatedBackground";
import logoImage from "@/assets/logo.png";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import dashboardDemoVideo from "@/assets/dashboard-demo-hq.mp4";

// Animated Section Wrapper
const AnimatedSection = ({ 
  children, 
  className = "",
  animation = "fade-in"
}: { 
  children: React.ReactNode; 
  className?: string;
  animation?: "fade-in" | "fade-in-left" | "fade-in-right" | "scale-in" | "slide-up";
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <div 
      ref={ref}
      className={`${className} ${isVisible ? `animate-${animation}` : 'opacity-0'}`}
    >
      {children}
    </div>
  );
};

// Staggered Animation Container
const StaggeredContainer = ({ 
  children, 
  className = "",
  staggerDelay = 100
}: { 
  children: React.ReactNode[]; 
  className?: string;
  staggerDelay?: number;
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div 
          key={index}
          className={`${isVisible ? 'animate-slide-up' : 'opacity-0'}`}
          style={{ animationDelay: `${index * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

import { useState } from "react";

const Index = () => {
  const { t } = useTranslation();
  const { startDemo } = useDemo();
  const navigate = useNavigate();
  const { scrollY, scrollProgress } = useScrollPosition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleWatchDemo = () => {
    startDemo();
    navigate('/dashboard');
  };

  // Core Features
  const coreFeatures = [
    {
      icon: Brain,
      title: t('landing.features.aiAdvisor'),
      description: t('landing.features.aiAdvisorDesc'),
      color: "from-violet-500 to-purple-600",
      badge: "AI"
    },
    {
      icon: ScanLine,
      title: t('landing.features.receiptScanner'),
      description: t('landing.features.receiptScannerDesc'),
      color: "from-cyan-500 to-blue-600",
      badge: "AI"
    }
  ];

  // All Features Grid
  const allFeatures = [
    { icon: Wallet, title: t('landing.features.accountManagement'), description: t('landing.features.accountManagementDesc'), iconColor: "text-teal-500" },
    { icon: CreditCard, title: t('landing.features.creditCards'), description: t('landing.features.creditCardsDesc'), iconColor: "text-indigo-500" },
    { icon: TrendingUp, title: t('landing.features.incomeExpense'), description: t('landing.features.incomeExpenseDesc'), iconColor: "text-emerald-500" },
    { icon: Target, title: t('landing.features.savingsGoals'), description: t('landing.features.savingsGoalsDesc'), iconColor: "text-amber-500" },
    { icon: BarChart3, title: t('landing.features.budgetLimits'), description: t('landing.features.budgetLimitsDesc'), iconColor: "text-rose-500" },
    { icon: Users, title: t('landing.features.familySharing'), description: t('landing.features.familySharingDesc'), iconColor: "text-blue-500" },
    { icon: Calendar, title: t('landing.features.calendar'), description: t('landing.features.calendarDesc'), iconColor: "text-purple-500" },
    { icon: PieChart, title: t('landing.features.reports'), description: t('landing.features.reportsDesc'), iconColor: "text-pink-500" }
  ];

  // New Features
  const newFeatures = [
    { icon: Trophy, title: t('landing.newFeatures.badges'), description: t('landing.newFeatures.badgesDesc'), color: "from-amber-400 to-orange-500" },
    { icon: Smartphone, title: t('landing.newFeatures.pwa'), description: t('landing.newFeatures.pwaDesc'), color: "from-blue-400 to-cyan-500" },
    { icon: Bell, title: t('landing.newFeatures.push'), description: t('landing.newFeatures.pushDesc'), color: "from-rose-400 to-pink-500" },
    { icon: Mail, title: t('landing.newFeatures.email'), description: t('landing.newFeatures.emailDesc'), color: "from-emerald-400 to-teal-500" }
  ];

  const stats = [
    { value: "256-bit", label: t('landing.stats.encryption'), icon: Shield },
    { value: "1M+", label: t('landing.stats.transactions') },
    { value: "99.9%", label: t('landing.stats.uptime') },
    { value: "100%", label: t('landing.stats.free'), icon: CheckCircle2 }
  ];

  const benefits = [
    t('landing.benefits.easySetup'),
    t('landing.benefits.visualReports'),
    t('landing.benefits.autoCategories'),
    t('landing.benefits.multiAccount'),
    t('landing.benefits.mobileReady'),
    t('landing.benefits.support')
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-primary z-[60] transition-all duration-150"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 50 
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group min-w-0">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-teal-500/30 rounded-xl blur-md group-hover:blur-lg transition-all" />
                <img 
                  src={logoImage} 
                  alt="BudgetApp Logo" 
                  className="relative w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-lg" 
                />
              </div>
              <span className="min-w-0 truncate text-2xl font-bold bg-gradient-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent drop-shadow-sm">
                BudgetApp
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <Link to="/auth">
                <Button variant="ghost" size="sm">{t('landing.signIn')}</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">{t('landing.startFree')}</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2 flex-none">
              <LanguageSwitcher />
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border shadow-lg animate-fade-in">
              <div className="flex flex-col p-4 gap-3">
                <div className="flex items-center justify-center gap-3 pb-3 border-b border-border">
                  <LanguageSwitcher />
                </div>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-center">{t('landing.signIn')}</Button>
                </Link>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">{t('landing.startFree')}</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section with Animated Gradient */}
      <section className="relative pt-24 pb-8 lg:pt-32 lg:pb-12 overflow-hidden min-h-[75vh] flex items-center">
        {/* Animated Gradient Background */}
        <AnimatedGradientBackground />
        
        {/* Grid Pattern */}
        <GridPattern />
        
        {/* Animated Blobs */}
        <AnimatedBlob color="primary" size="xl" className="top-10 left-[5%]" delay={0} />
        <AnimatedBlob color="violet" size="lg" className="top-32 right-[10%]" delay={2} />
        <AnimatedBlob color="cyan" size="md" className="bottom-20 left-[20%]" delay={4} />
        <AnimatedBlob color="amber" size="lg" className="bottom-10 right-[15%]" delay={1} />
        
        {/* Morphing Blobs */}
        <MorphingBlob color="primary" className="top-1/4 left-1/4 opacity-50" />
        <MorphingBlob color="violet" className="bottom-1/4 right-1/4 opacity-40" />
        
        {/* Glowing Orbs (mouse-following) */}
        <GlowingOrb color="primary" size="md" className="top-40 right-[25%] hidden lg:block" />
        <GlowingOrb color="violet" size="sm" className="top-60 left-[20%] hidden lg:block" />
        <GlowingOrb color="amber" size="lg" className="bottom-40 right-[30%] hidden lg:block" />
        
        {/* Floating geometric shapes with mouse parallax */}
        <MouseParallaxElement sensitivity={0.03} className="absolute top-32 right-[20%] w-4 h-4 bg-primary/40 rounded-full hidden lg:block" />
        <MouseParallaxElement sensitivity={0.05} className="absolute top-48 left-[15%] w-6 h-6 bg-violet-500/40 rounded-lg rotate-45 hidden lg:block" />
        <MouseParallaxElement sensitivity={0.02} className="absolute bottom-40 right-[25%] w-8 h-8 border-2 border-amber-500/40 rounded-full hidden lg:block" />
        <MouseParallaxElement sensitivity={0.04} className="absolute top-60 left-[25%] w-3 h-3 bg-emerald-500/50 rounded-full hidden lg:block" />
        <MouseParallaxElement sensitivity={0.06} className="absolute bottom-32 left-[10%] w-5 h-5 border-2 border-primary/40 rounded-lg rotate-12 hidden lg:block" />
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm text-primary px-4 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-default border border-primary/20">
                <Zap className="w-4 h-4" />
                {t('landing.badge')}
              </div>
              <div className="inline-flex items-center gap-2 bg-violet-500/10 backdrop-blur-sm text-violet-600 dark:text-violet-400 px-4 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-default border border-violet-500/20">
                <Brain className="w-4 h-4 animate-pulse" />
                {t('landing.aiSection.badge')}
              </div>
              <div className="inline-flex items-center gap-2 bg-amber-500/10 backdrop-blur-sm text-amber-600 dark:text-amber-400 px-4 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-default border border-amber-500/20">
                <Sparkles className="w-4 h-4" />
                {t('landing.newFeatures.badge')}
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight animate-fade-in" style={{ animationDelay: '100ms' }}>
              <span className="bg-gradient-hero bg-clip-text text-transparent drop-shadow-sm">{t('landing.heroTitle1')}</span>
              <br />
              <span className="text-foreground">{t('landing.heroTitle2')}</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
              {t('landing.heroDescription')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Link to="/auth">
                <Button size="lg" className="gap-2 text-lg px-8 h-14 shadow-large hover:shadow-xl hover:scale-105 transition-all w-full sm:w-auto">
                  {t('landing.createAccount')}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2 text-lg px-8 h-14 w-full sm:w-auto hover:scale-105 transition-transform backdrop-blur-sm bg-background/50"
                onClick={handleWatchDemo}
              >
                <Play className="h-5 w-5" />
                {t('landing.watchDemo')}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Gradient fade to content */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-muted/30 border-y border-border relative overflow-hidden">
        <ParallaxElement speed={-0.05} className="absolute -top-10 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <StaggeredContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={100}>
            {stats.map((stat, i) => (
              <div key={i} className="text-center group cursor-default">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-3xl lg:text-4xl font-bold text-foreground group-hover:scale-110 transition-transform">{stat.value}</span>
                  {stat.icon && <Star className="w-6 h-6 text-amber-500 fill-amber-500 group-hover:animate-pulse" />}
                </div>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </StaggeredContainer>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-12 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30" />
        <div className="max-w-6xl mx-auto px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-bold mb-3">
              {t('landing.mockupSection.title')} <span className="bg-gradient-primary bg-clip-text text-transparent">{t('landing.mockupSection.titleHighlight')}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {t('landing.mockupSection.subtitle')}
            </p>
          </AnimatedSection>

          <AnimatedSection animation="scale-in" className="max-w-5xl mx-auto">
            <div className="relative group">
              {/* Browser frame */}
              <div className="bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
                {/* Browser header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2 bg-background px-4 py-1.5 rounded-lg text-sm text-muted-foreground">
                      <div className="w-3 h-3 rounded-full bg-green-500/70" />
                      budgetapp.site/dashboard
                    </div>
                  </div>
                </div>
                {/* Dashboard image */}
                <img
                  src={dashboardMockup}
                  alt="BudgetApp Dashboard"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-teal-500/20 to-emerald-500/20 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-10 lg:py-14 bg-muted/30 relative overflow-hidden">
        <ParallaxElement speed={-0.08} className="absolute -top-20 left-[20%] w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />
        <ParallaxElement speed={-0.12} className="absolute bottom-10 right-[10%] w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              {t('landing.aiSection.badge')}
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              {t('landing.aiSection.title')} <span className="bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">{t('landing.aiSection.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('landing.aiSection.subtitle')}</p>
          </AnimatedSection>

          <StaggeredContainer className="grid md:grid-cols-2 gap-6" staggerDelay={150}>
            {coreFeatures.map((feature, i) => (
              <div key={i} className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                <div className="relative p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <span className="inline-flex items-center gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-full text-xs font-medium">
                      <Sparkles className="h-3 w-3" />
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </StaggeredContainer>
        </div>
      </section>

      {/* New Features Section */}
      <section className="py-10 lg:py-14 relative overflow-hidden">
        <ParallaxElement speed={-0.1} className="absolute top-10 -right-10 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl" />
        <ParallaxElement speed={-0.06} className="absolute bottom-10 left-[5%] w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              {t('landing.newFeatures.badge')}
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              {t('landing.newFeatures.title')} <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">{t('landing.newFeatures.titleHighlight')}</span> {t('landing.newFeatures.titleEnd')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('landing.newFeatures.subtitle')}</p>
          </AnimatedSection>

          <StaggeredContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={100}>
            {newFeatures.map((feature, i) => (
              <div key={i} className="group bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary/50 hover:-translate-y-2 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </StaggeredContainer>
        </div>
      </section>

      {/* All Features Grid */}
      <section className="py-10 lg:py-14 bg-muted/30 relative overflow-hidden">
        <ParallaxElement speed={-0.08} className="absolute -top-10 right-[30%] w-56 h-56 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-8">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              {t('landing.features.title')} <span className="bg-gradient-primary bg-clip-text text-transparent">{t('landing.features.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('landing.features.subtitle')}</p>
          </AnimatedSection>

          <StaggeredContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={75}>
            {allFeatures.map((feature, i) => (
              <div key={i} className="group bg-card p-6 rounded-xl border border-border hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                  <feature.icon className={`h-6 w-6 ${feature.iconColor} group-hover:scale-110 transition-transform`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </StaggeredContainer>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-10 lg:py-14 relative overflow-hidden">
        <ParallaxElement speed={-0.12} className="absolute top-20 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
        <ParallaxElement speed={-0.08} className="absolute bottom-10 right-[20%] w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <AnimatedSection animation="fade-in-left">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6">
                {t('landing.benefits.title')} <span className="bg-gradient-primary bg-clip-text text-transparent">{t('landing.benefits.titleHighlight')}</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">{t('landing.benefits.description')}</p>
              
              <div className="space-y-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 group cursor-default hover:translate-x-2 transition-transform">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-foreground font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link to="/auth">
                  <Button size="lg" className="gap-2 hover:scale-105 transition-transform">
                    {t('landing.cta.button')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
            
            <AnimatedSection animation="fade-in-right" className="relative">
              <MouseParallaxElement sensitivity={0.015} className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-card rounded-3xl p-8 border border-border shadow-large hover:shadow-xl transition-shadow duration-500 animate-float">
                <div className="flex items-center gap-4 mb-6">
                  <img src={logoImage} alt="BudgetApp" className="w-16 h-16 hover:scale-110 transition-transform" />
                  <div>
                    <h3 className="text-2xl font-bold">BudgetApp</h3>
                    <p className="text-muted-foreground">{t('landing.benefits.smartBudget')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-primary rounded-full" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('landing.benefits.monthlyBudget')}</span>
                    <span className="font-medium">₺18,200 / ₺25,000</span>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {[
                    { label: t('landing.mockup.food'), value: "₺2,400", pct: 75 },
                    { label: t('landing.mockup.transport'), value: "₺1,200", pct: 45 },
                    { label: t('landing.mockup.bills'), value: "₺3,500", pct: 90 }
                  ].map((cat, i) => (
                    <div key={i} className="text-center group cursor-default">
                      <div className="w-full h-2 bg-muted rounded-full mb-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 group-hover:opacity-80 ${cat.pct > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${cat.pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{cat.label}</p>
                      <p className="text-sm font-medium group-hover:scale-110 transition-transform">{cat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <AnimatedSection animation="scale-in" className="py-10 lg:py-14 relative overflow-hidden">
        <ParallaxElement speed={-0.1} className="absolute -top-20 left-[40%] w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto px-6 lg:px-8 relative">
          <div className="relative bg-gradient-hero rounded-3xl p-8 lg:p-12 text-center overflow-hidden hover:shadow-2xl transition-shadow duration-500">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="relative">
              <img src={logoImage} alt="BudgetApp" className="w-20 h-20 mx-auto mb-6 drop-shadow-lg hover:scale-110 transition-transform animate-float" />
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">{t('landing.cta.title')}</h2>
              <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">{t('landing.cta.description')}</p>
              <div className="flex justify-center">
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="gap-2 bg-white text-primary hover:bg-white/90 shadow-xl hover:scale-105 transition-transform">
                    {t('landing.cta.button')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-teal-500/20 rounded-lg blur-sm group-hover:blur-md transition-all" />
                <img src={logoImage} alt="BudgetApp Logo" className="relative w-11 h-11 group-hover:scale-110 transition-all duration-300 drop-shadow-md" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent">BudgetApp</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground hover:scale-105 transition-all">{t('landing.footer.privacy')}</Link>
              <Link to="/terms" className="hover:text-foreground hover:scale-105 transition-all">{t('landing.footer.terms')}</Link>
              <Link to="/contact" className="hover:text-foreground hover:scale-105 transition-all">{t('landing.footer.contact')}</Link>
              <a 
                href="https://www.linkedin.com/company/buggetapp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary hover:scale-110 transition-all"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
            
            <p className="text-muted-foreground text-sm">{t('landing.footer.rights')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
