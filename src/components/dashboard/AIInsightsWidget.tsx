import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FinancialSummary {
  totalBalance: number;
  totalCardDebt: number;
  netStatus: number;
  monthlyIncome: number;
  monthlyExpense: number;
  savingsRate: string;
  topCategories: Array<{
    category: string;
    amount: number;
    changePercent: string;
  }>;
}

export function AIInsightsWidget() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [insight, setInsight] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const fetchInsight = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Önce session'ı kontrol et
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session, skipping insight fetch');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('financial-insights', {
        body: { language: i18n.language, type: 'insight' }
      });

      if (error) {
        console.error('Error fetching insights:', error);
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          // Oturum geçersiz - sessizce atla
          console.log('Session expired, skipping insight fetch');
          return;
        }
        if (error.message?.includes('429')) {
          toast.error(t('ai.rateLimitError'));
        } else if (error.message?.includes('402')) {
          toast.error(t('ai.creditsError'));
        } else {
          toast.error(t('ai.fetchError'));
        }
        return;
      }

      setInsight(data.insight);
      setSummary(data.summary);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error:', error);
      // 401 hatalarını sessizce ele al
      if (error instanceof Error && error.message?.includes('401')) {
        return;
      }
      toast.error(t('ai.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSessionAndFetch = async () => {
      if (!user || hasLoaded) return;
      
      // Oturum kontrolü
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchInsight();
      }
    };
    
    checkSessionAndFetch();
  }, [user, hasLoaded]);

  const formatInsight = (text: string) => {
    // Convert markdown-style formatting to React elements
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="mb-1">
            {parts.map((part, j) => 
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </p>
        );
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return <li key={i} className="ml-4 mb-1">{line.replace(/^[-•]\s*/, '')}</li>;
      }
      if (line.match(/^\d+\./)) {
        return <p key={i} className="mb-2 font-medium">{line}</p>;
      }
      if (line.trim()) {
        return <p key={i} className="mb-1">{line}</p>;
      }
      return null;
    });
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 h-full min-h-[200px] lg:min-h-[280px] flex flex-col">
      <CardHeader className="pb-2 lg:pb-3 px-3 lg:px-6 pt-3 lg:pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 lg:p-2 rounded-full bg-primary/10">
              <Brain className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <CardTitle className="text-sm lg:text-lg flex items-center gap-1.5 lg:gap-2">
              {t('ai.title')}
              <Sparkles className="h-3 w-3 lg:h-4 lg:w-4 text-primary animate-pulse" />
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchInsight}
            disabled={loading}
            className="h-7 w-7 lg:h-8 lg:w-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 lg:h-4 lg:w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6 flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-1.5 lg:space-y-2">
            <Skeleton className="h-3 lg:h-4 w-full" />
            <Skeleton className="h-3 lg:h-4 w-5/6" />
            <Skeleton className="h-3 lg:h-4 w-4/6" />
          </div>
        ) : insight ? (
          <div className="space-y-2 lg:space-y-3">
            <div className="text-xs lg:text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none max-h-32 lg:max-h-64 overflow-y-auto pr-1 lg:pr-2">
              {formatInsight(insight)}
            </div>
            
            {summary && (
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-7 lg:h-9 mt-1 lg:mt-2">
                    <span className="text-[10px] lg:text-xs text-muted-foreground">{t('ai.showData')}</span>
                    {showDetails ? <ChevronUp className="h-3 w-3 lg:h-4 lg:w-4" /> : <ChevronDown className="h-3 w-3 lg:h-4 lg:w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5 lg:mt-2 space-y-1.5 lg:space-y-2">
                  <div className="grid grid-cols-2 gap-1.5 lg:gap-2 text-[10px] lg:text-xs">
                    <div className="p-1.5 lg:p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">{t('ai.savingsRate')}</span>
                      <p className={`font-semibold ${Number(summary.savingsRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.savingsRate}%
                      </p>
                    </div>
                    <div className="p-1.5 lg:p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">{t('ai.netStatus')}</span>
                      <p className={`font-semibold ${summary.netStatus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₺{summary.netStatus.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {summary.topCategories && summary.topCategories.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] lg:text-xs font-medium text-muted-foreground">{t('ai.topCategories')}</p>
                      {summary.topCategories.slice(0, 3).map((cat, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] lg:text-xs p-1 rounded bg-muted/30">
                          <span className="truncate">{t(`categories.${cat.category}`, cat.category)}</span>
                          <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                            <span className="font-medium">₺{cat.amount.toLocaleString()}</span>
                            <span className={`text-[9px] lg:text-xs ${Number(cat.changePercent) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {Number(cat.changePercent) > 0 ? '+' : ''}{cat.changePercent}%
                            </span>
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
          <div className="text-center py-2 lg:py-4">
            <p className="text-xs lg:text-sm text-muted-foreground mb-2 lg:mb-3">{t('ai.noInsight')}</p>
            <Button variant="outline" size="sm" onClick={fetchInsight} className="h-7 lg:h-9 text-xs lg:text-sm">
              <Sparkles className="h-3 w-3 lg:h-4 lg:w-4 mr-1.5 lg:mr-2" />
              {t('ai.getInsight')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
