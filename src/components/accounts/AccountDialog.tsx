import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2 } from "lucide-react";
import { BANKS, BANK_CATEGORIES, BANK_CATEGORIES_EN, BANK_CATEGORIES_DE, CUSTOM_BANK_COLORS, type Bank } from "@/types/bank";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface AccountDialogProps {
  onSuccess: () => void;
}

export function AccountDialog({ onSuccess }: AccountDialogProps) {
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
    accountNumber: "",
    iban: "",
    balance: "",
    overdraftLimit: "",
    overdraftInterestRate: "",
    accountType: "checking" as "checking" | "savings",
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

    const { error } = await supabase.from("accounts").insert({
      user_id: user!.id,
      name: formData.name,
      bank_id: bankId,
      bank_name: bankName,
      account_number: formData.accountNumber || null,
      iban: formData.iban || null,
      balance: parseFloat(formData.balance) || 0,
      overdraft_limit: parseFloat(formData.overdraftLimit) || 0,
      overdraft_interest_rate: parseFloat(formData.overdraftInterestRate) || 0,
      account_type: formData.accountType,
    });

    if (error) {
      toast.error(t('dialogs.accountAddError') + ": " + error.message);
    } else {
      toast.success(t('dialogs.accountAddSuccess'));
      setOpen(false);
      setFormData({
        name: "",
        bankId: "",
        customBankName: "",
        customBankColor: CUSTOM_BANK_COLORS[0],
        accountNumber: "",
        iban: "",
        balance: "",
        overdraftLimit: "",
        overdraftInterestRate: "",
        accountType: "checking",
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
        <Button className="gap-2">
          <Plus className="h-5 w-5" />
          {t('dialogs.newAccount')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dialogs.addAccount')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('dialogs.accountName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('dialogs.mainAccount')}
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
              <Label htmlFor="bank">{t('dialogs.bank')}</Label>
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
            <Label htmlFor="accountType">{t('dialogs.accountType')}</Label>
            <Select value={formData.accountType} onValueChange={(value: "checking" | "savings") => setFormData({ ...formData, accountType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">{t('dialogs.checkingAccount')}</SelectItem>
                <SelectItem value="savings">{t('dialogs.savingsAccount')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">{t('dialogs.accountNumber')}</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="12345678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">{t('dialogs.iban')}</Label>
            <Input
              id="iban"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              maxLength={32}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">{t('dialogs.initialBalance')}</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="overdraftLimit">{t('dialogs.overdraftLimit')}</Label>
              <Input
                id="overdraftLimit"
                type="number"
                step="0.01"
                min="0"
                value={formData.overdraftLimit}
                onChange={(e) => setFormData({ ...formData, overdraftLimit: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overdraftInterestRate">{t('dialogs.overdraftInterestRate')}</Label>
              <Input
                id="overdraftInterestRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.overdraftInterestRate}
                onChange={(e) => setFormData({ ...formData, overdraftInterestRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('dialogs.overdraftLimitDescription')}
          </p>


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
