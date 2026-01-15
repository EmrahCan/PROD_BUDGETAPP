import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { CreditCard, Trash2, Edit, LayoutGrid, List, Wallet, AlertTriangle, TrendingUp, PiggyBank } from "lucide-react";
import { CardDialog } from "@/components/cards/CardDialog";
import { EditCardDialog } from "@/components/cards/EditCardDialog";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { TURKISH_BANKS } from "@/types/bank";
import { BankLogo } from "@/components/BankLogo";
import { Button } from "@/components/ui/button";
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

interface CardType {
  id: string;
  name: string;
  bank_id: string;
  bank_name: string;
  last_four_digits: string;
  card_limit: number;
  balance: number;
  minimum_payment: number;
  currency: string;
  due_date: number;
}

export default function Cards() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCard, setEditCard] = useState<CardType | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { formatFromTRY } = useDisplayCurrency();

  const fetchCards = async () => {
    if (isDemoMode) {
      setCards(demoData.credit_cards as CardType[]);
      setLoading(false);
      return;
    }
    
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t('cards.cardsLoadError'));
      console.error(error);
    } else {
      setCards(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (isDemoMode) {
      toast.info(t('demo.actionNotAvailable') || "Bu işlem demo modunda kullanılamaz");
      return;
    }
    if (!confirm(t('cards.deleteCardConfirm'))) return;

    const { error } = await supabase.from("credit_cards").delete().eq("id", id);

    if (error) {
      toast.error(t('cards.cardDeleteError'));
    } else {
      toast.success(t('cards.cardDeleted'));
    }
  };

  useEffect(() => {
    if (user || isDemoMode) fetchCards();

    // Real-time subscription (only for authenticated users)
    if (!isDemoMode && user) {
      const channel = supabase
        .channel('cards-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'credit_cards',
          },
          () => {
            fetchCards();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isDemoMode]);

  const handleEdit = (card: CardType) => {
    setEditCard(card);
    setEditDialogOpen(true);
  };

  const getBankColor = (bankId: string) => {
    return TURKISH_BANKS.find(b => b.id === bankId)?.color || '#666';
  };

  // Calculate card usage percentage
  const getCardUsage = (card: CardType) => {
    if (card.card_limit <= 0) return 0;
    return Math.min(100, (card.balance / card.card_limit) * 100);
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalDebt = cards.reduce((sum, card) => sum + card.balance, 0);
    const totalMinPayment = cards.reduce((sum, card) => sum + card.minimum_payment, 0);
    const totalLimit = cards.reduce((sum, card) => sum + card.card_limit, 0);
    const totalAvailable = cards.reduce((sum, card) => sum + (card.card_limit - card.balance), 0);
    const avgUsage = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;
    const cardsWithDebt = cards.filter(card => card.balance > 0).length;
    
    return {
      totalDebt,
      totalMinPayment,
      totalLimit,
      totalAvailable,
      avgUsage,
      cardsWithDebt,
      cardCount: cards.length,
    };
  }, [cards]);

  const renderSummaryPanel = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
      {/* Total Debt */}
      <Card className="p-3 lg:p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-destructive/20 flex-shrink-0">
            <Wallet className="h-4 w-4 lg:h-5 lg:w-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{t('cards.summary.totalDebt')}</p>
            <p className="text-sm lg:text-lg font-bold text-destructive truncate">{formatFromTRY(summary.totalDebt)}</p>
          </div>
        </div>
      </Card>

      {/* Minimum Payment */}
      <Card className="p-3 lg:p-4 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-warning/20 flex-shrink-0">
            <AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{t('cards.summary.totalMinPayment')}</p>
            <p className="text-sm lg:text-lg font-bold text-warning truncate">{formatFromTRY(summary.totalMinPayment)}</p>
          </div>
        </div>
      </Card>

      {/* Available Credit */}
      <Card className="p-3 lg:p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-success/20 flex-shrink-0">
            <PiggyBank className="h-4 w-4 lg:h-5 lg:w-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{t('cards.summary.totalAvailable')}</p>
            <p className="text-sm lg:text-lg font-bold text-success truncate">{formatFromTRY(summary.totalAvailable)}</p>
          </div>
        </div>
      </Card>

      {/* Usage Rate */}
      <Card className="p-3 lg:p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-primary/20 flex-shrink-0">
            <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{t('cards.summary.avgUsage')}</p>
            <div className="flex items-center gap-1">
              <p className="text-sm lg:text-lg font-bold text-primary">{summary.avgUsage.toFixed(0)}%</p>
              <span className="text-[9px] lg:text-xs text-muted-foreground hidden sm:inline">
                ({summary.cardsWithDebt}/{summary.cardCount})
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
      {cards.map((card) => {
        const usagePercent = getCardUsage(card);
        return (
        <Card key={card.id} className="p-3 lg:p-4 shadow-medium hover:shadow-large transition-shadow">
          <div className="flex items-start justify-between mb-2 lg:mb-3">
            <BankLogo bankId={card.bank_id} bankName={card.bank_name} size="sm" className="lg:hidden" />
            <BankLogo bankId={card.bank_id} bankName={card.bank_name} size="md" className="hidden lg:flex" />
            <div className="flex gap-0.5 lg:gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 lg:h-7 lg:w-7 text-muted-foreground hover:text-primary"
                onClick={() => handleEdit(card)}
              >
                <Edit className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 lg:h-7 lg:w-7 text-destructive hover:text-destructive"
                onClick={() => handleDelete(card.id)}
              >
                <Trash2 className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              </Button>
            </div>
          </div>

          <h3 className="text-base lg:text-lg font-bold mb-0.5 truncate">{card.name}</h3>
          <p className="text-[10px] lg:text-xs text-muted-foreground mb-2 lg:mb-3">{card.bank_name}</p>

          <div className="flex items-center justify-between text-[10px] lg:text-xs mb-2 lg:mb-3">
            <div>
              <span className="text-muted-foreground">{t('cards.cardNumber')}: </span>
              <span className="font-mono">**** {card.last_four_digits}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('cards.paymentDay')}: </span>
              <span className="font-medium">{card.due_date}</span>
            </div>
          </div>

          {/* Usage Progress - Compact */}
          <div className="mb-2 lg:mb-3 p-1.5 lg:p-2 rounded-lg bg-muted/50 border">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[9px] lg:text-[10px] font-medium text-muted-foreground">{t('cards.usageRate')}</p>
              <p className="text-[9px] lg:text-[10px] font-semibold">{usagePercent.toFixed(0)}%</p>
            </div>
            <Progress 
              value={usagePercent} 
              className={`h-1 lg:h-1.5 ${usagePercent > 80 ? '[&>div]:bg-destructive' : usagePercent > 50 ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`}
            />
          </div>

          <div className="pt-2 lg:pt-3 border-t border-border space-y-1">
            <div className="flex justify-between items-center">
              <p className="text-[10px] lg:text-xs text-muted-foreground">{t('cards.debt')}</p>
              <p className="text-sm lg:text-base font-bold text-destructive">{formatCurrency(card.balance)}</p>
            </div>
            {card.minimum_payment > 0 && (
              <div className="flex justify-between items-center">
                <p className="text-[10px] lg:text-xs text-muted-foreground">{t('cards.minimumPayment')}</p>
                <p className="text-[10px] lg:text-xs font-semibold text-warning">{formatCurrency(card.minimum_payment)}</p>
              </div>
            )}
            <div className="flex justify-between items-center">
              <p className="text-[10px] lg:text-xs text-muted-foreground">{t('cards.limit')}</p>
              <p className="text-[10px] lg:text-xs font-medium">{formatCurrency(card.card_limit)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[10px] lg:text-xs text-muted-foreground">{t('cards.available')}</p>
              <p className="text-[10px] lg:text-xs font-medium text-success">
                {formatCurrency(card.card_limit - card.balance)}
              </p>
            </div>
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
            <TableHead>{t('cards.cardName')}</TableHead>
            <TableHead>{t('accounts.bank')}</TableHead>
            <TableHead>{t('cards.cardNumber')}</TableHead>
            <TableHead>{t('cards.paymentDay')}</TableHead>
            <TableHead className="text-right">{t('cards.limit')}</TableHead>
            <TableHead className="text-right">{t('cards.debt')}</TableHead>
            <TableHead className="text-right">{t('cards.minimumPayment')}</TableHead>
            <TableHead className="text-right">{t('cards.available')}</TableHead>
            <TableHead className="text-center">{t('cards.usageRate')}</TableHead>
            <TableHead className="text-center">{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card) => {
            const usagePercent = getCardUsage(card);
            return (
            <TableRow key={card.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <BankLogo bankId={card.bank_id} bankName={card.bank_name} size="sm" />
                  {card.name}
                </div>
              </TableCell>
              <TableCell>{card.bank_name}</TableCell>
              <TableCell className="font-mono">**** {card.last_four_digits}</TableCell>
              <TableCell>{card.due_date}</TableCell>
              <TableCell className="text-right">{formatCurrency(card.card_limit)}</TableCell>
              <TableCell className="text-right text-destructive font-semibold">
                {formatCurrency(card.balance)}
              </TableCell>
              <TableCell className="text-right text-warning font-medium">
                {card.minimum_payment > 0 ? formatCurrency(card.minimum_payment) : '-'}
              </TableCell>
              <TableCell className="text-right text-success font-medium">
                {formatCurrency(card.card_limit - card.balance)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-xs font-medium ${usagePercent > 80 ? 'text-destructive' : usagePercent > 50 ? 'text-warning' : 'text-success'}`}>
                    {usagePercent.toFixed(0)}%
                  </span>
                  <Progress 
                    value={usagePercent} 
                    className={`h-1 w-16 ${usagePercent > 80 ? '[&>div]:bg-destructive' : usagePercent > 50 ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`}
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(card)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(card.id)}
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
            <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-destructive to-destructive/60 shadow-lg flex-shrink-0">
              <CreditCard className="h-6 w-6 lg:h-8 lg:w-8 text-destructive-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-3xl font-bold text-foreground truncate">{t('cards.title')}</h1>
              <p className="text-xs lg:text-base text-muted-foreground hidden sm:block">{t('cards.manageCards')}</p>
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
            <CardDialog onSuccess={fetchCards} />
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : cards.length === 0 ? (
            <Card className="p-12 text-center shadow-medium">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-secondary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{t('cards.noCardsYet')}</h2>
                <p className="text-muted-foreground mb-6">
                  {t('cards.addFirstCard')}
                </p>
                <CardDialog onSuccess={fetchCards} />
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

      <EditCardDialog
        card={editCard}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchCards}
      />
    </Layout>
  );
}