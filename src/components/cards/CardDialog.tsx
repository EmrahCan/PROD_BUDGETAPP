import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2 } from "lucide-react";
import { BANKS, BANK_CATEGORIES, BANK_CATEGORIES_EN, BANK_CATEGORIES_DE, CUSTOM_BANK_COLORS } from "@/types/bank";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface CardDialogProps {
  onSuccess: () => void;
}

export function CardDialog({ onSuccess }: CardDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCustomBank, setIsCustomBank] = useState(false);
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    bankId: "",
    customBankName: "",
    customBankColor: CUSTOM_BANK_COLORS[0],
    lastFourDigits: "",
    cardLimit: "",
    balance: "",
    minimumPayment: "",
    dueDate: "",
  });

  const getBankCategories = () => {
    switch (i18n.language) {
      case 'en':
        return BANK_CATEGORIES_EN;
      case 'de':
        return BANK_CATEGORIES_DE;
      default:
        return BANK_CATEGORIES;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemoMode) {
      toast.info(t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz");
      return;
    }
    
    setLoading(true);

    let bankId: string;
    let bankName: string;

    if (isCustomBank) {
      if (!formData.customBankName.trim()) {
        toast.error(t('dialogs.enterBankName'));
        setLoading(false);
        return;
      }
      bankId = `custom_${Date.now()}`;
      bankName = formData.customBankName.trim();
    } else {
      const selectedBank = BANKS.find(b => b.id === formData.bankId);
      if (!selectedBank) {
        toast.error(t('dialogs.selectBankError'));
        setLoading(false);
        return;
      }
      bankId = formData.bankId;
      bankName = selectedBank.name;
    }

    const { error } = await supabase.from("credit_cards").insert({
      user_id: user!.id,
      name: formData.name,
      bank_id: bankId,
      bank_name: bankName,
      last_four_digits: formData.lastFourDigits,
      card_limit: parseFloat(formData.cardLimit) || 0,
      balance: parseFloat(formData.balance) || 0,
      minimum_payment: parseFloat(formData.minimumPayment) || 0,
      due_date: parseInt(formData.dueDate),
    });

    if (error) {
      toast.error(t('dialogs.cardAddError') + ": " + error.message);
    } else {
      toast.success(t('dialogs.cardAddSuccess'));
      setOpen(false);
      setFormData({
        name: "",
        bankId: "",
        customBankName: "",
        customBankColor: CUSTOM_BANK_COLORS[0],
        lastFourDigits: "",
        cardLimit: "",
        balance: "",
        minimumPayment: "",
        dueDate: "",
      });
      setIsCustomBank(false);
      onSuccess();
    }

    setLoading(false);
  };

  const categories = getBankCategories();
  const groupedBanks = Object.entries(categories)
    .filter(([category]) => category !== 'custom')
    .map(([category, label]) => ({
      category,
      label,
      banks: BANKS.filter(b => b.category === category),
    }))
    .filter(group => group.banks.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Plus className="h-5 w-5" />
          {t('dialogs.newCard')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dialogs.addCard')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-name">{t('dialogs.cardName')}</Label>
            <Input
              id="card-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('dialogs.bonusCard')}
              required
            />
          </div>

          {/* Bank Selection Type Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={!isCustomBank ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCustomBank(false)}
              className="flex-1"
            >
              {t('dialogs.selectFromList')}
            </Button>
            <Button
              type="button"
              variant={isCustomBank ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCustomBank(true)}
              className="flex-1"
            >
              <Building2 className="h-4 w-4 mr-1" />
              {t('dialogs.addCustomBank')}
            </Button>
          </div>

          {isCustomBank ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="customBankName">{t('dialogs.bankName')}</Label>
                <Input
                  id="customBankName"
                  value={formData.customBankName}
                  onChange={(e) => setFormData({ ...formData, customBankName: e.target.value })}
                  placeholder={t('dialogs.enterBankName')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('dialogs.bankColor')}</Label>
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_BANK_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        formData.customBankColor === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, customBankColor: color })}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="card-bank">{t('dialogs.bank')}</Label>
              <Select value={formData.bankId} onValueChange={(value) => setFormData({ ...formData, bankId: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('dialogs.selectBank')} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {groupedBanks.map((group) => (
                    <div key={group.category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        {group.label}
                      </div>
                      {group.banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: bank.color }}
                            />
                            <span className="truncate">{bank.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lastFour">{t('dialogs.lastFourDigits')}</Label>
            <Input
              id="lastFour"
              value={formData.lastFourDigits}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setFormData({ ...formData, lastFourDigits: value });
              }}
              placeholder="1234"
              maxLength={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">{t('dialogs.cardLimit')}</Label>
            <Input
              id="limit"
              type="number"
              step="0.01"
              value={formData.cardLimit}
              onChange={(e) => setFormData({ ...formData, cardLimit: e.target.value })}
              placeholder="10000.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-balance">{t('dialogs.currentDebt')}</Label>
            <Input
              id="card-balance"
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumPayment">{t('dialogs.minimumPayment')}</Label>
            <Input
              id="minimumPayment"
              type="number"
              step="0.01"
              value={formData.minimumPayment}
              onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">{t('dialogs.paymentDay')}</Label>
            <Input
              id="dueDate"
              type="number"
              min="1"
              max="28"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              placeholder="15"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              {t('dialogs.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t('dialogs.adding') : t('dialogs.add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
