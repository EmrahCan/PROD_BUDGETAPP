import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, Plus, Sparkles, Trash2, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { toast } from "sonner";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string | null;
  is_completed: boolean;
}

interface GoalSuggestion {
  name: string;
  amount: number;
  months: number;
  reason: string;
}

export function SavingsGoalsWidget() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  
  // Form state
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!user) return;
    
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('financial-insights', {
        body: { language: i18n.language, type: 'goal-suggestion' }
      });

      if (error) {
        console.error('Error fetching suggestions:', error);
        toast.error(t('goals.suggestionError'));
        return;
      }

      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('goals.suggestionError'));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const addGoal = async () => {
    if (!user || !goalName || !targetAmount) return;
    
    setAddingGoal(true);
    try {
      const { error } = await supabase
        .from('savings_goals')
        .insert({
          user_id: user.id,
          name: goalName,
          target_amount: parseFloat(targetAmount),
          current_amount: parseFloat(currentAmount) || 0
        });

      if (error) throw error;
      
      toast.success(t('goals.added'));
      setGoalName("");
      setTargetAmount("");
      setCurrentAmount("");
      setDialogOpen(false);
      fetchGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error(t('goals.addError'));
    } finally {
      setAddingGoal(false);
    }
  };

  const addSuggestedGoal = async (suggestion: GoalSuggestion) => {
    if (!user) return;
    
    try {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + suggestion.months);
      
      const { error } = await supabase
        .from('savings_goals')
        .insert({
          user_id: user.id,
          name: suggestion.name,
          target_amount: suggestion.amount,
          current_amount: 0,
          deadline: deadline.toISOString().split('T')[0]
        });

      if (error) throw error;
      
      toast.success(t('goals.added'));
      setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
      fetchGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error(t('goals.addError'));
    }
  };

  const updateGoalProgress = async (goalId: string, newAmount: number) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      const isCompleted = goal && newAmount >= goal.target_amount;
      
      const { error } = await supabase
        .from('savings_goals')
        .update({ 
          current_amount: newAmount,
          is_completed: isCompleted 
        })
        .eq('id', goalId);

      if (error) throw error;
      
      if (isCompleted) {
        toast.success(t('goals.completed'));
      } else {
        toast.success(t('goals.updated'));
      }
      fetchGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error(t('goals.updateError'));
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      toast.success(t('goals.deleted'));
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error(t('goals.deleteError'));
    }
  };

  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-lg">{t('goals.title')}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSuggestions}
              disabled={loadingSuggestions}
            >
              {loadingSuggestions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-1 hidden sm:inline">{t('goals.suggest')}</span>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">{t('goals.add')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('goals.addNew')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="goalName">{t('goals.name')}</Label>
                    <Input
                      id="goalName"
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder={t('goals.namePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">{t('goals.target')}</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentAmount">{t('goals.current')}</Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={addGoal}
                    disabled={addingGoal || !goalName || !targetAmount}
                  >
                    {addingGoal && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('goals.add')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {t('goals.aiSuggestions')}
            </p>
            {suggestions.map((suggestion, i) => (
              <div 
                key={i} 
                className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{suggestion.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(suggestion.amount)} • {suggestion.months} {t('goals.months')}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => addSuggestedGoal(suggestion)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground italic">{suggestion.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* Active Goals */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('goals.noGoals')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) => {
              const progress = (goal.current_amount / goal.target_amount) * 100;
              return (
                <div key={goal.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{goal.name}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteGoal(goal.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(goal.current_amount)}</span>
                    <span>{progress.toFixed(0)}%</span>
                    <span>{formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      placeholder={t('goals.addAmount')}
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const addAmount = parseFloat(input.value);
                          if (addAmount > 0) {
                            updateGoalProgress(goal.id, goal.current_amount + addAmount);
                            input.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  {t('goals.completed')} ({completedGoals.length})
                </p>
                {completedGoals.slice(0, 2).map((goal) => (
                  <div key={goal.id} className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{goal.name}</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(goal.target_amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
