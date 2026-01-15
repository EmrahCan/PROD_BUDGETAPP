import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Euro, 
  PoundSterling,
  Coins,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  PiggyBank
} from 'lucide-react';

interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  CHF: number;
  JPY: number;
  AUD: number;
  CAD: number;
  BGN: number;
}

interface MetalPrices {
  gold: number;
  silver: number;
  platinum?: number;
  palladium?: number;
}

interface CurrencyHolding {
  id: string;
  asset_type: string;
  asset_code: string;
  asset_name: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  notes?: string;
}

interface CurrencyInfo {
  code: string;
  nameKey: string;
  icon: React.ReactNode;
  flag: string;
}

const currencies: CurrencyInfo[] = [
  { code: 'USD', nameKey: 'currency.usd', icon: <DollarSign className="h-4 w-4" />, flag: '🇺🇸' },
  { code: 'EUR', nameKey: 'currency.eur', icon: <Euro className="h-4 w-4" />, flag: '🇪🇺' },
  { code: 'GBP', nameKey: 'currency.gbp', icon: <PoundSterling className="h-4 w-4" />, flag: '🇬🇧' },
  { code: 'CHF', nameKey: 'currency.chf', icon: <span className="text-xs font-bold">₣</span>, flag: '🇨🇭' },
  { code: 'JPY', nameKey: 'currency.jpy', icon: <span className="text-xs font-bold">¥</span>, flag: '🇯🇵' },
  { code: 'AUD', nameKey: 'currency.aud', icon: <DollarSign className="h-4 w-4" />, flag: '🇦🇺' },
  { code: 'CAD', nameKey: 'currency.cad', icon: <DollarSign className="h-4 w-4" />, flag: '🇨🇦' },
  { code: 'BGN', nameKey: 'currency.bgn', icon: <span className="text-xs font-bold">лв</span>, flag: '🇧🇬' },
];

const metals = [
  { code: 'gold', nameKey: 'currency.gold', icon: '🥇', color: 'text-yellow-500' },
  { code: 'silver', nameKey: 'currency.silver', icon: '🥈', color: 'text-gray-400' },
  { code: 'platinum', nameKey: 'currency.platinum', icon: '⚪', color: 'text-slate-300' },
  { code: 'palladium', nameKey: 'currency.palladium', icon: '💎', color: 'text-blue-300' },
];

const assetOptions = [
  { type: 'currency', code: 'USD', name: 'ABD Doları', icon: '🇺🇸' },
  { type: 'currency', code: 'EUR', name: 'Euro', icon: '🇪🇺' },
  { type: 'currency', code: 'GBP', name: 'İngiliz Sterlini', icon: '🇬🇧' },
  { type: 'currency', code: 'CHF', name: 'İsviçre Frangı', icon: '🇨🇭' },
  { type: 'currency', code: 'JPY', name: 'Japon Yeni', icon: '🇯🇵' },
  { type: 'currency', code: 'AUD', name: 'Avustralya Doları', icon: '🇦🇺' },
  { type: 'currency', code: 'CAD', name: 'Kanada Doları', icon: '🇨🇦' },
  { type: 'currency', code: 'BGN', name: 'Bulgar Levası', icon: '🇧🇬' },
  { type: 'metal', code: 'XAU', name: 'Altın (gram)', icon: '🥇' },
  { type: 'metal', code: 'XAG', name: 'Gümüş (gram)', icon: '🥈' },
  { type: 'metal', code: 'XPT', name: 'Platin (gram)', icon: '⚪' },
  { type: 'metal', code: 'XPD', name: 'Paladyum (gram)', icon: '💎' },
];

