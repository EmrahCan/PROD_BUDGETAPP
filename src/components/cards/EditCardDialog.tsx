import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentCelebration } from "@/hooks/usePaymentCelebration";

interface Card {
  id: string;
  name: string;
  bank_name: string;
  last_four_digits: string;
  card_limit: number;
  balance: number;
  minimum_payment: number;
  due_date: number;
}

interface EditCardDialogProps {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditCardDialog({ card, open, onOpenChange, onSuccess }: EditCardDialogProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { celebrateCardPayment } = usePaymentCelebration();
  const [formData, setFormData] = useState({
    name: "",
    lastFourDigits: "",
    cardLimit: "",
    balance: "",
    minimumPayment: "",
    dueDate: "",
  });

  useEffect(() => {
    if (card) {
      setFormData({
        name: card.name,
        lastFourDigits: card.last_four_digits,
        cardLimit: card.card_limit.toString(),
        balance: card.balance.toString(),
        minimumPayment: card.minimum_payment.toString(),
        dueDate: card.due_date.toString(),
      });
    }
  }, [card]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card || !user) return;
    
    setLoading(true);

    const newBalance = parseFloat(formData.balance) || 0;
    const previousBalance = card.balance;
    
    // Eğer borç azaldıysa (ödeme yapıldıysa), asgari ödemeyi sıfırla
    const paymentMade = newBalance < previousBalance;
    const newMinimumPayment = paymentMade ? 0 : (parseFloat(formData.minimumPayment) || 0);
    
    const { error } = await supabase
      .from("credit_cards")
      .update({
        name: formData.name,
        last_four_digits: formData.lastFourDigits,
        card_limit: parseFloat(formData.cardLimit) || 0,
        balance: newBalance,
        minimum_payment: newMinimumPayment,
        due_date: parseInt(formData.dueDate),
      })
      .eq("id", card.id);

    if (error) {
      toast.error(t('cards.cardUpdateError') + ": " + error.message);
    } else {
      // If balance is now 0 or less and was previously higher, celebrate and clear notifications
      if (newBalance <= 0 && card.balance > 0) {
        await supabase
          .from("notifications")
          .delete()
          .eq("user_id", user.id)
          .eq("related_entity_id", card.id)
          .eq("related_entity_type", "credit_card");
        
        // Also mark any as read as backup
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("related_entity_id", card.id);
        
        celebrateCardPayment(card.name);
      } else {
        toast.success(t('cards.cardUpdated'));
      }
      
      onOpenChange(false);
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('cards.editCard')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-card-name">{t('dialogs.cardName')}</Label>
            <Input
              id="edit-card-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">{t('accounts.bank')}</p>
            <p className="font-medium">{card?.bank_name}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-lastFour">{t('dialogs.lastFourDigits')}</Label>
            <Input
              id="edit-lastFour"
              value={formData.lastFourDigits}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setFormData({ ...formData, lastFourDigits: value });
              }}
              maxLength={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-limit">{t('dialogs.cardLimit')}</Label>
            <Input
              id="edit-limit"
              type="number"
              step="0.01"
              value={formData.cardLimit}
              onChange={(e) => setFormData({ ...formData, cardLimit: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-card-balance">{t('dialogs.currentDebt')}</Label>
            <Input
              id="edit-card-balance"
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {t('cards.debtDescription')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-minimumPayment">{t('dialogs.minimumPayment')}</Label>
            <Input
              id="edit-minimumPayment"
              type="number"
              step="0.01"
              value={formData.minimumPayment}
              onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {t('cards.minimumPaymentDescription')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dueDate">{t('dialogs.paymentDay')}</Label>
            <Input
              id="edit-dueDate"
              type="number"
              min="1"
              max="28"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
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
