import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Bitcoin, TrendingUp, TrendingDown, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

interface CryptoHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;
}

interface CryptoPrice {
  symbol: string;
  price: number;
  priceChangePercent: number;
}

export function CryptoWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currency, formatAmount } = useDisplayCurrency();
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchHoldings();
    }
  }, [user]);

  useEffect(() => {
    if (holdings.length > 0) {
      fetchPrices();
    }
  }, [holdings, currency]);

  const fetchHoldings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('crypto_holdings')
        .select('id, symbol, name, quantity, purchase_price')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setHoldings(data || []);
    } catch (error) {
      console.error('Error fetching holdings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    if (holdings.length === 0) return;
    
    setRefreshing(true);
    try {
      const symbols = [...new Set(holdings.map(h => h.symbol))];
      
      const { data, error } = await supabase.functions.invoke('crypto-prices', {
        body: { symbols, targetCurrency: currency }
      });

      if (error) throw error;
      
      const priceMap: Record<string, CryptoPrice> = {};
      data.prices?.forEach((p: CryptoPrice) => {
        priceMap[p.symbol] = p;
      });
      setPrices(priceMap);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchPrices();
  };

  // Calculate totals
  const calculatePortfolioStats = () => {
    let totalValue = 0;
    let totalCost = 0;
    
    holdings.forEach(holding => {
      const currentPrice = prices[holding.symbol]?.price || 0;
      totalValue += holding.quantity * currentPrice;
      totalCost += holding.quantity * holding.purchase_price;
    });

    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return { totalValue, totalCost, totalPnL, totalPnLPercent };
  };

  const stats = calculatePortfolioStats();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-orange-500" />
            {t('nav.crypto')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300" onClick={() => navigate('/crypto')}>
        <CardContent className="p-6 text-center">
          <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 w-fit mx-auto mb-3">
            <Bitcoin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="font-medium">{t('crypto.title')}</p>
          <p className="text-sm text-muted-foreground mb-3">{t('crypto.subtitle')}</p>
          <Button variant="outline" size="sm" className="gap-2">
            {t('common.start')} <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-orange-500" />
            {t('nav.crypto')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={stats.totalPnL >= 0 ? 'default' : 'destructive'}
              className={`text-xs ${stats.totalPnL >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
            >
              {stats.totalPnL >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {stats.totalPnLPercent >= 0 ? '+' : ''}{stats.totalPnLPercent.toFixed(2)}%
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            {t('currency.lastUpdate')}: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {holdings.map(holding => {
            const price = prices[holding.symbol];
            const currentValue = holding.quantity * (price?.price || 0);
            const purchaseValue = holding.quantity * holding.purchase_price;
            const pnl = currentValue - purchaseValue;
            const pnlPercent = purchaseValue > 0 ? ((currentValue - purchaseValue) / purchaseValue) * 100 : 0;
            
            return (
              <div 
                key={holding.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate('/crypto')}
              >
                <div className="flex items-center gap-3">
                  <CryptoIcon symbol={holding.symbol} size="sm" />
                  <div>
                    <p className="font-medium">{holding.symbol}</p>
                    <p className="text-xs text-muted-foreground">{holding.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : price ? (
                    <>
                      <p className="font-bold text-lg">
                        {formatAmount(price.price)}
                      </p>
                      <Badge 
                        variant={pnlPercent >= 0 ? 'default' : 'destructive'}
                        className={`text-xs ${pnlPercent >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                      >
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </Badge>
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Link */}
        <div className="mt-4 pt-4 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-muted-foreground hover:text-foreground justify-end gap-2"
            onClick={() => navigate('/crypto')}
          >
            {t('common.viewAll')} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
