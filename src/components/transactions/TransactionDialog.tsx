import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ReceiptScanner } from "./ReceiptScanner";
import { getCategoryConfig, groupedCategories } from "@/utils/categoryConfig";

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  category: string | null;
  brand: string | null;
}

interface TransactionDialogProps {
  transaction?: any;
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Kategoriler artık categoryConfig.ts'den alınıyor

export function TransactionDialog({ transaction, onSuccess, open: controlledOpen, onOpenChange: controlledOnOpenChange }: TransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<ReceiptItem[]>([]);
  
  // Use controlled or internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };
  
  const [formData, setFormData] = useState({
    transaction_type: transaction?.transaction_type || "expense",
    amount: transaction?.amount || "",
    currency: transaction?.currency || "TRY",
    category: transaction?.category || "",
    description: transaction?.description || "",
    account_id: transaction?.account_id || "",
    card_id: transaction?.card_id || "",
    payment_card_id: "", // Kredi kartı ödemesi için hedef kart
    transaction_date: transaction?.transaction_date ? new Date(transaction.transaction_date) : new Date(),
    receipt_image_url: transaction?.receipt_image_url || "",
  });

  // Reset form when transaction changes (for edit mode)
  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_type: transaction.transaction_type || "expense",
        amount: transaction.amount || "",
        currency: transaction.currency || "TRY",
        category: transaction.category || "",
        description: transaction.description || "",
        account_id: transaction.account_id || "",
        card_id: transaction.card_id || "",
        payment_card_id: "",
        transaction_date: transaction.transaction_date ? new Date(transaction.transaction_date) : new Date(),
        receipt_image_url: transaction.receipt_image_url || "",
      });
    }
  }, [transaction]);

  const handleReceiptData = (data: {
    amount: string;
    category: string;
    description: string;
    currency: string;
    date?: Date;
    receiptImageUrl?: string;
    accountId?: string;
    cardId?: string;
    items?: ReceiptItem[];
  }) => {
    setFormData(prev => ({
      ...prev,
      amount: data.amount,
      category: data.category,
      description: data.description,
      currency: data.currency,
      transaction_type: "expense",
      transaction_date: data.date || prev.transaction_date,
      receipt_image_url: data.receiptImageUrl || "",
      account_id: data.accountId || "",
      card_id: data.cardId || ""
    }));
    if (data.items && data.items.length > 0) {
      setPendingItems(data.items);
    }
    setOpen(true);
  };

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

    const newAmount = parseFloat(formData.amount);
    const data: any = {
      user_id: user.id,
      transaction_type: formData.transaction_type === "card_payment" ? "expense" : formData.transaction_type,
      amount: newAmount,
      currency: formData.currency,
      category: formData.category || (formData.transaction_type === "card_payment" ? "Kredi Kartı Ödemesi" : ""),
      description: formData.description,
      account_id: formData.account_id || null,
      card_id: formData.transaction_type === "card_payment" ? formData.payment_card_id : (formData.card_id || null),
      transaction_date: format(formData.transaction_date, "yyyy-MM-dd"),
    };

    if (formData.receipt_image_url) {
      data.receipt_image_url = formData.receipt_image_url;
    }

    try {
      if (transaction) {
        // Calculate balance differences for edit
        const oldAmount = Number(transaction.amount);
        const oldType = transaction.transaction_type;
        const oldAccountId = transaction.account_id;
        const oldCardId = transaction.card_id;
        const newAccountId = formData.account_id || null;
        const newCardId = formData.card_id || null;

        // Restore old account balance
        if (oldAccountId) {
          const { data: oldAccount } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", oldAccountId)
            .single();

          if (oldAccount) {
            const restoredBalance = oldType === "expense"
              ? Number(oldAccount.balance) + oldAmount
              : Number(oldAccount.balance) - oldAmount;

            await supabase
              .from("accounts")
              .update({ balance: restoredBalance })
              .eq("id", oldAccountId);
          }
        }

        // Restore old card balance
        if (oldCardId) {
          const { data: oldCard } = await supabase
            .from("credit_cards")
            .select("balance")
            .eq("id", oldCardId)
            .single();

          if (oldCard) {
            const restoredBalance = oldType === "expense"
              ? Number(oldCard.balance) - oldAmount
              : Number(oldCard.balance) + oldAmount;

            await supabase
              .from("credit_cards")
              .update({ balance: restoredBalance })
              .eq("id", oldCardId);
          }
        }

        // Apply new account balance
        if (newAccountId) {
          const { data: newAccount } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", newAccountId)
            .single();

          if (newAccount) {
            const updatedBalance = formData.transaction_type === "expense"
              ? Number(newAccount.balance) - newAmount
              : Number(newAccount.balance) + newAmount;

            await supabase
              .from("accounts")
              .update({ balance: updatedBalance })
              .eq("id", newAccountId);
          }
        }

        // Apply new card balance
        if (newCardId) {
          const { data: newCard } = await supabase
            .from("credit_cards")
            .select("balance")
            .eq("id", newCardId)
            .single();

          if (newCard) {
            const updatedBalance = formData.transaction_type === "expense"
              ? Number(newCard.balance) + newAmount
              : Number(newCard.balance) - newAmount;

            await supabase
              .from("credit_cards")
              .update({ balance: updatedBalance })
              .eq("id", newCardId);
          }
        }

        const { error } = await supabase
          .from("transactions")
          .update(data)
          .eq("id", transaction.id);
        if (error) throw error;
        toast.success(t('dialogs.transactionUpdated'));
      } else {
        // Handle card payment - reduce credit card balance
        if (formData.transaction_type === "card_payment" && formData.payment_card_id) {
          const { data: paymentCard } = await supabase
            .from("credit_cards")
            .select("balance, minimum_payment, name")
            .eq("id", formData.payment_card_id)
            .single();

          if (paymentCard) {
            const newBalance = Math.max(0, Number(paymentCard.balance) - newAmount);
            const updateData: any = { balance: newBalance };
            
            // Reset minimum payment if balance is fully paid
            if (newBalance <= 0) {
              updateData.minimum_payment = 0;
            }

            await supabase
              .from("credit_cards")
              .update(updateData)
              .eq("id", formData.payment_card_id);
          }

          // Deduct from source account if selected
          if (formData.account_id) {
            const { data: account } = await supabase
              .from("accounts")
              .select("balance")
              .eq("id", formData.account_id)
              .single();

            if (account) {
              await supabase
                .from("accounts")
                .update({ balance: Number(account.balance) - newAmount })
                .eq("id", formData.account_id);
            }
          }
        } else {
          // New transaction - update balance
          if (formData.account_id) {
            const { data: account } = await supabase
              .from("accounts")
              .select("balance")
              .eq("id", formData.account_id)
              .single();

            if (account) {
              const updatedBalance = formData.transaction_type === "expense"
                ? Number(account.balance) - newAmount
                : Number(account.balance) + newAmount;

              await supabase
                .from("accounts")
                .update({ balance: updatedBalance })
                .eq("id", formData.account_id);
            }
          }

          if (formData.card_id) {
            const { data: card } = await supabase
              .from("credit_cards")
              .select("balance")
              .eq("id", formData.card_id)
              .single();

            if (card) {
              const updatedBalance = formData.transaction_type === "expense"
                ? Number(card.balance) + newAmount
                : Number(card.balance) - newAmount;

              await supabase
                .from("credit_cards")
                .update({ balance: updatedBalance })
                .eq("id", formData.card_id);
            }
          }
        }

        const { data: insertedTransaction, error } = await supabase
          .from("transactions")
          .insert([data])
          .select()
          .single();
        if (error) throw error;
        
        // Save receipt items if any
        if (pendingItems.length > 0 && insertedTransaction) {
          const itemsToInsert = pendingItems.map(item => ({
            user_id: user.id,
            transaction_id: insertedTransaction.id,
            name: item.name,
            quantity: item.quantity || 1,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category: item.category,
            brand: item.brand,
            transaction_date: formData.transaction_date ? format(formData.transaction_date, 'yyyy-MM-dd') : null
          }));
          
          const { error: itemsError } = await supabase
            .from("receipt_items")
            .insert(itemsToInsert);
          
          if (itemsError) {
            console.error("Error saving receipt items:", itemsError);
          }
        }
        
        toast.success(t('dialogs.transactionAdded'));
      }
      
      setOpen(false);
      onSuccess();
      setFormData({
        transaction_type: "expense",
        amount: "",
        currency: "TRY",
        category: "",
        description: "",
        account_id: "",
        card_id: "",
        payment_card_id: "",
        transaction_date: new Date(),
        receipt_image_url: "",
      });
      setPendingItems([]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // If controlled mode (for editing), don't render wrapper or trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? t('dialogs.editTransaction') : t('dialogs.newTransaction')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('dialogs.transactionType')}</Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value) => setFormData({ ...formData, transaction_type: value, category: value === "card_payment" ? "Kredi Kartı Ödemesi" : formData.category, card_id: value === "card_payment" ? "" : formData.card_id })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">{t('dialogs.income')}</SelectItem>
                <SelectItem value="expense">{t('dialogs.expense')}</SelectItem>
                <SelectItem value="card_payment">{t('dialogs.cardPayment')}</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectValue placeholder={t('dialogs.selectCategory')} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(groupedCategories).map(([groupName, cats]) => (
                  <div key={groupName}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                      {groupName}
                    </div>
                    {cats.map((cat) => {
                      const config = getCategoryConfig(cat);
                      const IconComponent = config.icon;
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${config.bgColor}`}>
                              <IconComponent className={`h-3 w-3 ${config.color}`} />
                            </div>
                            {cat}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Credit card payment target - only show when card_payment is selected */}
          {formData.transaction_type === "card_payment" && (
            <div className="space-y-2">
              <Label>{t('dialogs.targetCreditCard')} *</Label>
              <Select
                value={formData.payment_card_id}
                onValueChange={(value) => setFormData({ ...formData, payment_card_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('dialogs.selectCard')} />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} ({card.bank_name}) - {t('dialogs.debt')}: {Number(card.balance).toLocaleString('tr-TR')} {card.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Source account for card payment OR regular account/card selection */}
          <div className="space-y-2">
            <Label>{formData.transaction_type === "card_payment" ? t('dialogs.sourceAccount') : t('dialogs.accountOrCard')}</Label>
            <Select
              value={formData.account_id ? `account-${formData.account_id}` : formData.card_id ? `card-${formData.card_id}` : undefined}
              onValueChange={(value) => {
                if (value.startsWith("account-")) {
                  setFormData({ ...formData, account_id: value.replace("account-", ""), card_id: "" });
                } else if (value.startsWith("card-")) {
                  setFormData({ ...formData, card_id: value.replace("card-", ""), account_id: "" });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('dialogs.select')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={`account-${acc.id}`}>
                    {acc.name} ({acc.bank_name})
                  </SelectItem>
                ))}
                {/* Only show cards in normal mode, not for card_payment */}
                {formData.transaction_type !== "card_payment" && cards.map((card) => (
                  <SelectItem key={card.id} value={`card-${card.id}`}>
                    {card.name} ({card.bank_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.transaction_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.transaction_date ? format(formData.transaction_date, "PPP", { locale: tr }) : t('dialogs.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.transaction_date}
                  onSelect={(date) => date && setFormData({ ...formData, transaction_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.description')}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('dialogs.optional')}
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

  return (
    <div className="flex gap-2">
      {!transaction && (
        <ReceiptScanner onReceiptScanned={handleReceiptData} />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-1 lg:gap-2 h-7 lg:h-9 px-2 lg:px-4 text-xs lg:text-sm">
            <Plus className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
            <span className="hidden sm:inline">{transaction ? t('dialogs.edit') : t('dialogs.addTransaction')}</span>
            <span className="sm:hidden">{transaction ? t('dialogs.edit') : t('transactions.addShort')}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? t('dialogs.editTransaction') : t('dialogs.newTransaction')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('dialogs.transactionType')}</Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value) => setFormData({ ...formData, transaction_type: value, category: value === "card_payment" ? "Kredi Kartı Ödemesi" : formData.category, card_id: value === "card_payment" ? "" : formData.card_id })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">{t('dialogs.income')}</SelectItem>
                <SelectItem value="expense">{t('dialogs.expense')}</SelectItem>
                <SelectItem value="card_payment">{t('dialogs.cardPayment')}</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectValue placeholder={t('dialogs.selectCategory')} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(groupedCategories).map(([groupName, cats]) => (
                  <div key={groupName}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                      {groupName}
                    </div>
                    {cats.map((cat) => {
                      const config = getCategoryConfig(cat);
                      const IconComponent = config.icon;
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${config.bgColor}`}>
                              <IconComponent className={`h-3 w-3 ${config.color}`} />
                            </div>
                            {cat}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Credit card payment target - only show when card_payment is selected */}
          {formData.transaction_type === "card_payment" && (
            <div className="space-y-2">
              <Label>{t('dialogs.targetCreditCard')} *</Label>
              <Select
                value={formData.payment_card_id}
                onValueChange={(value) => setFormData({ ...formData, payment_card_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('dialogs.selectCard')} />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} ({card.bank_name}) - {t('dialogs.debt')}: {Number(card.balance).toLocaleString('tr-TR')} {card.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Source account for card payment OR regular account/card selection */}
          <div className="space-y-2">
            <Label>{formData.transaction_type === "card_payment" ? t('dialogs.sourceAccount') : t('dialogs.accountOrCard')}</Label>
            <Select
              value={formData.account_id ? `account-${formData.account_id}` : formData.card_id ? `card-${formData.card_id}` : undefined}
              onValueChange={(value) => {
                if (value.startsWith("account-")) {
                  setFormData({ ...formData, account_id: value.replace("account-", ""), card_id: "" });
                } else if (value.startsWith("card-")) {
                  setFormData({ ...formData, card_id: value.replace("card-", ""), account_id: "" });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('dialogs.select')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={`account-${acc.id}`}>
                    {acc.name} ({acc.bank_name})
                  </SelectItem>
                ))}
                {/* Only show cards in normal mode, not for card_payment */}
                {formData.transaction_type !== "card_payment" && cards.map((card) => (
                  <SelectItem key={card.id} value={`card-${card.id}`}>
                    {card.name} ({card.bank_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.transaction_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.transaction_date ? format(formData.transaction_date, "PPP", { locale: tr }) : t('dialogs.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.transaction_date}
                  onSelect={(date) => date && setFormData({ ...formData, transaction_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t('dialogs.description')}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('dialogs.optional')}
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
    </div>
  );
}