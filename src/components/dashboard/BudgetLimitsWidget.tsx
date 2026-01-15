import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BudgetLimitDialog } from "./BudgetLimitDialog";
import { BudgetSuggestionsDialog } from "./BudgetSuggestionsDialog";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

interface BudgetLimit {
  id: string;
  category: string;
  monthly_limit: number;
  alert_threshold: number;
  current_spending: number;
  percentage: number;
}

export function BudgetLimitsWidget() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const [limits, setLimits] = useState<BudgetLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLimits = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch budget limits
      const { data: limitsData, error: limitsError } = await supabase
        .from("budget_limits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (limitsError) throw limitsError;

      // Fetch current month transactions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("category, amount")
        .eq("user_id", user.id)
        .eq("transaction_type", "expense")
        .gte("transaction_date", startOfMonth.toISOString().split('T')[0]);

      if (transError) throw transError;

      // Calculate spending per category
      const spendingByCategory: Record<string, number> = {};
      transactions?.forEach(t => {
        spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + Number(t.amount);
      });

      // Combine limits with spending
      const enrichedLimits = limitsData?.map(limit => {
        const monthlyLimit = Number(limit.monthly_limit);
        const alertThreshold = Number(limit.alert_threshold);
        const currentSpending = spendingByCategory[limit.category] || 0;
        const percentage = (currentSpending / monthlyLimit) * 100;
        return {
          id: limit.id,
          category: limit.category,
          monthly_limit: monthlyLimit,
          alert_threshold: alertThreshold,
          current_spending: currentSpending,
          percentage: Math.min(percentage, 100)
        };
      }) || [];

      setLimits(enrichedLimits.sort((a, b) => b.percentage - a.percentage));
    } catch (error: any) {
      toast.error(t('budgetLimits.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('budgetLimits.deleteConfirm'))) return;

    try {
      const { error } = await supabase
        .from("budget_limits")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(t('budgetLimits.deleted'));
      fetchLimits();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, [user]);

  const getStatusColor = (percentage: number, threshold: number) => {
    if (percentage >= 100) return "text-destructive";
    if (percentage >= threshold) return "text-amber-500";
    return "text-success";
  };

  const getStatusIcon = (percentage: number, threshold: number) => {
    if (percentage >= 100) return <AlertTriangle className="h-4 w-4" />;
    if (percentage >= threshold) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Card className="p-6 shadow-medium hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {t('budgetLimits.title')}
        </h3>
        <div className="flex items-center gap-2">
          <BudgetSuggestionsDialog onSuccess={fetchLimits} />
          <BudgetLimitDialog onSuccess={fetchLimits} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-2 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : limits.length === 0 ? (
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground mb-4">
            {t('budgetLimits.noLimitsYet')}
          </p>
          <BudgetLimitDialog onSuccess={fetchLimits} />
        </div>
      ) : (
        <div className="space-y-4">
          {limits.map((limit, index) => (
            <div
              key={limit.id}
              className="space-y-2 p-3 rounded-lg border border-border hover:bg-muted/30 transition-all duration-300 animate-in slide-in-from-left-5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{limit.category}</span>
                  <Badge 
                    variant={limit.percentage >= 100 ? "destructive" : limit.percentage >= limit.alert_threshold ? "secondary" : "outline"}
                    className="animate-pulse"
                  >
                    {Math.round(limit.percentage)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold flex items-center gap-1 ${getStatusColor(limit.percentage, limit.alert_threshold)}`}>
                    {getStatusIcon(limit.percentage, limit.alert_threshold)}
                    {formatCurrency(limit.current_spending)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(limit.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={limit.percentage}
                  className={`h-2 transition-all duration-500 ${
                    limit.percentage >= 100 
                      ? '[&>div]:bg-destructive' 
                      : limit.percentage >= limit.alert_threshold 
                      ? '[&>div]:bg-amber-500' 
                      : '[&>div]:bg-success'
                  }`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('budgetLimits.limit')}: {formatCurrency(limit.monthly_limit)}</span>
                  <span>{t('budgetLimits.remaining')}: {formatCurrency(Math.max(0, limit.monthly_limit - limit.current_spending))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
