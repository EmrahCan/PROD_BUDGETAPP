import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingUp, TrendingDown, BarChart3, Bitcoin, RefreshCw } from "lucide-react";
import { useDemo } from "@/contexts/DemoContext";

interface MarketData {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  marketCapChange24h: number;
}

// Demo market data
const DEMO_MARKET_DATA: MarketData = {
  totalMarketCap: 3450000000000,
  totalVolume24h: 125000000000,
  btcDominance: 56.8,
  marketCapChange24h: 2.35,
};

export function MarketOverview() {
  const { t, i18n } = useTranslation();
  const { isDemoMode } = useDemo();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMarketData = async () => {
    // Demo mode - use static data
    if (isDemoMode) {
      setMarketData(DEMO_MARKET_DATA);
      setLastUpdate(new Date());
      setLoading(false);
      return;
    }

    try {
      // Using CoinGecko public API (no key required)
      const response = await fetch(
        "https://api.coingecko.com/api/v3/global"
      );
      
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      
      setMarketData({
        totalMarketCap: data.data.total_market_cap.usd,
        totalVolume24h: data.data.total_volume.usd,
        btcDominance: data.data.market_cap_percentage.btc,
        marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching market data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    
    // Refresh every 60 seconds (skip in demo mode)
    if (!isDemoMode) {
      const interval = setInterval(fetchMarketData, 60000);
      return () => clearInterval(interval);
    }
  }, [isDemoMode]);

  const formatLargeNumber = (num: number) => {
    if (num >= 1_000_000_000_000) {
      return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
    }
    if (num >= 1_000_000_000) {
      return `$${(num / 1_000_000_000).toFixed(2)}B`;
    }
    return `$${(num / 1_000_000).toFixed(2)}M`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!marketData) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-primary" />
          {t('crypto.marketOverview')}
        </CardTitle>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <RefreshCw className="h-2.5 w-2.5" />
          {lastUpdate && <span>{lastUpdate.toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <BarChart3 className="h-3 w-3" />
              <span className="text-[10px]">{t('crypto.totalMarketCap')}</span>
            </div>
            <p className="text-base font-bold">{formatLargeNumber(marketData.totalMarketCap)}</p>
            <Badge 
              variant="secondary" 
              className={`mt-1 text-[10px] px-1.5 py-0 ${
                marketData.marketCapChange24h >= 0 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {marketData.marketCapChange24h >= 0 ? (
                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
              )}
              {marketData.marketCapChange24h >= 0 ? '+' : ''}{marketData.marketCapChange24h.toFixed(2)}%
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <BarChart3 className="h-3 w-3" />
              <span className="text-[10px]">{t('crypto.volume24h')}</span>
            </div>
            <p className="text-base font-bold">{formatLargeNumber(marketData.totalVolume24h)}</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Bitcoin className="h-3 w-3" />
              <span className="text-[10px]">{t('crypto.btcDominance')}</span>
            </div>
            <p className="text-base font-bold">{marketData.btcDominance.toFixed(1)}%</p>
            <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${marketData.btcDominance}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px]">{t('crypto.marketStatus')}</span>
            </div>
            <p className={`text-base font-bold ${marketData.marketCapChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {marketData.marketCapChange24h >= 1 ? t('crypto.bullish') : 
               marketData.marketCapChange24h <= -1 ? t('crypto.bearish') : t('crypto.sideways')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}