import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Euro, PoundSterling } from 'lucide-react';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';

interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  CHF: number;
  JPY: number;
  AUD: number;
  CAD: number;
}

interface CurrencyInfo {
  code: string;
  name: string;
  icon: React.ReactNode;
  flag: string;
}

const getCurrencies = (t: any): CurrencyInfo[] => [
  { code: 'USD', name: t('currency.usd'), icon: <DollarSign className="h-4 w-4" />, flag: '🇺🇸' },
  { code: 'EUR', name: t('currency.eur'), icon: <Euro className="h-4 w-4" />, flag: '🇪🇺' },
  { code: 'GBP', name: t('currency.gbp'), icon: <PoundSterling className="h-4 w-4" />, flag: '🇬🇧' },
  { code: 'CHF', name: t('currency.chf'), icon: <span className="text-xs font-bold">₣</span>, flag: '🇨🇭' },
];

export function CurrencyWidget() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [previousRates, setPreviousRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRates = async () => {
    try {
      setRefreshing(true);
      console.log('Fetching exchange rates...');
      
      const { data, error } = await supabase.functions.invoke('exchange-rates');
      
      if (error) {
        console.error('Error fetching rates:', error);
        return;
      }
      
      console.log('Received rates:', data);
      
      if (data?.rates) {
        setPreviousRates(rates);
        setRates(data.rates);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRates();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getRateChange = (currency: string) => {
    if (!previousRates || !rates) return null;
    const current = rates[currency as keyof ExchangeRates];
    const previous = previousRates[currency as keyof ExchangeRates];
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('currency.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('currency.title')}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchRates}
            disabled={refreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            {t('currency.lastUpdate')}: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {getCurrencies(t).map((currency) => {
            const rate = rates?.[currency.code as keyof ExchangeRates];
            const change = getRateChange(currency.code);
            
            return (
              <div 
                key={currency.code}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{currency.flag}</span>
                  <div>
                    <p className="font-medium">{currency.code}</p>
                    <p className="text-xs text-muted-foreground">{currency.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {rate ? `₺${rate.toFixed(4)}` : '-'}
                  </p>
                  {change !== null && change !== 0 && (
                    <Badge 
                      variant={change > 0 ? 'destructive' : 'default'}
                      className={`text-xs ${change > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}
                    >
                      {change > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(change).toFixed(2)}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Asset Valuation Section */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">{t('currency.convertTitle')}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted/30 rounded">
              <p className="text-muted-foreground">1,000 USD =</p>
              <p className="font-semibold">{rates?.USD ? formatCurrency(1000 * rates.USD, 'TRY') : '-'}</p>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <p className="text-muted-foreground">1,000 EUR =</p>
              <p className="font-semibold">{rates?.EUR ? formatCurrency(1000 * rates.EUR, 'TRY') : '-'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
