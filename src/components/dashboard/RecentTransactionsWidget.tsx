import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, ArrowUpCircle, ArrowDownCircle, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useDateFormat } from "@/hooks/useDateFormat";
import { getCategoryConfig } from "@/utils/categoryConfig";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { groupedCategories } from "@/utils/categoryConfig";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: "income" | "expense";
  category: string;
  description: string | null;
  transaction_date: string;
  account_id?: string | null;
  card_id?: string | null;
}

export function RecentTransactionsWidget() {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { formatShortDateWithTime } = useDateFormat();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    category: "",
    description: "",
    transaction_type: "expense" as "income" | "expense",
  });

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("id, amount, transaction_type, category, description, transaction_date, account_id, card_id, created_at")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isDemoMode) {
      const demoTransactions = (demoData.transactions || [])
        .sort((a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, 5)
        .map((tr: any) => ({
          id: tr.id,
          amount: tr.amount,
          transaction_type: tr.transaction_type,
          category: tr.category,
          description: tr.description,
          transaction_date: tr.transaction_date,
        }));
      setTransactions(demoTransactions);
      setLoading(false);
      return;
    }

    if (!user) return;

    fetchTransactions();

    // Realtime subscription
    const channel = supabase
      .channel("recent-transactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isDemoMode, demoData]);

  const handleDelete = async () => {
    if (!deleteId || !user) return;

    try {
      // Get the transaction first to restore balances
      const transaction = transactions.find((tr) => tr.id === deleteId);
      if (!transaction) return;

      // Restore account balance if linked
      if (transaction.account_id) {
        const { data: account } = await supabase
          .from("accounts")
          .select("balance")
          .eq("id", transaction.account_id)
          .single();

        if (account) {
          const amount = Number(transaction.amount);
          const newBalance =
            transaction.transaction_type === "expense"
              ? Number(account.balance) + amount
              : Number(account.balance) - amount;

          await supabase
            .from("accounts")
            .update({ balance: newBalance })
            .eq("id", transaction.account_id);
        }
      }

      // Restore card balance if linked
      if (transaction.card_id) {
        const { data: card } = await supabase
          .from("credit_cards")
          .select("balance")
          .eq("id", transaction.card_id)
          .single();

        if (card) {
          const amount = Number(transaction.amount);
          const newBalance =
            transaction.transaction_type === "expense"
              ? Number(card.balance) - amount
              : Number(card.balance) + amount;

          await supabase
            .from("credit_cards")
            .update({ balance: newBalance })
            .eq("id", transaction.card_id);
        }
      }

      const { error } = await supabase.from("transactions").delete().eq("id", deleteId);

      if (error) throw error;
      toast.success(t("transactions.transactionDeleted"));
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setEditForm({
      amount: transaction.amount.toString(),
      category: transaction.category,
      description: transaction.description || "",
      transaction_type: transaction.transaction_type,
    });
  };

  const handleEdit = async () => {
    if (!editTransaction || !user) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          amount: parseFloat(editForm.amount),
          category: editForm.category,
          description: editForm.description || null,
          transaction_type: editForm.transaction_type,
        })
        .eq("id", editTransaction.id);

      if (error) throw error;
      toast.success(t("transactions.transactionUpdated"));
      setEditTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <>
      <Card className="border-2 border-border hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-2 lg:pb-4 px-3 lg:px-6 pt-3 lg:pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
              <CardTitle className="text-sm lg:text-lg">{t("dashboard.recentTransactions")}</CardTitle>
            </div>
            <Link to="/transactions">
              <Button variant="ghost" size="sm" className="gap-1 h-7 lg:h-8 text-xs lg:text-sm px-2 lg:px-3">
                {t("dashboard.viewAll")}
                <ArrowRight className="h-3 w-3 lg:h-4 lg:w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
          {loading ? (
            <div className="space-y-2 lg:space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 lg:gap-3">
                  <Skeleton className="w-8 h-8 lg:w-10 lg:h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3 lg:h-4 w-20 lg:w-24 mb-1" />
                    <Skeleton className="h-2 lg:h-3 w-14 lg:w-16" />
                  </div>
                  <Skeleton className="h-4 lg:h-5 w-16 lg:w-20" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-6 lg:py-8 text-muted-foreground">
              <Receipt className="h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs lg:text-sm">{t("dashboard.noRecentTransactions")}</p>
            </div>
          ) : (
            <div className="space-y-1.5 lg:space-y-3">
              {transactions.map((transaction) => {
                const config = getCategoryConfig(transaction.category);
                const IconComponent = config.icon;
                const isIncome = transaction.transaction_type === "income";

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors group"
                  >
                    <div
                      className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor}`}
                    >
                      <IconComponent className={`h-4 w-4 lg:h-5 lg:w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 lg:gap-2">
                        <p className="font-medium text-xs lg:text-sm truncate max-w-[100px] lg:max-w-none">
                          {t(`categories.${transaction.category}`, transaction.category) as string}
                        </p>
                        <Badge variant="outline" className="text-[9px] lg:text-xs flex-shrink-0 h-4 lg:h-5 px-1 lg:px-1.5">
                          {isIncome ? (
                            <ArrowUpCircle className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-0.5 lg:mr-1 text-green-500" />
                          ) : (
                            <ArrowDownCircle className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-0.5 lg:mr-1 text-red-500" />
                          )}
                          <span className="hidden sm:inline">{isIncome ? t("transactions.income") : t("transactions.expense")}</span>
                          <span className="sm:hidden">{isIncome ? "G" : "Ç"}</span>
                        </Badge>
                      </div>
                      <p className="text-[10px] lg:text-xs text-muted-foreground truncate">
                        {formatShortDateWithTime(transaction.transaction_date)}
                        {transaction.description && (
                          <span className="hidden sm:inline"> • {transaction.description}</span>
                        )}
                      </p>
                    </div>
                    <p
                      className={`text-xs lg:text-sm font-semibold flex-shrink-0 ${
                        isIncome ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                    {!isDemoMode && (
                      <div className="flex gap-0.5 lg:gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 lg:h-8 lg:w-8"
                          onClick={() => openEditDialog(transaction)}
                        >
                          <Pencil className="h-3 w-3 lg:h-4 lg:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 lg:h-8 lg:w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(transaction.id)}
                        >
                          <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transactions.deleteTransactionConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("fixedPayments.cannotBeUndone")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTransaction} onOpenChange={() => setEditTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("transactions.editTransaction")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("transactions.transactionType")}</Label>
              <Select
                value={editForm.transaction_type}
                onValueChange={(value: "income" | "expense") =>
                  setEditForm({ ...editForm, transaction_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{t("transactions.income")}</SelectItem>
                  <SelectItem value="expense">{t("transactions.expense")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("dialogs.amount")}</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("transactions.category")}</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(groupedCategories).map(([groupName, cats]) => {
                    const groupKey =
                      groupName === "Gelir"
                        ? "groupIncome"
                        : groupName === "Ev & Yaşam"
                        ? "groupHomeLife"
                        : groupName === "Market & Alışveriş"
                        ? "groupMarketShopping"
                        : groupName === "Ulaşım"
                        ? "groupTransport"
                        : groupName === "Yeme & İçme"
                        ? "groupFoodDrink"
                        : groupName === "Sağlık & Spor"
                        ? "groupHealthSport"
                        : groupName === "Eğlence & Hobi"
                        ? "groupEntertainment"
                        : groupName === "Eğitim"
                        ? "groupEducation"
                        : groupName === "Finans"
                        ? "groupFinance"
                        : groupName === "Abonelikler"
                        ? "groupSubscriptions"
                        : "groupOther";
                    return (
                      <div key={groupName}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {t(`categories.${groupKey}`)}
                        </div>
                        {cats.map((cat) => {
                          const catConfig = getCategoryConfig(cat);
                          const CatIcon = catConfig.icon;
                          return (
                            <SelectItem key={cat} value={cat}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-5 h-5 rounded flex items-center justify-center ${catConfig.bgColor}`}
                                >
                                  <CatIcon className={`h-3 w-3 ${catConfig.color}`} />
                                </div>
                                {t(`categories.${cat}`, cat) as string}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("dialogs.description")}</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder={t("dialogs.descriptionPlaceholder")}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditTransaction(null)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleEdit}>{t("common.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
