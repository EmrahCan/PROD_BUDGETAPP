import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Crown } from "lucide-react";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { supabase } from "@/integrations/supabase/client";
import { useDemo } from "@/contexts/DemoContext";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

interface TopCoin {
  symbol: string;
  name: string;
  price: number;
  priceChangePercent: number;
  volume24h: number;
  marketCap?: number;
}

// Demo data for top 10 coins
const DEMO_TOP_COINS: TopCoin[] = [
  { symbol: "BTC", name: "Bitcoin", price: 97500, priceChangePercent: 2.45, volume24h: 28500000000, marketCap: 1920000000000 },
  { symbol: "ETH", name: "Ethereum", price: 3450, priceChangePercent: 1.82, volume24h: 12800000000, marketCap: 415000000000 },
  { symbol: "BNB", name: "BNB", price: 715, priceChangePercent: -0.85, volume24h: 1500000000, marketCap: 107000000000 },
  { symbol: "SOL", name: "Solana", price: 195, priceChangePercent: 4.15, volume24h: 3200000000, marketCap: 92000000000 },
  { symbol: "XRP", name: "XRP", price: 2.35, priceChangePercent: 3.22, volume24h: 4800000000, marketCap: 135000000000 },
  { symbol: "ADA", name: "Cardano", price: 1.05, priceChangePercent: -1.15, volume24h: 850000000, marketCap: 37000000000 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.42, priceChangePercent: 5.82, volume24h: 2100000000, marketCap: 62000000000 },
  { symbol: "AVAX", name: "Avalanche", price: 45.20, priceChangePercent: 2.95, volume24h: 720000000, marketCap: 18500000000 },
  { symbol: "DOT", name: "Polkadot", price: 8.45, priceChangePercent: -0.42, volume24h: 380000000, marketCap: 12000000000 },
  { symbol: "LINK", name: "Chainlink", price: 22.50, priceChangePercent: 1.55, volume24h: 520000000, marketCap: 14000000000 },
];

const TOP_10_SYMBOLS = ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "AVAX", "DOT", "LINK"];

export function Top10CryptoWidget() {
  const { t, i18n } = useTranslation();
  const { isDemoMode } = useDemo();
  const { currency, formatAmount } = useDisplayCurrency();
  const [coins, setCoins] = useState<TopCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});

  const fetchTopCoins = useCallback(async () => {
    if (isDemoMode) {
      // Add small variations for demo
      const demoCoins = DEMO_TOP_COINS.map(coin => ({
        ...coin,
        price: coin.price * (1 + (Math.random() - 0.5) * 0.02),
        priceChangePercent: coin.priceChangePercent + (Math.random() - 0.5) * 0.5,
      }));
      
      // Store previous prices for animation
      const prevMap: Record<string, number> = {};
      coins.forEach(c => { prevMap[c.symbol] = c.price; });
      setPreviousPrices(prevMap);
      
      setCoins(demoCoins);
      setLastUpdate(new Date());
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('crypto-prices', {
        body: { symbols: TOP_10_SYMBOLS, targetCurrency: currency }
      });

      if (error) throw error;

      if (data.prices) {
        // Store previous prices for animation
        const prevMap: Record<string, number> = {};
        coins.forEach(c => { prevMap[c.symbol] = c.price; });
        setPreviousPrices(prevMap);

        const topCoins: TopCoin[] = data.prices.map((p: any) => ({
          symbol: p.symbol,
          name: getCoinName(p.symbol),
          price: p.price,
          priceChangePercent: p.priceChangePercent,
          volume24h: p.volume24h,
        }));
        
        setCoins(topCoins);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching top coins:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDemoMode, currency, coins]);

  // Initial fetch
  useEffect(() => {
    fetchTopCoins();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchTopCoins();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchTopCoins]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchTopCoins();
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return formatAmount(price);
    }
    if (price >= 1) {
      return formatAmount(price);
    }
    return `${currency === 'TRY' ? '₺' : currency === 'EUR' ? '€' : '$'}${price.toFixed(4)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000_000) {
      return `$${(volume / 1_000_000_000).toFixed(1)}B`;
    }
    if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(1)}M`;
    }
    return `$${volume.toLocaleString()}`;
  };

  const getCoinName = (symbol: string): string => {
    const names: Record<string, string> = {
      BTC: "Bitcoin", ETH: "Ethereum", BNB: "BNB", SOL: "Solana",
      XRP: "XRP", ADA: "Cardano", DOGE: "Dogecoin", AVAX: "Avalanche",
      DOT: "Polkadot", LINK: "Chainlink",
    };
    return names[symbol] || symbol;
  };

  const getPriceChangeClass = (symbol: string, currentPrice: number) => {
    const prev = previousPrices[symbol];
    if (!prev) return '';
    if (currentPrice > prev) return 'animate-pulse text-green-500';
    if (currentPrice < prev) return 'animate-pulse text-red-500';
    return '';
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Crown className="h-4 w-4 text-yellow-500" />
            {t('crypto.top10Title') || 'Top 10 Kripto'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Crown className="h-4 w-4 text-yellow-500" />
            {t('crypto.top10Title') || 'Top 10 Kripto'}
          </CardTitle>
          <div className="flex items-center gap-1">
            {lastUpdate && (
              <span className="text-[10px] text-muted-foreground">
                {lastUpdate.toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleManualRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-2.5 w-2.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden px-4 pb-4 pt-0">
        <div className="h-full overflow-y-auto space-y-0.5 pr-1">
          {coins.map((coin, index) => (
            <div
              key={coin.symbol}
              className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-3 text-[9px] font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <CryptoIcon symbol={coin.symbol} size="sm" />
                <span className="font-medium text-[11px]">{coin.symbol}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`font-semibold text-[11px] ${getPriceChangeClass(coin.symbol, coin.price)}`}>
                  {formatPrice(coin.price)}
                </span>
                <span className={`text-[9px] font-medium min-w-[36px] text-right ${
                  coin.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {coin.priceChangePercent >= 0 ? '+' : ''}{coin.priceChangePercent.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
