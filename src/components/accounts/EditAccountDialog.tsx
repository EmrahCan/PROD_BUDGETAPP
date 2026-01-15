import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Account {
  id: string;
  name: string;
  bank_name: string;
  balance: number;
  overdraft_limit: number;
  overdraft_interest_rate: number;
  account_number: string | null;
  iban: string | null;
}

interface EditAccountDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditAccountDialog({ account, open, onOpenChange, onSuccess }: EditAccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    balance: "",
    overdraftLimit: "",
    overdraftInterestRate: "",
    accountNumber: "",
    iban: "",
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        balance: account.balance.toString(),
        overdraftLimit: account.overdraft_limit.toString(),
        overdraftInterestRate: (account.overdraft_interest_rate || 0).toString(),
        accountNumber: account.account_number || "",
        iban: account.iban || "",
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    
    setLoading(true);

    const { error } = await supabase
      .from("accounts")
      .update({
        name: formData.name,
        balance: parseFloat(formData.balance) || 0,
        overdraft_limit: parseFloat(formData.overdraftLimit) || 0,
        overdraft_interest_rate: parseFloat(formData.overdraftInterestRate) || 0,
        account_number: formData.accountNumber || null,
        iban: formData.iban || null,
      })
      .eq("id", account.id);

    if (error) {
      toast.error(t('accounts.accountUpdateError') + ": " + error.message);
    } else {
      toast.success(t('accounts.accountUpdated'));
      onOpenChange(false);
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('accounts.editAccount')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t('dialogs.accountName')}</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">{t('accounts.bank')}</p>
            <p className="font-medium">{account?.bank_name}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-accountNumber">{t('dialogs.accountNumber')}</Label>
            <Input
              id="edit-accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="12345678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-iban">{t('dialogs.iban')}</Label>
            <Input
              id="edit-iban"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              maxLength={32}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-balance">{t('accounts.balance')}</Label>
            <Input
              id="edit-balance"
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t('accounts.balanceDescription')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-overdraftLimit">{t('accounts.overdraftLimit')}</Label>
              <Input
                id="edit-overdraftLimit"
                type="number"
                step="0.01"
                min="0"
                value={formData.overdraftLimit}
                onChange={(e) => setFormData({ ...formData, overdraftLimit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-overdraftInterestRate">{t('accounts.overdraftInterestRate')}</Label>
              <Input
                id="edit-overdraftInterestRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.overdraftInterestRate}
                onChange={(e) => setFormData({ ...formData, overdraftInterestRate: e.target.value })}
                placeholder="%"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('dialogs.overdraftLimitDescription')}
          </p>

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
