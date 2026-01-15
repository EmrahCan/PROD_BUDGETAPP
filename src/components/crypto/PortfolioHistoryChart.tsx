import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp } from "lucide-react";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { useDemo } from "@/contexts/DemoContext";

interface CryptoHolding {
  symbol: string;
  quantity: number;
  purchase_price: number;
}

interface HistoryDataPoint {
  date: string;
  value: number;
}

interface PortfolioHistoryChartProps {
  holdings: CryptoHolding[];
}

type TimeRange = "7d" | "30d" | "90d";

// Generate demo chart data
const generateDemoChartData = (days: number, holdings: CryptoHolding[]): HistoryDataPoint[] => {
  const data: HistoryDataPoint[] = [];
  const today = new Date();
  
  // Calculate base value from holdings with demo prices
  const demoPrices: Record<string, number> = {
    BTC: 97500,
    ETH: 3450,
    SOL: 195,
    BNB: 715,
    XRP: 2.35,
    ADA: 1.05,
    DOGE: 0.42,
    AVAX: 45.20,
  };
  
  let baseValue = 0;
  holdings.forEach(h => {
    const price = demoPrices[h.symbol] || h.purchase_price * 1.15;
    baseValue += h.quantity * price;
  });
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Simulate price fluctuations with realistic patterns
    const volatility = 0.015; // 1.5% daily volatility
    const trend = 0.002; // 0.2% daily uptrend
    const randomFactor = (Math.random() - 0.5) * 2 * volatility;
    const trendFactor = trend * (days - i);
    const cycleFactor = Math.sin((days - i) * 0.3) * 0.02; // Some wave pattern
    
    const multiplier = 1 + randomFactor + trendFactor + cycleFactor;
    const value = baseValue * multiplier * (0.85 + (days - i) / days * 0.15);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
    });
  }
  
  return data;
};

export function PortfolioHistoryChart({ holdings }: PortfolioHistoryChartProps) {
  const { t, i18n } = useTranslation();
  const { currency, formatAmount } = useDisplayCurrency();
  const { isDemoMode } = useDemo();
  const [chartData, setChartData] = useState<HistoryDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  useEffect(() => {
    if (holdings.length > 0) {
      fetchHistory();
    }
  }, [holdings, timeRange, currency, isDemoMode]);

  const fetchHistory = async () => {
    if (holdings.length === 0) return;

    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

    // Demo mode - generate sample data
    if (isDemoMode) {
      setLoading(true);
      // Small delay for visual feedback
      setTimeout(() => {
        setChartData(generateDemoChartData(days, holdings));
        setLoading(false);
      }, 300);
      return;
    }

    setLoading(true);
    try {
      const symbols = [...new Set(holdings.map(h => h.symbol))];

      const { data, error } = await supabase.functions.invoke("crypto-prices", {
        body: { symbols, action: "history", days, targetCurrency: currency }
      });

      if (error) throw error;

      // Build portfolio value history
      const dateMap: Record<string, number> = {};

      data.history?.forEach((coinHistory: { symbol: string; history: { date: string; price: number }[] }) => {
        const holding = holdings.find(h => h.symbol === coinHistory.symbol);
        if (!holding) return;

        coinHistory.history.forEach(point => {
          if (!dateMap[point.date]) {
            dateMap[point.date] = 0;
          }
          dateMap[point.date] += point.price * holding.quantity;
        });
      });

      const chartPoints = Object.entries(dateMap)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setChartData(chartPoints);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number) => {
    return formatAmount(value, { compact: true });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const locale = i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : 'en-US';
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  };

  // Calculate change
  const firstValue = chartData[0]?.value || 0;
  const lastValue = chartData[chartData.length - 1]?.value || 0;
  const valueChange = lastValue - firstValue;
  const percentChange = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  if (holdings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="hidden sm:inline">{t('crypto.portfolioHistory')}</span>
          <span className="sm:hidden">Geçmiş</span>
        </CardTitle>
        <div className="flex gap-0.5 sm:gap-1">
          {(["7d", "30d", "90d"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="text-[10px] sm:text-xs h-6 sm:h-8 px-1.5 sm:px-3"
            >
              {range === "7d" ? t('crypto.days7') : range === "30d" ? t('crypto.days30') : t('crypto.days90')}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        {loading ? (
          <div className="h-[180px] sm:h-[300px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length > 0 ? (
          <>
            <div className="flex items-baseline gap-2 sm:gap-4 mb-2 sm:mb-4">
              <span className="text-xl sm:text-3xl font-bold">{formatValue(lastValue)}</span>
              <span className={`text-xs sm:text-sm font-medium ${valueChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {valueChange >= 0 ? "+" : ""}{formatValue(valueChange)} ({percentChange >= 0 ? "+" : ""}{percentChange.toFixed(2)}%)
              </span>
            </div>
            <div className="h-[150px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tickFormatter={formatValue}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    width={80}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg">
                            <p className="text-sm text-muted-foreground">{formatDate(label)}</p>
                            <p className="text-lg font-bold">{formatValue(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#portfolioGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="h-[150px] sm:h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            {t('crypto.chartLoadError')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}