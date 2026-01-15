import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Wallet, Trash2, Edit, LayoutGrid, List, TrendingUp, PiggyBank, AlertTriangle, Building2 } from "lucide-react";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { EditAccountDialog } from "@/components/accounts/EditAccountDialog";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { TURKISH_BANKS } from "@/types/bank";
import { BankLogo } from "@/components/BankLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Account {
  id: string;
  name: string;
  bank_id: string;
  bank_name: string;
  account_number: string | null;
  iban: string | null;
  balance: number;
  overdraft_limit: number;
  overdraft_interest_rate: number;
  currency: string;
  account_type: string;
}

const formatIBAN = (iban: string | null) => {
  if (!iban) return null;
  return iban.replace(/(.{4})/g, '$1 ').trim();
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { formatFromTRY } = useDisplayCurrency();

  const fetchAccounts = async () => {
    if (isDemoMode) {
      setAccounts(demoData.accounts as Account[]);
      setLoading(false);
      return;
    }
    
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t('accounts.accountsLoadError'));
      console.error(error);
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (isDemoMode) {
      toast.info(t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz");
      return;
    }
    if (!confirm(t('accounts.deleteAccountConfirm'))) return;

    const { error } = await supabase.from("accounts").delete().eq("id", id);

    if (error) {
      toast.error(t('accounts.accountDeleteError'));
    } else {
      toast.success(t('accounts.accountDeleted'));
    }
  };

  useEffect(() => {
    if (user || isDemoMode) fetchAccounts();

    // Real-time subscription (only for authenticated users)
    if (!isDemoMode && user) {
      const channel = supabase
        .channel('accounts-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'accounts',
          },
          () => {
            fetchAccounts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isDemoMode]);

  const handleEdit = (account: Account) => {
    setEditAccount(account);
    setEditDialogOpen(true);
  };

  const getBankColor = (bankId: string) => {
    return TURKISH_BANKS.find(b => b.id === bankId)?.color || '#666';
  };

  // Calculate overdraft usage for an account
  const getOverdraftUsage = (account: Account) => {
    if (account.overdraft_limit <= 0) return { used: 0, remaining: account.overdraft_limit, percentage: 0, monthlyInterest: 0 };
    
    // If balance is negative, we're using overdraft
    const used = account.balance < 0 ? Math.abs(account.balance) : 0;
    const remaining = Math.max(0, account.overdraft_limit - used);
    const percentage = (used / account.overdraft_limit) * 100;
    
    // Calculate monthly interest: (used amount * annual rate / 100) / 12
    const annualRate = account.overdraft_interest_rate || 0;
    const monthlyInterest = (used * annualRate / 100) / 12;
    
    return { used, remaining, percentage: Math.min(100, percentage), monthlyInterest };
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalOverdraftLimit = accounts.reduce((sum, acc) => sum + acc.overdraft_limit, 0);
    const totalOverdraftUsed = accounts.reduce((sum, acc) => {
      return sum + (acc.balance < 0 ? Math.abs(acc.balance) : 0);
    }, 0);
    const totalAvailable = accounts.reduce((sum, acc) => sum + acc.balance + acc.overdraft_limit, 0);
    const positiveAccounts = accounts.filter(acc => acc.balance >= 0).length;
    const negativeAccounts = accounts.filter(acc => acc.balance < 0).length;
    
    return {
      totalBalance,
      totalOverdraftLimit,
      totalOverdraftUsed,
      totalAvailable,
      positiveAccounts,
      negativeAccounts,
      accountCount: accounts.length,
    };
  }, [accounts]);

  const renderSummaryPanel = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
      {/* Total Balance */}
      <Card className={`p-3 lg:p-4 bg-gradient-to-br ${summary.totalBalance >= 0 ? 'from-success/10 to-success/5 border-success/20' : 'from-destructive/10 to-destructive/5 border-destructive/20'}`}>
        <div className="flex items-center gap-2 lg:gap-3">
          <div className={`p-1.5 lg:p-2 rounded-lg ${summary.totalBalance >= 0 ? 'bg-success/20' : 'bg-destructive/20'} flex-shrink-0`}>
            <Wallet className={`h-4 w-4 lg:h-5 lg:w-5 ${summary.totalBalance >= 0 ? 'text-success' : 'text-destructive'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{t('accounts.summary.totalBalance')}</p>
            <p className={`text-sm lg:text-lg font-bold truncate ${summary.totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatFromTRY(summary.totalBalance)}
            </p>
          </div>
        </div>
      </Card>

      {/* Available Balance (including overdraft) */}
      <Card className="p-3 lg:p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-primary/20 flex-shrink-0">
            <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{t('accounts.summary.totalAvailable')}</p>
            <p className="text-sm lg:text-lg font-bold text-primary truncate">{formatFromTRY(summary.totalAvailable)}</p>
          </div>
        </div>
      </Card>

      {/* Total Overdraft Limit */}
      <Card className="p-3 lg:p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-secondary/20 flex-shrink-0">
            <PiggyBank className="h-4 w-4 lg:h-5 lg:w-5 text-secondary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{t('accounts.summary.overdraftLimit')}</p>
            <p className="text-sm lg:text-lg font-bold truncate">{formatFromTRY(summary.totalOverdraftLimit)}</p>
          </div>
        </div>
      </Card>

      {/* Account Status */}
      <Card className="p-3 lg:p-4 bg-gradient-to-br from-muted to-muted/50 border-border">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-muted-foreground/10 flex-shrink-0">
            <Building2 className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{t('accounts.summary.accountStatus')}</p>
            <div className="flex items-center gap-1 lg:gap-2">
              <p className="text-sm lg:text-lg font-bold">{summary.accountCount}</p>
              {summary.negativeAccounts > 0 && (
                <span className="text-[9px] lg:text-xs text-destructive flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                  <span className="hidden sm:inline">{summary.negativeAccounts} {t('accounts.summary.negative')}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
      {accounts.map((account) => {
        const overdraft = getOverdraftUsage(account);
        return (
        <Card key={account.id} className="p-3 lg:p-4 shadow-medium hover:shadow-large transition-shadow">
          <div className="flex items-start justify-between mb-2 lg:mb-3">
            <BankLogo bankId={account.bank_id} bankName={account.bank_name} size="sm" className="lg:hidden" />
            <BankLogo bankId={account.bank_id} bankName={account.bank_name} size="md" className="hidden lg:flex" />
            <div className="flex gap-0.5 lg:gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 lg:h-7 lg:w-7 text-muted-foreground hover:text-primary"
                onClick={() => handleEdit(account)}
              >
                <Edit className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 lg:h-7 lg:w-7 text-destructive hover:text-destructive"
                onClick={() => handleDelete(account.id)}
              >
                <Trash2 className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              </Button>
            </div>
          </div>

          <h3 className="text-base lg:text-lg font-bold mb-0.5 truncate">{account.name}</h3>
          <p className="text-[10px] lg:text-xs text-muted-foreground mb-2 lg:mb-3">{account.bank_name}</p>

          <div className="space-y-1 lg:space-y-1.5 mb-2 lg:mb-3 text-[10px] lg:text-xs">
            {account.iban && (
              <div className="hidden lg:block">
                <p className="text-muted-foreground">IBAN</p>
                <p className="font-mono">{formatIBAN(account.iban)}</p>
              </div>
            )}
            {account.account_number && (
              <div className="hidden lg:block">
                <p className="text-muted-foreground">{t('accounts.accountNo')}</p>
                <p className="font-mono">{account.account_number}</p>
              </div>
            )}
            <div className="flex items-center gap-1">
              <p className="text-muted-foreground">{t('accounts.accountType')}:</p>
              <p className="font-medium">
                {account.account_type === 'checking' ? t('accounts.accountType_checking') : t('accounts.accountType_savings')}
              </p>
            </div>
          </div>

          {/* Overdraft Usage Section - Compact on mobile */}
          {account.overdraft_limit > 0 && (
            <div className="mb-2 lg:mb-3 p-1.5 lg:p-2 rounded-lg bg-muted/50 border">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1">
                  <p className="text-[9px] lg:text-[10px] font-medium text-muted-foreground">{t('accounts.overdraftLimit')}</p>
                  {account.overdraft_interest_rate > 0 && (
                    <span className="text-[8px] lg:text-[9px] text-warning font-medium">(%{account.overdraft_interest_rate})</span>
                  )}
                </div>
                <p className="text-[9px] lg:text-[10px] font-semibold">{formatCurrency(account.overdraft_limit)}</p>
              </div>
              <Progress 
                value={overdraft.percentage} 
                className={`h-1 lg:h-1.5 mb-1 ${overdraft.percentage > 80 ? '[&>div]:bg-destructive' : overdraft.percentage > 50 ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`}
              />
              <div className="flex justify-between text-[9px] lg:text-[10px]">
                <span className={overdraft.used > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                  {t('accounts.overdraftUsed')}: {formatCurrency(overdraft.used)}
                </span>
                <span className="text-success">
                  {t('accounts.overdraftRemaining')}: {formatCurrency(overdraft.remaining)}
                </span>
              </div>
              {/* Monthly Interest Display */}
              {overdraft.monthlyInterest > 0 && (
                <div className="mt-1 pt-1 border-t border-border/50 flex justify-between text-[9px] lg:text-[10px]">
                  <span className="text-warning font-medium">{t('accounts.overdraftInterest')}:</span>
                  <span className="text-warning font-semibold">{formatCurrency(overdraft.monthlyInterest)}</span>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 lg:pt-3 border-t border-border">
            <p className="text-[10px] lg:text-xs text-muted-foreground mb-0.5">{t('accounts.balance')}</p>
            <p className={`text-lg lg:text-xl font-bold ${account.balance < 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(account.balance)}
            </p>
            {account.overdraft_limit > 0 && (
              <div className="mt-1 lg:mt-1.5">
                <p className="text-[9px] lg:text-[10px] text-muted-foreground">{t('accounts.availableBalance')}</p>
                <p className="text-[10px] lg:text-xs font-medium text-primary">
                  {formatCurrency(account.balance + account.overdraft_limit)}
                </p>
              </div>
            )}
          </div>
        </Card>
      )})}
    </div>
  );

  const renderListView = () => (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('accounts.accountName')}</TableHead>
            <TableHead>{t('accounts.bank')}</TableHead>
            <TableHead>{t('accounts.accountType')}</TableHead>
            <TableHead className="text-right">{t('accounts.balance')}</TableHead>
            <TableHead className="text-right">{t('accounts.overdraftLimit')}</TableHead>
            <TableHead className="text-right">{t('accounts.overdraftInterestRate')}</TableHead>
            <TableHead className="text-right">{t('accounts.overdraftUsed')}</TableHead>
            <TableHead className="text-right">{t('accounts.overdraftInterest')}</TableHead>
            <TableHead className="text-right">{t('accounts.availableBalance')}</TableHead>
            <TableHead className="text-center">{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const overdraft = getOverdraftUsage(account);
            return (
            <TableRow key={account.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <BankLogo bankId={account.bank_id} bankName={account.bank_name} size="sm" />
                  {account.name}
                </div>
              </TableCell>
              <TableCell>{account.bank_name}</TableCell>
              <TableCell>
                {account.account_type === 'checking' ? t('accounts.accountType_checking') : t('accounts.accountType_savings')}
              </TableCell>
              <TableCell className={`text-right font-semibold ${account.balance < 0 ? 'text-destructive' : ''}`}>
                {formatCurrency(account.balance)}
              </TableCell>
              <TableCell className="text-right">
                {account.overdraft_limit > 0 ? formatCurrency(account.overdraft_limit) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {account.overdraft_interest_rate > 0 ? `%${account.overdraft_interest_rate}` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {account.overdraft_limit > 0 ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className={overdraft.used > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                      {formatCurrency(overdraft.used)}
                    </span>
                    {overdraft.used > 0 && (
                      <Progress 
                        value={overdraft.percentage} 
                        className={`h-1 w-16 ${overdraft.percentage > 80 ? '[&>div]:bg-destructive' : overdraft.percentage > 50 ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`}
                      />
                    )}
                  </div>
                ) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {overdraft.monthlyInterest > 0 ? (
                  <span className="text-warning font-medium">{formatCurrency(overdraft.monthlyInterest)}</span>
                ) : '-'}
              </TableCell>
              <TableCell className="text-right text-primary font-medium">
                {formatCurrency(account.balance + account.overdraft_limit)}
              </TableCell>
              <TableCell>
                <div className="flex justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(account)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(account.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg flex-shrink-0">
              <Wallet className="h-6 w-6 lg:h-8 lg:w-8 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-3xl font-bold text-foreground truncate">{t('accounts.title')}</h1>
              <p className="text-xs lg:text-base text-muted-foreground hidden sm:block">{t('accounts.manageAccounts')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
            <div className="flex bg-muted rounded-lg p-0.5 lg:p-1">
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="h-7 w-7 lg:h-8 lg:w-8 p-0"
              >
                <LayoutGrid className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-7 w-7 lg:h-8 lg:w-8 p-0"
              >
                <List className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </Button>
            </div>
            <AccountDialog onSuccess={fetchAccounts} />
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <Skeleton className="w-8 h-8 rounded" />
                  </div>
                  <Skeleton className="h-7 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <div className="space-y-3 mb-4">
                    <div>
                      <Skeleton className="h-3 w-12 mb-1" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div>
                      <Skeleton className="h-3 w-16 mb-1" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div>
                      <Skeleton className="h-3 w-8 mb-1" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                </Card>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <Card className="p-12 text-center shadow-medium">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{t('accounts.noAccountsYet')}</h2>
                <p className="text-muted-foreground mb-6">
                  {t('accounts.addFirstAccount')}
                </p>
                <AccountDialog onSuccess={fetchAccounts} />
              </div>
            </Card>
          ) : (
            <>
              {renderSummaryPanel()}
              {viewMode === 'card' ? renderCardView() : renderListView()}
            </>
          )}
        </div>
      </div>

      <EditAccountDialog
        account={editAccount}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchAccounts}
      />
    </Layout>
  );
}