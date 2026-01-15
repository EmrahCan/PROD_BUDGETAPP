import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const categoryKeys = [
  "salary",
  "rent",
  "groceries",
  "bills",
  "transport",
  "entertainment",
  "health",
  "clothing",
  "other"
];

interface BudgetLimitDialogProps {
  onSuccess: () => void;
}

export function BudgetLimitDialog({ onSuccess }: BudgetLimitDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("80");
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("budget_limits").insert({
        user_id: user.id,
        category,
        monthly_limit: parseFloat(monthlyLimit),
        alert_threshold: parseFloat(alertThreshold),
      });

      if (error) throw error;

      toast.success(t('budgetDialog.limitCreated'));
      setOpen(false);
      setCategory("");
      setMonthlyLimit("");
      setAlertThreshold("80");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 hover:scale-105 transition-transform">
          <Target className="h-4 w-4" />
          {t('budgetDialog.addBudgetLimit')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {t('budgetDialog.newBudgetLimit')}
            </DialogTitle>
            <DialogDescription>
              {t('budgetDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">{t('budgetDialog.category')}</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('budgetDialog.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categoryKeys.map((key) => (
                    <SelectItem key={key} value={t(`budgetDialog.categories.${key}`)}>
                      {t(`budgetDialog.categories.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="monthlyLimit">{t('budgetDialog.monthlyLimit')}</Label>
              <Input
                id="monthlyLimit"
                type="number"
                step="0.01"
                placeholder="5000"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alertThreshold">{t('budgetDialog.alertThreshold')}</Label>
              <Input
                id="alertThreshold"
                type="number"
                min="1"
                max="100"
                placeholder="80"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('budgetDialog.alertThresholdDescription')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? t('budgetDialog.creating') : t('budgetDialog.createLimit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