export default function Currency() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const { user } = useAuth();
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [metalPrices, setMetalPrices] = useState<MetalPrices | null>(null);
  const [previousRates, setPreviousRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [metalLoading, setMetalLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Portfolio state
  const [holdings, setHoldings] = useState<CurrencyHolding[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<CurrencyHolding | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [selectedAsset, setSelectedAsset] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchRates = async () => {
    try {
      setRefreshing(true);
      console.log('Fetching exchange rates...');
      
      const { data, error } = await supabase.functions.invoke('exchange-rates');
      
      if (error) {
        console.error('Error fetching rates:', error);
        return;
      }
      
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

  const fetchMetalPrices = async () => {
    try {
      setMetalLoading(true);
      
      const response = await fetch('https://api.frankfurter.app/latest?from=XAU&to=TRY,USD');
      
      if (response.ok) {
        const data = await response.json();
        const goldPriceUSD = 1 / data.rates.USD;
        const usdToTry = rates?.USD || 35;
        
        setMetalPrices({
          gold: goldPriceUSD * usdToTry / 31.1035,
          silver: (goldPriceUSD / 80) * usdToTry / 31.1035,
          platinum: (goldPriceUSD * 0.5) * usdToTry / 31.1035,
          palladium: (goldPriceUSD * 0.4) * usdToTry / 31.1035,
        });
      } else {
        const usdToTry = rates?.USD || 35;
        setMetalPrices({
          gold: 2650 * usdToTry / 31.1035,
          silver: 31 * usdToTry / 31.1035,
          platinum: 980 * usdToTry / 31.1035,
          palladium: 1050 * usdToTry / 31.1035,
        });
      }
    } catch (error) {
      console.error('Error fetching metal prices:', error);
      const usdToTry = rates?.USD || 35;
      setMetalPrices({
        gold: 2650 * usdToTry / 31.1035,
        silver: 31 * usdToTry / 31.1035,
        platinum: 980 * usdToTry / 31.1035,
        palladium: 1050 * usdToTry / 31.1035,
      });
    } finally {
      setMetalLoading(false);
    }
  };

  const fetchHoldings = async () => {
    if (!user) return;
    
    setHoldingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('currency_holdings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHoldings(data || []);
    } catch (error) {
      console.error('Error fetching holdings:', error);
    } finally {
      setHoldingsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (rates) {
      fetchMetalPrices();
    }
  }, [rates]);

  useEffect(() => {
    if (user) {
      fetchHoldings();
    }
  }, [user]);

  const getRateChange = (currency: string) => {
    if (!previousRates || !rates) return null;
    const current = rates[currency as keyof ExchangeRates];
    const previous = previousRates[currency as keyof ExchangeRates];
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
  };

  const handleRefresh = () => {
    fetchRates();
    if (rates) fetchMetalPrices();
  };

  const getCurrentPrice = (assetCode: string, assetType: string): number => {
    if (assetType === 'currency') {
      return rates?.[assetCode as keyof ExchangeRates] || 0;
    } else {
      // Metal prices
      const metalMap: Record<string, keyof MetalPrices> = {
        'XAU': 'gold',
        'XAG': 'silver',
        'XPT': 'platinum',
        'XPD': 'palladium'
      };
      return metalPrices?.[metalMap[assetCode]] || 0;
    }
  };

  const calculatePortfolioValue = () => {
    let totalCurrent = 0;
    let totalPurchase = 0;
    
    holdings.forEach(holding => {
      const currentPrice = getCurrentPrice(holding.asset_code, holding.asset_type);
      totalCurrent += holding.quantity * currentPrice;
      totalPurchase += holding.quantity * holding.purchase_price;
    });
    
    return { totalCurrent, totalPurchase, profitLoss: totalCurrent - totalPurchase };
  };

  const resetForm = () => {
    setSelectedAsset('');
    setQuantity('');
    setPurchasePrice('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setEditingHolding(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (holding: CurrencyHolding) => {
    setEditingHolding(holding);
    setSelectedAsset(`${holding.asset_type}:${holding.asset_code}`);
    setQuantity(holding.quantity.toString());
    setPurchasePrice(holding.purchase_price.toString());
    setPurchaseDate(holding.purchase_date || new Date().toISOString().split('T')[0]);
    setNotes(holding.notes || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !selectedAsset || !quantity || !purchasePrice) {
      toast.error(t('currency.portfolio.fillRequired'));
      return;
    }

    const [assetType, assetCode] = selectedAsset.split(':');
    const asset = assetOptions.find(a => a.type === assetType && a.code === assetCode);
    
    if (!asset) return;

    setSaving(true);
    try {
      const holdingData = {
        user_id: user.id,
        asset_type: assetType,
        asset_code: assetCode,
        asset_name: asset.name,
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchasePrice),
        purchase_date: purchaseDate,
        notes: notes || null
      };

      if (editingHolding) {
        const { error } = await supabase
          .from('currency_holdings')
          .update(holdingData)
          .eq('id', editingHolding.id);
        
        if (error) throw error;
        toast.success(t('currency.portfolio.updated'));
      } else {
        const { error } = await supabase
          .from('currency_holdings')
          .insert(holdingData);
        
        if (error) throw error;
        toast.success(t('currency.portfolio.added'));
      }

      setDialogOpen(false);
      resetForm();
      fetchHoldings();
    } catch (error) {
      console.error('Error saving holding:', error);
      toast.error(t('currency.portfolio.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('currency_holdings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success(t('currency.portfolio.deleted'));
      fetchHoldings();
    } catch (error) {
      console.error('Error deleting holding:', error);
      toast.error(t('currency.portfolio.deleteError'));
    }
  };

  const { totalCurrent, totalPurchase, profitLoss } = calculatePortfolioValue();
  const profitLossPercent = totalPurchase > 0 ? ((profitLoss / totalPurchase) * 100) : 0;

  return (
    <Layout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg">
              <Coins className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                {t('currency.pageTitle')}
              </h1>
              <p className="text-muted-foreground">{t('currency.pageSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>
        </div>

        {lastUpdate && (
          <p className="text-sm text-muted-foreground">
            {t('currency.lastUpdate')}: {lastUpdate.toLocaleTimeString()}
          </p>
        )}

        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList>
            <TabsTrigger value="portfolio" className="gap-2">
              <Wallet className="h-4 w-4" />
              {t('currency.portfolioTab')}
            </TabsTrigger>
            <TabsTrigger value="currencies" className="gap-2">
              <DollarSign className="h-4 w-4" />
              {t('currency.currenciesTab')}
            </TabsTrigger>
            <TabsTrigger value="metals" className="gap-2">
              <span>🥇</span>
              {t('currency.metalsTab')}
            </TabsTrigger>
          </TabsList>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('currency.portfolio.currentValue')}</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalCurrent, 'TRY')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-muted">
                      <PiggyBank className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('currency.portfolio.totalCost')}</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalPurchase, 'TRY')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={profitLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${profitLoss >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {profitLoss >= 0 ? (
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('currency.portfolio.profitLoss')}</p>
                      <div className="flex items-center gap-2">
                        <p className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss, 'TRY')}
                        </p>
                        <Badge variant="outline" className={profitLoss >= 0 ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}>
                          {profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Add Asset Button */}
            <div className="flex justify-end">
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('currency.portfolio.addAsset')}
              </Button>
            </div>

            {/* Holdings List */}
            {holdingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : holdings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('currency.portfolio.noHoldings')}</p>
                  <Button onClick={openAddDialog} variant="outline" className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    {t('currency.portfolio.addFirst')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {holdings.map(holding => {
                  const currentPrice = getCurrentPrice(holding.asset_code, holding.asset_type);
                  const currentValue = holding.quantity * currentPrice;
                  const purchaseValue = holding.quantity * holding.purchase_price;
                  const holdingProfitLoss = currentValue - purchaseValue;
                  const holdingProfitPercent = purchaseValue > 0 ? ((holdingProfitLoss / purchaseValue) * 100) : 0;
                  const assetOption = assetOptions.find(a => a.code === holding.asset_code);

                  return (
                    <Card key={holding.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">{assetOption?.icon || '💰'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold">{holding.asset_name}</p>
                                <Badge variant="outline">{holding.asset_code}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {holding.quantity} × {formatCurrency(currentPrice, 'TRY')} = {formatCurrency(currentValue, 'TRY')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`font-bold ${holdingProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {holdingProfitLoss >= 0 ? '+' : ''}{formatCurrency(holdingProfitLoss, 'TRY')}
                              </p>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${holdingProfitLoss >= 0 ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}`}
                              >
                                {holdingProfitLoss >= 0 ? '+' : ''}{holdingProfitPercent.toFixed(2)}%
                              </Badge>
                            </div>
                            
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(holding)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(holding.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Currencies Tab */}
          <TabsContent value="currencies" className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currencies.map((currency) => {
                    const rate = rates?.[currency.code as keyof ExchangeRates];
                    const change = getRateChange(currency.code);
                    
                    return (
                      <Card key={currency.code} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{currency.flag}</span>
                              <div>
                                <p className="font-bold text-lg">{currency.code}</p>
                                <p className="text-xs text-muted-foreground">{t(currency.nameKey)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-xl">
                                {rate ? `₺${rate.toFixed(4)}` : '-'}
                              </p>
                              {change !== null && change !== 0 && (
                                <Badge 
                                  variant="outline"
                                  className={`text-xs ${change > 0 ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'}`}
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Quick Conversion */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('currency.convertTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">1,000 USD =</p>
                        <p className="font-bold text-lg">{rates?.USD ? formatCurrency(1000 * rates.USD, 'TRY') : '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">1,000 EUR =</p>
                        <p className="font-bold text-lg">{rates?.EUR ? formatCurrency(1000 * rates.EUR, 'TRY') : '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">1,000 GBP =</p>
                        <p className="font-bold text-lg">{rates?.GBP ? formatCurrency(1000 * rates.GBP, 'TRY') : '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">1,000 CHF =</p>
                        <p className="font-bold text-lg">{rates?.CHF ? formatCurrency(1000 * rates.CHF, 'TRY') : '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Metals Tab */}
          <TabsContent value="metals" className="space-y-6">
            {metalLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {metals.map((metal) => {
                    const price = metalPrices?.[metal.code as keyof MetalPrices];
                    
                    return (
                      <Card key={metal.code} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col items-center text-center gap-3">
                            <span className="text-5xl">{metal.icon}</span>
                            <div>
                              <p className="font-bold text-lg">{t(metal.nameKey)}</p>
                              <p className="text-xs text-muted-foreground">{t('currency.perGram')}</p>
                            </div>
                            <p className={`font-bold text-2xl ${metal.color}`}>
                              {price ? formatCurrency(price, 'TRY') : '-'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Metal Quantity Calculations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('currency.metalCalculations')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <p className="text-sm text-muted-foreground">{t('currency.gold')} (1 {t('currency.ounce')})</p>
                        <p className="font-bold text-lg text-yellow-600">
                          {metalPrices?.gold ? formatCurrency(metalPrices.gold * 31.1035, 'TRY') : '-'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
                        <p className="text-sm text-muted-foreground">{t('currency.silver')} (1 {t('currency.ounce')})</p>
                        <p className="font-bold text-lg text-gray-600">
                          {metalPrices?.silver ? formatCurrency(metalPrices.silver * 31.1035, 'TRY') : '-'}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <p className="text-sm text-muted-foreground">{t('currency.gold')} (22 {t('currency.ayar')})</p>
                        <p className="font-bold text-lg text-yellow-600">
                          {metalPrices?.gold ? formatCurrency(metalPrices.gold * 0.916, 'TRY') : '-'}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <p className="text-sm text-muted-foreground">{t('currency.quarterGold')}</p>
                        <p className="font-bold text-lg text-yellow-600">
                          {metalPrices?.gold ? formatCurrency(metalPrices.gold * 1.75 * 0.916, 'TRY') : '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground text-center">
                  {t('currency.metalDisclaimer')}
                </p>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingHolding ? t('currency.portfolio.editAsset') : t('currency.portfolio.addAsset')}
              </DialogTitle>
              <DialogDescription>
                {t('currency.portfolio.dialogDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('currency.portfolio.assetType')}</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('currency.portfolio.selectAsset')} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 text-xs font-semibold text-muted-foreground">{t('currency.currenciesTab')}</div>
                    {assetOptions.filter(a => a.type === 'currency').map(asset => (
                      <SelectItem key={`${asset.type}:${asset.code}`} value={`${asset.type}:${asset.code}`}>
                        <span className="flex items-center gap-2">
                          <span>{asset.icon}</span>
                          <span>{asset.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                    <div className="p-2 text-xs font-semibold text-muted-foreground">{t('currency.metalsTab')}</div>
                    {assetOptions.filter(a => a.type === 'metal').map(asset => (
                      <SelectItem key={`${asset.type}:${asset.code}`} value={`${asset.type}:${asset.code}`}>
                        <span className="flex items-center gap-2">
                          <span>{asset.icon}</span>
                          <span>{asset.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('currency.portfolio.quantity')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={t('currency.portfolio.quantityPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('currency.portfolio.purchasePrice')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder={t('currency.portfolio.purchasePricePlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('currency.portfolio.purchasePriceHint')}</p>
              </div>

              <div className="space-y-2">
                <Label>{t('currency.portfolio.purchaseDate')}</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('currency.portfolio.notes')}</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('currency.portfolio.notesPlaceholder')}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? t('common.saving') : (editingHolding ? t('common.update') : t('common.add'))}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
