import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { 
  Plus, 
  Home, 
  Zap, 
  Droplets, 
  Flame, 
  Wifi, 
  Phone, 
  Tv, 
  Shield, 
  Car, 
  GraduationCap, 
  Dumbbell, 
  Heart, 
  Music, 
  Gamepad2, 
  Building2, 
  CreditCard,
  Sparkles,
  MoreHorizontal
} from "lucide-react";
import { useTranslation } from "react-i18next";

// Enhanced categories with icons
const categoryConfig = [
  { key: "rent", icon: Home, color: "text-blue-500" },
  { key: "electricity", icon: Zap, color: "text-yellow-500" },
  { key: "water", icon: Droplets, color: "text-cyan-500" },
  { key: "gas", icon: Flame, color: "text-orange-500" },
  { key: "internet", icon: Wifi, color: "text-purple-500" },
  { key: "phone", icon: Phone, color: "text-green-500" },
  { key: "tv", icon: Tv, color: "text-red-500" },
  { key: "streaming", icon: Sparkles, color: "text-pink-500" },
  { key: "insurance", icon: Shield, color: "text-indigo-500" },
  { key: "car", icon: Car, color: "text-slate-500" },
  { key: "education", icon: GraduationCap, color: "text-emerald-500" },
  { key: "gym", icon: Dumbbell, color: "text-amber-500" },
  { key: "health", icon: Heart, color: "text-rose-500" },
  { key: "music", icon: Music, color: "text-violet-500" },
  { key: "gaming", icon: Gamepad2, color: "text-lime-500" },
  { key: "apartment", icon: Building2, color: "text-teal-500" },
  { key: "loan", icon: CreditCard, color: "text-red-600" },
  { key: "other", icon: MoreHorizontal, color: "text-gray-500" },
];

interface FixedPaymentDialogProps {
  payment?: any;
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FixedPaymentDialog({ payment, onSuccess, open: controlledOpen, onOpenChange }: FixedPaymentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    currency: "TRY",
    category: "",
    payment_day: "1",
    account_id: "",
    card_id: "",
    is_active: true,
  });

  // Reset form data when payment changes or dialog opens
  useEffect(() => {
    if (open && payment) {
      setFormData({
        name: payment.name || "",
        amount: payment.amount?.toString() || "",
        currency: payment.currency || "TRY",
        category: payment.category || "",
        payment_day: payment.payment_day?.toString() || "1",
        account_id: payment.account_id || "",
        card_id: payment.card_id || "",
        is_active: payment.is_active ?? true,
      });
    } else if (!open) {
      setFormData({
        name: "",
        amount: "",
        currency: "TRY",
        category: "",
        payment_day: "1",
        account_id: "",
        card_id: "",
        is_active: true,
      });
    }
  }, [open, payment]);

  useEffect(() => {
    if (open) {
      fetchAccountsAndCards();
    }
  }, [open]);

  const fetchAccountsAndCards = async () => {
    if (!user) return;

    const [accountsRes, cardsRes] = await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", user.id),
      supabase.from("credit_cards").select("*").eq("user_id", user.id),
    ]);

    if (accountsRes.data) setAccounts(accountsRes.data);
    if (cardsRes.data) setCards(cardsRes.data);
  };

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
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      category: formData.category,
      payment_day: parseInt(formData.payment_day),
      account_id: formData.account_id || null,
      card_id: formData.card_id || null,
      is_active: formData.is_active,
    };

    try {
      if (payment) {
        const { error } = await supabase
          .from("fixed_payments")
          .update(data)
          .eq("id", payment.id);
        if (error) throw error;
        toast.success(t('dialogs.fixedPaymentUpdated'));
      } else {
        const { error } = await supabase.from("fixed_payments").insert([data]);
        if (error) throw error;
        toast.success(t('dialogs.fixedPaymentAdded'));
      }
      
      setOpen(false);
      onSuccess();
      setFormData({
        name: "",
        amount: "",
        currency: "TRY",
        category: "",
        payment_day: "1",
        account_id: "",
        card_id: "",
        is_active: true,
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
        <Button className="gap-2">
          <Plus className="h-5 w-5" />
          {payment ? t('dialogs.edit') : t('dialogs.addFixedPayment')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payment ? t('dialogs.editFixedPayment') : t('dialogs.newFixedPayment')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('dialogs.paymentName')}</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('dialogs.electricityBillExample')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.amount')}</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

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
                <SelectValue placeholder={t('dialogs.selectCategory')}>
                  {formData.category && (
                    <span className="flex items-center gap-2">
                      {(() => {
                        const cat = categoryConfig.find(c => c.key === formData.category);
                        if (cat) {
                          const Icon = cat.icon;
                          return <Icon className={`h-4 w-4 ${cat.color}`} />;
                        }
                        return null;
                      })()}
                      {String(t(`fixedCategories.${formData.category}`, formData.category))}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoryConfig.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <SelectItem key={cat.key} value={cat.key}>
                      <span className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${cat.color}`} />
                        {String(t(`fixedCategories.${cat.key}`, cat.key))}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.paymentDayOfMonth')}</Label>
            <Select
              value={formData.payment_day}
              onValueChange={(value) => setFormData({ ...formData, payment_day: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.accountOrCardOptional')}</Label>
            <Select
              value={formData.account_id ? `account-${formData.account_id}` : formData.card_id ? `card-${formData.card_id}` : "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  setFormData({ ...formData, account_id: "", card_id: "" });
                } else if (value.startsWith("account-")) {
                  setFormData({ ...formData, account_id: value.replace("account-", ""), card_id: "" });
                } else {
                  setFormData({ ...formData, card_id: value.replace("card-", ""), account_id: "" });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('dialogs.select')}>
                  {(() => {
                    if (formData.account_id) {
                      const acc = accounts.find(a => a.id === formData.account_id);
                      return acc ? `${acc.name} (${acc.bank_name})` : t('dialogs.select');
                    }
                    if (formData.card_id) {
                      const card = cards.find(c => c.id === formData.card_id);
                      return card ? `${card.name} (${card.bank_name})` : t('dialogs.select');
                    }
                    return t('dialogs.notSelected');
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('dialogs.notSelected')}</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={`account-${acc.id}`}>
                    {acc.name} ({acc.bank_name})
                  </SelectItem>
                ))}
                {cards.map((card) => (
                  <SelectItem key={card.id} value={`card-${card.id}`}>
                    {card.name} ({card.bank_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>{t('dialogs.active')}</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
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