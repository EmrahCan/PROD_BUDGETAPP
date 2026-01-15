import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, Plus, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

interface BudgetSuggestion {
  category: string;
  monthly_limit: number;
  alert_threshold: number;
  reason: string;
}

interface BudgetSuggestionsDialogProps {
  onSuccess?: () => void;
}

export function BudgetSuggestionsDialog({ onSuccess }: BudgetSuggestionsDialogProps) {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);
  const [addedCategories, setAddedCategories] = useState<Set<string>>(new Set());
  const [addingCategory, setAddingCategory] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (!user) return;
    
    setLoading(true);
    setSuggestions([]);
    setAddedCategories(new Set());
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            language: i18n.language,
            type: 'budget-suggestion'
          }),
        }
      );

      if (response.status === 429) {
        toast.error(t('ai.rateLimitError'));
        return;
      }
      
      if (response.status === 402) {
        toast.error(t('ai.creditsError'));
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        // Filter out categories that already have limits
        const { data: existingLimits } = await supabase
          .from('budget_limits')
          .select('category')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        const existingCategories = new Set(existingLimits?.map(l => l.category) || []);
        const filteredSuggestions = data.suggestions.filter(
          (s: BudgetSuggestion) => !existingCategories.has(s.category)
        );
        
        setSuggestions(filteredSuggestions);
        
        if (filteredSuggestions.length === 0 && data.suggestions.length > 0) {
          toast.info(t('budgetLimits.allCategoriesHaveLimits'));
        }
      } else {
        toast.info(t('budgetLimits.noSuggestionsAvailable'));
      }
    } catch (error) {
      console.error('Error fetching budget suggestions:', error);
      toast.error(t('budgetLimits.suggestionError'));
    } finally {
      setLoading(false);
    }
  };

  const addBudgetLimit = async (suggestion: BudgetSuggestion) => {
    if (!user) return;
    
    setAddingCategory(suggestion.category);
    
    try {
      const { error } = await supabase
        .from('budget_limits')
        .insert({
          user_id: user.id,
          category: suggestion.category,
          monthly_limit: suggestion.monthly_limit,
          alert_threshold: suggestion.alert_threshold,
          is_active: true
        });

      if (error) throw error;

      setAddedCategories(prev => new Set([...prev, suggestion.category]));
      toast.success(t('budgetLimits.limitAdded', { category: suggestion.category }));
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding budget limit:', error);
      toast.error(error.message);
    } finally {
      setAddingCategory(null);
    }
  };

  const addAllSuggestions = async () => {
    if (!user || suggestions.length === 0) return;
    
    setLoading(true);
    
    try {
      const limitsToAdd = suggestions
        .filter(s => !addedCategories.has(s.category))
        .map(s => ({
          user_id: user.id,
          category: s.category,
          monthly_limit: s.monthly_limit,
          alert_threshold: s.alert_threshold,
          is_active: true
        }));

      if (limitsToAdd.length === 0) {
        toast.info(t('budgetLimits.allAlreadyAdded'));
        return;
      }

      const { error } = await supabase
        .from('budget_limits')
        .insert(limitsToAdd);

      if (error) throw error;

      const newAdded = new Set([...addedCategories, ...suggestions.map(s => s.category)]);
      setAddedCategories(newAdded);
      toast.success(t('budgetLimits.allLimitsAdded'));
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding all budget limits:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 hover:bg-primary/10 hover:border-primary transition-all"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          {t('budgetLimits.aiSuggest')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('budgetLimits.aiSuggestionsTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {suggestions.length === 0 && !loading && (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground mb-4">
                {t('budgetLimits.aiSuggestDescription')}
              </p>
              <Button onClick={fetchSuggestions} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {t('budgetLimits.getSuggestions')}
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('budgetLimits.analyzingSpending')}</p>
            </div>
          )}

          {suggestions.length > 0 && !loading && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('budgetLimits.suggestionsCount', { count: suggestions.length })}
                </p>
                <Button 
                  size="sm" 
                  onClick={addAllSuggestions}
                  disabled={suggestions.every(s => addedCategories.has(s.category))}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t('budgetLimits.addAll')}
                </Button>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => {
                  const isAdded = addedCategories.has(suggestion.category);
                  const isAdding = addingCategory === suggestion.category;
                  
                  return (
                    <Card 
                      key={suggestion.category} 
                      className={`p-4 transition-all duration-300 animate-in slide-in-from-bottom-2 ${
                        isAdded ? 'bg-success/10 border-success/30' : 'hover:border-primary/50'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{suggestion.category}</span>
                            <Badge variant="outline" className="text-xs">
                              {t('budgetLimits.threshold')}: {suggestion.alert_threshold}%
                            </Badge>
                          </div>
                          <p className="text-lg font-semibold text-primary">
                            {formatCurrency(suggestion.monthly_limit)}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              / {t('budgetLimits.month')}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground flex items-start gap-1">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            {suggestion.reason}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded ? "ghost" : "default"}
                          disabled={isAdded || isAdding}
                          onClick={() => addBudgetLimit(suggestion)}
                          className="flex-shrink-0"
                        >
                          {isAdding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isAdded ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={fetchSuggestions}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t('budgetLimits.refreshSuggestions')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}