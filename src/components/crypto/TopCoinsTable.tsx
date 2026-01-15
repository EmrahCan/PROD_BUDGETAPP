import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, RefreshCw, Activity } from "lucide-react";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

interface CryptoHolding {
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;
}

interface CoinPrice {
  symbol: string;
  price: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface PortfolioLiveTableProps {
  holdings: CryptoHolding[];
  onPricesUpdate?: (prices: Record<string, CoinPrice>) => void;
}

export function PortfolioLiveTable({ holdings, onPricesUpdate }: PortfolioLiveTableProps) {
  const { t, i18n } = useTranslation();
  const { currency, formatAmount } = useDisplayCurrency();
  const [prices, setPrices] = useState<Record<string, CoinPrice>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});

  const fetchPrices = useCallback(async () => {
    if (holdings.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const symbols = [...new Set(holdings.map(h => h.symbol))];
      
      const { data, error } = await supabase.functions.invoke("crypto-prices", {
        body: { symbols, targetCurrency: currency }
      });

      if (error) throw error;

      // Store previous prices for flash animation
      const prevPrices: Record<string, number> = {};
      Object.values(prices).forEach((p: CoinPrice) => {
        prevPrices[p.symbol] = p.price;
      });
      setPreviousPrices(prevPrices);

      const priceMap: Record<string, CoinPrice> = {};
      data.prices?.forEach((p: CoinPrice) => {
        priceMap[p.symbol] = p;
      });
      
      setPrices(priceMap);
      onPricesUpdate?.(priceMap);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      setLoading(false);
    }
  }, [holdings, prices, onPricesUpdate, currency]);

  useEffect(() => {
    fetchPrices();
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchPrices, 15000);
    
    return () => clearInterval(interval);
  }, [holdings, currency]);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return formatAmount(price);
    }
    // For small values, show more decimals
    const locale = i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000_000) {
      return `${(volume / 1_000_000_000).toFixed(2)}B`;
    }
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(2)}M`;
    }
    return volume.toLocaleString();
  };

  const getPriceChangeClass = (symbol: string, currentPrice: number) => {
    const prevPrice = previousPrices[symbol];
    if (!prevPrice) return "";
    if (currentPrice > prevPrice) return "animate-pulse bg-green-500/20";
    if (currentPrice < prevPrice) return "animate-pulse bg-red-500/20";
    return "";
  };

  // Get unique coins from holdings
  const uniqueCoins = holdings.reduce((acc, holding) => {
    if (!acc.find(h => h.symbol === holding.symbol)) {
      acc.push(holding);
    }
    return acc;
  }, [] as CryptoHolding[]);

  if (holdings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {t('crypto.livePrices')}
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {lastUpdate && (
            <span>{t('crypto.lastUpdate')}: {lastUpdate.toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : 'en-US')}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-3 px-2">{t('crypto.coin')}</th>
                <th className="text-right py-3 px-2">{t('crypto.price')}</th>
                <th className="text-right py-3 px-2">{t('crypto.change24h')}</th>
                <th className="text-right py-3 px-2 hidden sm:table-cell">{t('crypto.high24h')}</th>
                <th className="text-right py-3 px-2 hidden sm:table-cell">{t('crypto.low24h')}</th>
                <th className="text-right py-3 px-2 hidden md:table-cell">{t('crypto.volume')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && Object.keys(prices).length === 0 ? (
                uniqueCoins.map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={6} className="py-3 px-2">
                      <div className="h-6 bg-muted animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : (
                uniqueCoins.map((holding) => {
                  const price = prices[holding.symbol];
                  if (!price) return null;

                  return (
                    <tr 
                      key={holding.symbol} 
                      className={`border-b hover:bg-muted/50 transition-colors ${getPriceChangeClass(holding.symbol, price.price)}`}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <CryptoIcon symbol={holding.symbol} size="md" />
                          <div>
                            <p className="font-medium">{holding.name}</p>
                            <p className="text-xs text-muted-foreground">{holding.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-medium">
                        {formatPrice(price.price)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Badge 
                          variant="secondary" 
                          className={`${
                            price.priceChangePercent >= 0 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {price.priceChangePercent >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {price.priceChangePercent >= 0 ? '+' : ''}{price.priceChangePercent.toFixed(2)}%
                          </span>
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground hidden sm:table-cell">
                        {formatPrice(price.high24h)}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground hidden sm:table-cell">
                        {formatPrice(price.low24h)}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground hidden md:table-cell">
                        {formatVolume(price.volume24h)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          {t('crypto.autoUpdateNote')}
        </p>
      </CardContent>
    </Card>
  );
}