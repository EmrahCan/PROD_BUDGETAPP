import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { Plus, CalendarIcon, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "@/hooks/useDateFormat";

interface InstallmentDialogProps {
  installment?: any;
  onSuccess: () => void;
}

const categoryKeys = [
  "electronics",
  "furniture",
  "clothing",
  "appliances",
  "vacation",
  "education",
  "health",
  "other"
];

export function InstallmentDialog({ installment, onSuccess }: InstallmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
  const { getLocale } = useDateFormat();
  const [cards, setCards] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: installment?.name || "",
    total_amount: installment?.total_amount || "",
    total_months: installment?.total_months || "",
    paid_months: installment?.paid_months || 0,
    currency: installment?.currency || "TRY",
    category: installment?.category || "",
    card_id: installment?.card_id || "",
    start_date: installment?.start_date ? new Date(installment.start_date) : new Date(),
  });

  useEffect(() => {
    if (open) {
      fetchCards();
    }
  }, [open]);

  const fetchCards = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id);

    if (data) setCards(data);
  };

  const monthlyAmount = formData.total_amount && formData.total_months 
    ? (parseFloat(formData.total_amount) / parseInt(formData.total_months)).toFixed(2)
    : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemoMode) {
      toast.info(t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz");
      return;
    }
    
    if (!user) return;

    setLoading(true);

    const data = {
      user_id: user.id,
      name: formData.name,
      total_amount: parseFloat(formData.total_amount),
      total_months: parseInt(formData.total_months),
      monthly_amount: parseFloat(monthlyAmount),
      currency: formData.currency,
      category: formData.category,
      card_id: formData.card_id || null,
      start_date: format(formData.start_date, "yyyy-MM-dd"),
      paid_months: parseInt(String(formData.paid_months)) || 0,
      is_active: true,
    };

    try {
      if (installment) {
        const { error } = await supabase
          .from("installments")
          .update(data)
          .eq("id", installment.id);
        if (error) throw error;
        toast.success(t('dialogs.installmentUpdated'));
      } else {
        const { error } = await supabase.from("installments").insert([data]);
        if (error) throw error;
        toast.success(t('dialogs.installmentAdded'));
      }
      
      setOpen(false);
      onSuccess();
      setFormData({
        name: "",
        total_amount: "",
        total_months: "",
        paid_months: 0,
        currency: "TRY",
        category: "",
        card_id: "",
        start_date: new Date(),
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {installment ? (
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-5 w-5" />
            {t('installments.addInstallment')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{installment ? t('installments.editInstallment') : t('installments.newInstallment')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('installments.installmentName')}</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('installments.installmentNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('installments.totalAmount')}</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('installments.installmentCount')}</Label>
            <Input
              type="number"
              min="1"
              required
              value={formData.total_months}
              onChange={(e) => setFormData({ ...formData, total_months: e.target.value })}
              placeholder="12"
            />
          </div>

          {installment && (
            <div className="space-y-2">
              <Label>{t('installments.paidInstallments')}</Label>
              <Input
                type="number"
                min="0"
                max={formData.total_months ? parseInt(formData.total_months) : undefined}
                value={formData.paid_months}
                onChange={(e) => setFormData({ ...formData, paid_months: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                {t('installments.paidInstallmentsHint', { total: formData.total_months || 0 })}
              </p>
            </div>
          )}

          {formData.total_amount && formData.total_months && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t('widgets.monthlyPayment')}</p>
              <p className="text-lg font-semibold">{monthlyAmount} {formData.currency}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('dialogs.currency')}</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">TRY</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.category')}</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={t('dialogs.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categoryKeys.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`installmentCategories.${cat}`, cat) as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.creditCardOptional')}</Label>
            <Select
              value={formData.card_id || undefined}
              onValueChange={(value) => setFormData({ ...formData, card_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('dialogs.selectCard')} />
              </SelectTrigger>
              <SelectContent>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} ({card.bank_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.startDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.start_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.start_date ? format(formData.start_date, "PPP", { locale: getLocale() }) : t('dialogs.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.start_date}
                  onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              {t('dialogs.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t('dialogs.saving') : t('dialogs.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}