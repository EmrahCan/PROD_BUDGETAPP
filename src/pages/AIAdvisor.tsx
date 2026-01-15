import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, Sparkles, TrendingUp, Target, MessageSquare, Lightbulb, ChevronDown, ChevronUp, Zap, MessagesSquare, AlertCircle, Loader2, WifiOff, CreditCard, CheckCircle2, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { FinancialChat } from "@/components/ai/FinancialChat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FinancialSummary {
  totalBalance: number;
  totalCardDebt: number;
  netStatus: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  savingsRate: string;
  debtToAssetRatio: string;
  totalMonthlyObligations: number;
  hasOverduePayments: boolean;
  overdueCount: number;
  topCategories: Array<{
    category: string;
    amount: number;
    changePercent: string;
  }>;
  goalsProgress: Array<{
    name: string;
    target: number;
    current: number;
    progress: string;
  }>;
}

interface GoalSuggestion {
  name: string;
  amount: number;
  months: number;
  reason: string;
}

const AIAdvisor = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const [insight, setInsight] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [goalSuggestions, setGoalSuggestions] = useState<GoalSuggestion[]>([]);
  const [existingGoals, setExistingGoals] = useState<Array<{ id: string; name: string; target_amount: number; current_amount: number; deadline: string | null; is_completed: boolean }>>([]);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [loadingExistingGoals, setLoadingExistingGoals] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [insightError, setInsightError] = useState<{ type: 'rate_limit' | 'credits' | 'network' | 'general'; message: string } | null>(null);
  const [goalsError, setGoalsError] = useState<{ type: 'rate_limit' | 'credits' | 'network' | 'general'; message: string } | null>(null);
  const [hasFetchedInsight, setHasFetchedInsight] = useState(false);
  const [editingGoal, setEditingGoal] = useState<{ id: string; name: string; target_amount: number; deadline: string | null } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', target_amount: '', deadline: '' });

  // Fetch existing savings goals
  const fetchExistingGoals = async () => {
    if (!user) return;
    setLoadingExistingGoals(true);
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoadingExistingGoals(false);
    }
  };

  // Auto-fetch existing goals when switching to suggestions tab
  useEffect(() => {
    if (activeTab === 'suggestions' && user) {
      fetchExistingGoals();
    }
  }, [activeTab, user]);

  const [isCached, setIsCached] = useState(false);

  const fetchInsight = async (skipCache = false) => {
    if (!user) return;
    
    setLoadingInsight(true);
    setInsightError(null);
    try {
      const { data, error } = await supabase.functions.invoke('financial-insights', {
        body: { language: i18n.language, type: 'insight', skipCache }
      });

      if (error) {
        console.error('Error fetching insights:', error);
        if (error.message?.includes('429')) {
          setInsightError({ 
            type: 'rate_limit', 
            message: i18n.language === 'tr' 
              ? 'Çok fazla istek gönderildi. Lütfen 1 dakika bekleyip tekrar deneyin.' 
              : 'Too many requests. Please wait 1 minute and try again.' 
          });
        } else if (error.message?.includes('402')) {
          setInsightError({ 
            type: 'credits', 
            message: i18n.language === 'tr' 
              ? 'AI kredileri tükendi. Ayarlar → Çalışma Alanı → Kullanım bölümünden kredi ekleyebilirsiniz.' 
              : 'AI credits exhausted. Add credits from Settings → Workspace → Usage.' 
          });
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          setInsightError({ 
            type: 'network', 
            message: i18n.language === 'tr' 
              ? 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.' 
              : 'Connection error. Check your internet and try again.' 
          });
        } else {
          setInsightError({ 
            type: 'general', 
            message: i18n.language === 'tr' 
              ? 'Analiz yüklenirken bir hata oluştu. Lütfen tekrar deneyin.' 
              : 'Error loading analysis. Please try again.' 
          });
        }
        return;
      }

      setInsight(data.insight);
      setSummary(data.summary);
      setIsCached(data.cached === true);
      
      if (data.cached) {
        toast.success(i18n.language === 'tr' ? 'Önbellekten yüklendi!' : 'Loaded from cache!');
      } else {
        toast.success(i18n.language === 'tr' ? 'Analiz tamamlandı!' : 'Analysis complete!');
      }
    } catch (error) {
      console.error('Error:', error);
      setInsightError({ 
        type: 'general', 
        message: i18n.language === 'tr' 
          ? 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' 
          : 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setLoadingInsight(false);
    }
  };

  const fetchGoalSuggestions = async () => {
    if (!user) return;
    
    setLoadingGoals(true);
    setGoalsError(null);
    try {
      const { data, error } = await supabase.functions.invoke('financial-insights', {
        body: { language: i18n.language, type: 'goal-suggestion' }
      });

      if (error) {
        console.error('Error fetching goal suggestions:', error);
        if (error.message?.includes('429')) {
          setGoalsError({ 
            type: 'rate_limit', 
            message: i18n.language === 'tr' 
              ? 'Çok fazla istek gönderildi. Lütfen 1 dakika bekleyip tekrar deneyin.' 
              : 'Too many requests. Please wait 1 minute and try again.' 
          });
        } else if (error.message?.includes('402')) {
          setGoalsError({ 
            type: 'credits', 
            message: i18n.language === 'tr' 
              ? 'AI kredileri tükendi. Ayarlar → Çalışma Alanı → Kullanım bölümünden kredi ekleyebilirsiniz.' 
              : 'AI credits exhausted. Add credits from Settings → Workspace → Usage.' 
          });
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          setGoalsError({ 
            type: 'network', 
            message: i18n.language === 'tr' 
              ? 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.' 
              : 'Connection error. Check your internet and try again.' 
          });
        } else {
          setGoalsError({ 
            type: 'general', 
            message: i18n.language === 'tr' 
              ? 'Öneriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.' 
              : 'Error loading suggestions. Please try again.' 
          });
        }
        return;
      }

      setGoalSuggestions(data.suggestions || []);
      if (data.summary) setSummary(data.summary);
      toast.success(i18n.language === 'tr' ? 'Hedef önerileri hazır!' : 'Goal suggestions ready!');
    } catch (error) {
      console.error('Error:', error);
      setGoalsError({ 
        type: 'general', 
        message: i18n.language === 'tr' 
          ? 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' 
          : 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setLoadingGoals(false);
    }
  };

  // Auto-fetch insight when switching to insights tab
  useEffect(() => {
    if (activeTab === 'insights' && !insight && !loadingInsight && !hasFetchedInsight && user) {
      setHasFetchedInsight(true);
      fetchInsight();
    }
  }, [activeTab, insight, loadingInsight, hasFetchedInsight, user]);

  const formatInsight = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold mt-4 mb-2 text-foreground">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="mb-2">
            {parts.map((part, j) => 
              j % 2 === 1 ? <strong key={j} className="text-foreground">{part}</strong> : part
            )}
          </p>
        );
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return <li key={i} className="ml-4 mb-1">{line.replace(/^[-•]\s*/, '')}</li>;
      }
      if (line.match(/^\d+\./)) {
        return <p key={i} className="mb-3 font-medium text-foreground">{line}</p>;
      }
      if (line.trim()) {
        return <p key={i} className="mb-2">{line}</p>;
      }
      return null;
    });
  };

  const addGoalFromSuggestion = async (suggestion: GoalSuggestion) => {
    if (!user) return;
    
    try {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + suggestion.months);
      
      const { error } = await supabase.from('savings_goals').insert({
        user_id: user.id,
        name: suggestion.name,
        target_amount: suggestion.amount,
        current_amount: 0,
        deadline: deadline.toISOString().split('T')[0],
      });

      if (error) throw error;
      toast.success(i18n.language === 'tr' ? 'Hedef eklendi!' : 'Goal added!');
      // Refresh the goals list
      fetchExistingGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error(t('goals.addError'));
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(i18n.language === 'tr' ? 'Hedef silindi' : 'Goal deleted');
      fetchExistingGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error(i18n.language === 'tr' ? 'Hedef silinemedi' : 'Could not delete goal');
    }
  };

  const openEditDialog = (goal: { id: string; name: string; target_amount: number; deadline: string | null }) => {
    setEditingGoal(goal);
    setEditForm({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      deadline: goal.deadline || ''
    });
  };

  const saveEditedGoal = async () => {
    if (!user || !editingGoal) return;
    
    try {
      const { error } = await supabase
        .from('savings_goals')
        .update({
          name: editForm.name,
          target_amount: parseFloat(editForm.target_amount) || 0,
          deadline: editForm.deadline || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingGoal.id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(i18n.language === 'tr' ? 'Hedef güncellendi' : 'Goal updated');
      setEditingGoal(null);
      fetchExistingGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error(i18n.language === 'tr' ? 'Hedef güncellenemedi' : 'Could not update goal');
    }
  };

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg">
                <Brain className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                  {t('aiAdvisor.title')}
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                </h1>
                <p className="text-muted-foreground">{t('aiAdvisor.description')}</p>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="self-start lg:self-auto flex items-center gap-1.5 px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">Powered by Gemini AI</span>
          </Badge>
        </div>

        {/* Financial Overview Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">{t('aiAdvisor.totalBalance')}</span>
                </div>
                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalBalance)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                  <span className="text-xs text-muted-foreground">{t('aiAdvisor.totalDebt')}</span>
                </div>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalCardDebt)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">{t('aiAdvisor.savingsRate')}</span>
                </div>
                <p className={`text-lg font-bold ${Number(summary.savingsRate) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {summary.savingsRate}%
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-muted-foreground">{t('aiAdvisor.netStatus')}</span>
                </div>
                <p className={`text-lg font-bold ${summary.netStatus >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.netStatus)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4" />
              {t('aiAdvisor.chat')}
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('aiAdvisor.insights')}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('aiAdvisor.goalSuggestions')}
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <FinancialChat />
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    {t('aiAdvisor.financialAnalysis')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isCached && (
                      <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                        {i18n.language === 'tr' ? 'Önbellekten' : 'Cached'}
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchInsight(false)}
                      disabled={loadingInsight}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingInsight ? 'animate-spin' : ''}`} />
                      {t('aiAdvisor.analyze')}
                    </Button>
                    {isCached && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchInsight(true)}
                        disabled={loadingInsight}
                        title={i18n.language === 'tr' ? 'Önbelleği atla ve yeniden analiz et' : 'Skip cache and re-analyze'}
                      >
                        {i18n.language === 'tr' ? 'Yeni Analiz' : 'Fresh'}
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>{t('aiAdvisor.analysisDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInsight ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-center gap-3 py-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-primary/20"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                        <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{i18n.language === 'tr' ? 'AI Analiz Yapıyor...' : 'AI Analyzing...'}</p>
                        <p className="text-sm text-muted-foreground">{i18n.language === 'tr' ? 'Finansal verileriniz işleniyor' : 'Processing your financial data'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full animate-pulse" />
                      <Skeleton className="h-4 w-5/6 animate-pulse" />
                      <Skeleton className="h-4 w-4/6 animate-pulse" />
                    </div>
                  </div>
                ) : insightError ? (
                  <Alert variant="destructive" className="animate-fade-in">
                    <div className="flex items-start gap-3">
                      {insightError.type === 'rate_limit' && <AlertCircle className="h-5 w-5" />}
                      {insightError.type === 'credits' && <CreditCard className="h-5 w-5" />}
                      {insightError.type === 'network' && <WifiOff className="h-5 w-5" />}
                      {insightError.type === 'general' && <AlertCircle className="h-5 w-5" />}
                      <div className="flex-1">
                        <AlertTitle>
                          {insightError.type === 'rate_limit' && (i18n.language === 'tr' ? 'İstek Limiti Aşıldı' : 'Rate Limit Exceeded')}
                          {insightError.type === 'credits' && (i18n.language === 'tr' ? 'Kredi Yetersiz' : 'Insufficient Credits')}
                          {insightError.type === 'network' && (i18n.language === 'tr' ? 'Bağlantı Hatası' : 'Connection Error')}
                          {insightError.type === 'general' && (i18n.language === 'tr' ? 'Hata Oluştu' : 'Error Occurred')}
                        </AlertTitle>
                        <AlertDescription className="mt-1">{insightError.message}</AlertDescription>
                      </div>
                    </div>
                    <Button onClick={() => fetchInsight(false)} variant="outline" size="sm" className="mt-3 w-full gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {i18n.language === 'tr' ? 'Tekrar Dene' : 'Try Again'}
                    </Button>
                  </Alert>
                ) : insight ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                      {formatInsight(insight)}
                    </div>
                    
                    {summary && (
                      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between mt-2 border border-border/50">
                            <span className="text-sm">{t('ai.showData')}</span>
                            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4 space-y-4">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50 border">
                              <span className="text-xs text-muted-foreground">{t('aiAdvisor.monthlyIncome')}</span>
                              <p className="font-semibold text-green-600">{formatCurrency(summary.monthlyIncome)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 border">
                              <span className="text-xs text-muted-foreground">{t('aiAdvisor.monthlyExpense')}</span>
                              <p className="font-semibold text-red-600">{formatCurrency(summary.monthlyExpense)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 border">
                              <span className="text-xs text-muted-foreground">{t('aiAdvisor.monthlyNet')}</span>
                              <p className={`font-semibold ${summary.monthlyNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(summary.monthlyNet)}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 border">
                              <span className="text-xs text-muted-foreground">{t('aiAdvisor.debtRatio')}</span>
                              <p className={`font-semibold ${Number(summary.debtToAssetRatio) < 30 ? 'text-green-600' : 'text-orange-600'}`}>
                                {summary.debtToAssetRatio}%
                              </p>
                            </div>
                          </div>
                          
                          {summary.topCategories && summary.topCategories.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{t('ai.topCategories')}</p>
                              {summary.topCategories.slice(0, 5).map((cat, i) => (
                                <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 border">
                                  <span className="text-sm">{t(`categories.${cat.category}`, cat.category)}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{formatCurrency(cat.amount)}</span>
                                    <Badge variant={Number(cat.changePercent) > 0 ? "destructive" : "default"} className="text-xs">
                                      {Number(cat.changePercent) > 0 ? '+' : ''}{cat.changePercent}%
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {summary.goalsProgress && summary.goalsProgress.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{t('goals.title')}</p>
                              {summary.goalsProgress.map((goal, i) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/30 border space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{goal.name}</span>
                                    <span className="text-xs text-muted-foreground">{goal.progress}%</span>
                                  </div>
                                  <Progress value={Number(goal.progress)} className="h-2" />
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{formatCurrency(goal.current)}</span>
                                    <span>{formatCurrency(goal.target)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                      <Brain className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground mb-4">{t('ai.noInsight')}</p>
                    <Button onClick={() => fetchInsight(false)} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t('aiAdvisor.getFirstAnalysis')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goal Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {t('aiAdvisor.aiGoalSuggestions')}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchGoalSuggestions}
                    disabled={loadingGoals}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingGoals ? 'animate-spin' : ''}`} />
                    {t('aiAdvisor.getSuggestions')}
                  </Button>
                </div>
                <CardDescription>{t('aiAdvisor.suggestionsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingGoals ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-center gap-3 py-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-primary/20"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                        <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{i18n.language === 'tr' ? 'Hedef Önerileri Hazırlanıyor...' : 'Preparing Goal Suggestions...'}</p>
                        <p className="text-sm text-muted-foreground">{i18n.language === 'tr' ? 'Harcama alışkanlıklarınız analiz ediliyor' : 'Analyzing your spending habits'}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 rounded-lg border space-y-3 animate-pulse">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-6 w-1/2" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : goalsError ? (
                  <Alert variant="destructive" className="animate-fade-in">
                    <div className="flex items-start gap-3">
                      {goalsError.type === 'rate_limit' && <AlertCircle className="h-5 w-5" />}
                      {goalsError.type === 'credits' && <CreditCard className="h-5 w-5" />}
                      {goalsError.type === 'network' && <WifiOff className="h-5 w-5" />}
                      {goalsError.type === 'general' && <AlertCircle className="h-5 w-5" />}
                      <div className="flex-1">
                        <AlertTitle>
                          {goalsError.type === 'rate_limit' && (i18n.language === 'tr' ? 'İstek Limiti Aşıldı' : 'Rate Limit Exceeded')}
                          {goalsError.type === 'credits' && (i18n.language === 'tr' ? 'Kredi Yetersiz' : 'Insufficient Credits')}
                          {goalsError.type === 'network' && (i18n.language === 'tr' ? 'Bağlantı Hatası' : 'Connection Error')}
                          {goalsError.type === 'general' && (i18n.language === 'tr' ? 'Hata Oluştu' : 'Error Occurred')}
                        </AlertTitle>
                        <AlertDescription className="mt-1">{goalsError.message}</AlertDescription>
                      </div>
                    </div>
                    <Button onClick={fetchGoalSuggestions} variant="outline" size="sm" className="mt-3 w-full gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {i18n.language === 'tr' ? 'Tekrar Dene' : 'Try Again'}
                    </Button>
                  </Alert>
                ) : goalSuggestions.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {goalSuggestions.map((suggestion, i) => (
                      <Card 
                        key={i} 
                        className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Target className="h-5 w-5 text-primary" />
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {suggestion.months} {t('goals.months')}
                            </Badge>
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{suggestion.name}</h4>
                            <p className="text-lg font-bold text-primary">{formatCurrency(suggestion.amount)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                          <Button 
                            onClick={() => addGoalFromSuggestion(suggestion)} 
                            className="w-full gap-2"
                            size="sm"
                          >
                            <Target className="h-4 w-4" />
                            {t('aiAdvisor.addAsGoal')}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                      <Lightbulb className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground mb-4">{t('aiAdvisor.noSuggestions')}</p>
                    <Button onClick={fetchGoalSuggestions} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t('aiAdvisor.getGoalSuggestions')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Existing Goals Section */}
            <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    {i18n.language === 'tr' ? 'Mevcut Tasarruf Hedeflerim' : 'My Savings Goals'}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {existingGoals.length} {i18n.language === 'tr' ? 'hedef' : 'goals'}
                  </Badge>
                </div>
                <CardDescription>
                  {i18n.language === 'tr' 
                    ? 'Eklediğiniz hedefler burada görünür' 
                    : 'Goals you have added appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingExistingGoals ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-4 rounded-lg border space-y-2 animate-pulse">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : existingGoals.length > 0 ? (
                  <div className="space-y-3">
                    {existingGoals.map((goal, i) => {
                      const progress = goal.target_amount > 0 
                        ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) 
                        : 0;
                      return (
                        <div 
                          key={goal.id} 
                          className={`p-4 rounded-lg border transition-all duration-300 animate-fade-in ${
                            goal.is_completed 
                              ? 'bg-green-500/10 border-green-500/30' 
                              : 'bg-muted/30 hover:bg-muted/50'
                          }`}
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {goal.is_completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <Target className="h-5 w-5 text-primary" />
                              )}
                              <h4 className="font-semibold text-foreground">{goal.name}</h4>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => openEditDialog(goal)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteGoal(goal.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Progress value={progress} className="h-2 mb-2" />
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                            </span>
                            <span className={`font-medium ${progress >= 100 ? 'text-green-600' : 'text-primary'}`}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                          {goal.deadline && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {i18n.language === 'tr' ? 'Hedef tarih:' : 'Target date:'} {new Date(goal.deadline).toLocaleDateString(i18n.language)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {i18n.language === 'tr' 
                        ? 'Henüz hedef eklenmedi. Yukarıdan AI önerilerini alıp hedef ekleyebilirsiniz.' 
                        : 'No goals added yet. Get AI suggestions above and add goals.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Goal Dialog */}
        <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{i18n.language === 'tr' ? 'Hedefi Düzenle' : 'Edit Goal'}</DialogTitle>
              <DialogDescription>
                {i18n.language === 'tr' 
                  ? 'Hedef bilgilerini güncelleyin' 
                  : 'Update goal information'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{i18n.language === 'tr' ? 'Hedef Adı' : 'Goal Name'}</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={i18n.language === 'tr' ? 'Örn: Acil Durum Fonu' : 'E.g., Emergency Fund'}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">{i18n.language === 'tr' ? 'Hedef Tutar' : 'Target Amount'}</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={editForm.target_amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, target_amount: e.target.value }))}
                  placeholder="10000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-deadline">{i18n.language === 'tr' ? 'Hedef Tarih' : 'Target Date'}</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingGoal(null)}>
                {i18n.language === 'tr' ? 'İptal' : 'Cancel'}
              </Button>
              <Button onClick={saveEditedGoal} disabled={!editForm.name || !editForm.target_amount}>
                {i18n.language === 'tr' ? 'Kaydet' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Features Info */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">{t('aiAdvisor.poweredBy')}</h3>
                <p className="text-sm text-muted-foreground">{t('aiAdvisor.aiExplanation')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AIAdvisor;
