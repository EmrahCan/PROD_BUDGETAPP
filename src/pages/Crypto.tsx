import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo, DEMO_MOCK_DATA } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { 
  Bitcoin, Plus, TrendingUp, TrendingDown, RefreshCw, Trash2, 
  Wallet, ArrowUpRight, ArrowDownRight, Edit, Loader2
} from "lucide-react";
import { CryptoIcon } from "@/components/crypto/CryptoIcon";
import { PortfolioHistoryChart } from "@/components/crypto/PortfolioHistoryChart";
import { PortfolioDistributionChart } from "@/components/crypto/PortfolioDistributionChart";
import { PortfolioLiveTable } from "@/components/crypto/TopCoinsTable";
import { PriceAlerts } from "@/components/crypto/PriceAlerts";
import { MarketOverview } from "@/components/crypto/MarketOverview";
import { Top10CryptoWidget } from "@/components/crypto/Top10CryptoWidget";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

interface CryptoHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;
  purchase_currency: string;
  exchange: string | null;
  notes: string | null;
}

interface CryptoPrice {
  symbol: string;
  price: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

// Default popular coins (will be replaced by API data)
const defaultPopularCoins = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "SHIB", name: "Shiba Inu" },
];

const exchanges = ["Binance", "Paribu", "BTCTurk", "Coinbase", "Kraken", "KuCoin", "Other"];

// Demo prices with realistic market data
const DEMO_CRYPTO_PRICES: Record<string, CryptoPrice> = {
  BTC: { symbol: 'BTC', price: 97500, priceChangePercent: 2.45, high24h: 98200, low24h: 95100, volume24h: 28500000000 },
  ETH: { symbol: 'ETH', price: 3450, priceChangePercent: 1.82, high24h: 3520, low24h: 3380, volume24h: 12800000000 },
  SOL: { symbol: 'SOL', price: 195, priceChangePercent: 4.15, high24h: 198, low24h: 185, volume24h: 3200000000 },
  BNB: { symbol: 'BNB', price: 715, priceChangePercent: -0.85, high24h: 725, low24h: 708, volume24h: 1500000000 },
  XRP: { symbol: 'XRP', price: 2.35, priceChangePercent: 3.22, high24h: 2.42, low24h: 2.28, volume24h: 4800000000 },
  ADA: { symbol: 'ADA', price: 1.05, priceChangePercent: -1.15, high24h: 1.08, low24h: 1.02, volume24h: 850000000 },
  DOGE: { symbol: 'DOGE', price: 0.42, priceChangePercent: 5.82, high24h: 0.44, low24h: 0.39, volume24h: 2100000000 },
  AVAX: { symbol: 'AVAX', price: 45.20, priceChangePercent: 2.95, high24h: 46.50, low24h: 43.80, volume24h: 720000000 },
  DOT: { symbol: 'DOT', price: 8.45, priceChangePercent: -0.42, high24h: 8.65, low24h: 8.32, volume24h: 380000000 },
  MATIC: { symbol: 'MATIC', price: 0.58, priceChangePercent: 1.28, high24h: 0.60, low24h: 0.56, volume24h: 290000000 },
};

// Demo market overview data
const DEMO_MARKET_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', price: 97500, change24h: 2.45, marketCap: 1920000000000, volume24h: 28500000000 },
  { symbol: 'ETH', name: 'Ethereum', price: 3450, change24h: 1.82, marketCap: 415000000000, volume24h: 12800000000 },
  { symbol: 'BNB', name: 'BNB', price: 715, change24h: -0.85, marketCap: 107000000000, volume24h: 1500000000 },
  { symbol: 'SOL', name: 'Solana', price: 195, change24h: 4.15, marketCap: 92000000000, volume24h: 3200000000 },
  { symbol: 'XRP', name: 'XRP', price: 2.35, change24h: 3.22, marketCap: 135000000000, volume24h: 4800000000 },
  { symbol: 'ADA', name: 'Cardano', price: 1.05, change24h: -1.15, marketCap: 37000000000, volume24h: 850000000 },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.42, change24h: 5.82, marketCap: 62000000000, volume24h: 2100000000 },
  { symbol: 'AVAX', name: 'Avalanche', price: 45.20, change24h: 2.95, marketCap: 18500000000, volume24h: 720000000 },
];

export default function Crypto() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { currency, formatAmount } = useDisplayCurrency();
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [loading, setLoading] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<CryptoHolding | null>(null);
  
  // All available coins from Binance
  const [allCoins, setAllCoins] = useState<{ symbol: string; name: string; volume24h?: number }[]>(defaultPopularCoins);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [coinSearch, setCoinSearch] = useState("");
  const [filteredCoins, setFilteredCoins] = useState<{ symbol: string; name: string }[]>(defaultPopularCoins);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Form state
  const [selectedCoin, setSelectedCoin] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [exchange, setExchange] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Manual coin entry
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualSymbol, setManualSymbol] = useState("");
  const [manualName, setManualName] = useState("");

  useEffect(() => {
    if (isDemoMode) {
      // Load demo data
      setHoldings(DEMO_MOCK_DATA.crypto_holdings);
      setPrices(DEMO_CRYPTO_PRICES);
      setAllCoins(defaultPopularCoins);
      setFilteredCoins(defaultPopularCoins);
      setLoading(false);
      return;
    }

    if (user) {
      fetchHoldings();
      fetchAllCoins();
    }
  }, [user, isDemoMode]);

  // Live search coins from backend with debounce
  const searchCoinsFromBackend = useCallback(async (searchTerm: string) => {
    setLoadingCoins(true);
    try {
      const { data, error } = await supabase.functions.invoke('crypto-prices', {
        body: { action: 'list', search: searchTerm }
      });

      if (error) throw error;
      
      if (data.coins) {
        setFilteredCoins(data.coins.slice(0, 50));
        console.log(`Found ${data.coins.length} coins for search: "${searchTerm}"`);
      }
    } catch (error) {
      console.error('Error searching coins:', error);
    } finally {
      setLoadingCoins(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (coinSearch.trim() === "") {
      // Show top coins when search is empty
      setFilteredCoins(allCoins.slice(0, 100));
    } else {
      // Debounce backend search by 300ms
      searchTimeoutRef.current = setTimeout(() => {
        searchCoinsFromBackend(coinSearch.trim());
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [coinSearch, allCoins, searchCoinsFromBackend]);

  useEffect(() => {
    if (holdings.length > 0 && !isDemoMode) {
      fetchPrices();
    }
  }, [holdings, currency, isDemoMode]);

  const fetchHoldings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crypto_holdings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHoldings(data || []);
    } catch (error) {
      console.error('Error fetching holdings:', error);
      toast.error('Kripto varlıkları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCoins = async () => {
    setLoadingCoins(true);
    try {
      const { data, error } = await supabase.functions.invoke('crypto-prices', {
        body: { action: 'list' }
      });

      if (error) throw error;
      
      if (data.coins && data.coins.length > 0) {
        setAllCoins(data.coins);
        setFilteredCoins(data.coins.slice(0, 100));
        console.log(`Loaded ${data.coins.length} coins from Binance`);
      }
    } catch (error) {
      console.error('Error fetching all coins:', error);
      // Keep default coins on error
    } finally {
      setLoadingCoins(false);
    }
  };

  const fetchPrices = async () => {
    if (holdings.length === 0) return;
    
    // Demo mode - simulate price refresh with slight variations
    if (isDemoMode) {
      setLoadingPrices(true);
      setTimeout(() => {
        const updatedPrices: Record<string, CryptoPrice> = {};
        Object.keys(DEMO_CRYPTO_PRICES).forEach(symbol => {
          const basePrice = DEMO_CRYPTO_PRICES[symbol];
          // Add small random variation (±1%)
          const variation = 1 + (Math.random() - 0.5) * 0.02;
          updatedPrices[symbol] = {
            ...basePrice,
            price: basePrice.price * variation,
            priceChangePercent: basePrice.priceChangePercent + (Math.random() - 0.5) * 0.5,
          };
        });
        setPrices(updatedPrices);
        setLoadingPrices(false);
        toast.success(t('crypto.pricesUpdated') || 'Fiyatlar güncellendi');
      }, 800);
      return;
    }
    
    setLoadingPrices(true);
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
    } catch (error) {
      console.error('Error fetching prices:', error);
      toast.error('Fiyatlar alınamadı');
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleSave = async () => {
    // Demo mode - simulate save
    if (isDemoMode) {
      toast.info(t('demo.cannotAdd'));
      return;
    }

    const coinSymbol = isManualEntry ? manualSymbol.toUpperCase().trim() : selectedCoin;
    const coinName = isManualEntry ? manualName.trim() : (allCoins.find(c => c.symbol === selectedCoin)?.name || selectedCoin);
    
    if (!user || !coinSymbol || !quantity || !purchasePrice) {
      toast.error('Lütfen gerekli alanları doldurun');
      return;
    }
    
    // Validate manual entry
    if (isManualEntry) {
      if (!/^[A-Z0-9]{1,10}$/.test(coinSymbol)) {
        toast.error('Sembol 1-10 karakter, sadece harf ve rakam olmalı');
        return;
      }
      if (manualName.length > 50) {
        toast.error('İsim en fazla 50 karakter olabilir');
        return;
      }
    }

    setSaving(true);
    try {
      const holdingData = {
        user_id: user.id,
        symbol: coinSymbol,
        name: coinName || coinSymbol,
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchasePrice),
        purchase_currency: 'USD',
        exchange: exchange || null,
        notes: notes || null,
      };

      if (editingHolding) {
        const { error } = await supabase
          .from('crypto_holdings')
          .update(holdingData)
          .eq('id', editingHolding.id);
        if (error) throw error;
        toast.success('Varlık güncellendi');
      } else {
        const { error } = await supabase
          .from('crypto_holdings')
          .insert(holdingData);
        if (error) throw error;
        toast.success('Varlık eklendi');
      }

      resetForm();
      setDialogOpen(false);
      fetchHoldings();
    } catch (error) {
      console.error('Error saving holding:', error);
      toast.error('Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Demo mode - simulate delete
    if (isDemoMode) {
      toast.info(t('demo.cannotDelete'));
      return;
    }

    try {
      const { error } = await supabase
        .from('crypto_holdings')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Varlık silindi');
      fetchHoldings();
    } catch (error) {
      console.error('Error deleting holding:', error);
      toast.error('Silme hatası');
    }
  };

  const handleEdit = (holding: CryptoHolding) => {
    // Demo mode - simulate edit
    if (isDemoMode) {
      toast.info(t('demo.cannotEdit'));
      return;
    }
    
    setEditingHolding(holding);
    setSelectedCoin(holding.symbol);
    setQuantity(holding.quantity.toString());
    setPurchasePrice(holding.purchase_price.toString());
    setExchange(holding.exchange || "");
    setNotes(holding.notes || "");
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingHolding(null);
    setSelectedCoin("");
    setQuantity("");
    setPurchasePrice("");
    setExchange("");
    setNotes("");
    setIsManualEntry(false);
    setManualSymbol("");
    setManualName("");
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

  // Detailed loading state
  const LoadingIndicator = () => {
    const stages = [
      { key: 'holdings', label: 'Varlıklar', loading: loading, done: !loading },
      { key: 'coins', label: 'Coin listesi', loading: loadingCoins, done: allCoins.length > defaultPopularCoins.length },
      { key: 'prices', label: 'Fiyatlar', loading: loadingPrices, done: Object.keys(prices).length > 0 },
    ];

    return (
      <div className="flex items-center gap-4 text-sm">
        {stages.map((stage, idx) => (
          <div key={stage.key} className="flex items-center gap-1.5">
            {stage.loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : stage.done ? (
              <div className="h-3.5 w-3.5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
            )}
            <span className={stage.loading ? 'text-primary font-medium' : stage.done ? 'text-muted-foreground' : 'text-muted-foreground/50'}>
              {stage.label}
            </span>
            {idx < stages.length - 1 && <span className="text-muted-foreground/30 ml-2">→</span>}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 lg:p-8 space-y-6">
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="p-4 rounded-full bg-orange-100 dark:bg-orange-900/30 animate-pulse">
              <Bitcoin className="h-10 w-10 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">Kripto Portföyü Yükleniyor</h2>
              <LoadingIndicator />
            </div>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '30%' }} />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-full bg-orange-100 dark:bg-orange-900/30 shrink-0">
              <Bitcoin className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">{t('crypto.title')}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{t('crypto.subtitle')}</p>
            </div>
          </div>
          
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPrices}
              disabled={loadingPrices}
              className="h-8 px-2 sm:px-3"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loadingPrices ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">{t('crypto.refreshPrices')}</span>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 px-2 sm:px-3">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-2">{t('crypto.addAsset')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingHolding ? t('crypto.editAsset') : t('crypto.addAsset')}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t('crypto.coin')}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => {
                          setIsManualEntry(!isManualEntry);
                          setSelectedCoin("");
                          setManualSymbol("");
                          setManualName("");
                        }}
                      >
                        {isManualEntry ? "← Listeden seç" : "Manuel ekle"}
                      </Button>
                    </div>
                    
                    {isManualEntry ? (
                      <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          Listede olmayan coin'i manuel olarak ekleyebilirsiniz
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Sembol *</Label>
                            <Input
                              type="text"
                              placeholder="MNT"
                              value={manualSymbol}
                              onChange={(e) => setManualSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                              className="uppercase"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">İsim</Label>
                            <Input
                              type="text"
                              placeholder="Mantle"
                              value={manualName}
                              onChange={(e) => setManualName(e.target.value.slice(0, 50))}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Coin ara (BTC, ETH, SOL...)"
                          value={coinSearch}
                          onChange={(e) => setCoinSearch(e.target.value)}
                          className="mb-2"
                        />
                        <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCoins ? "Yükleniyor..." : t('crypto.selectCoin')} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {filteredCoins.map(coin => (
                              <SelectItem key={coin.symbol} value={coin.symbol}>
                                {coin.symbol} - {coin.name}
                              </SelectItem>
                            ))}
                            {filteredCoins.length === 0 && !loadingCoins && coinSearch.trim() !== "" && (
                              <div className="p-3 text-center space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  "{coinSearch}" bulunamadı
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setIsManualEntry(true);
                                    setManualSymbol(coinSearch.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
                                  }}
                                >
                                  Manuel olarak ekle
                                </Button>
                              </div>
                            )}
                            {filteredCoins.length === 0 && !loadingCoins && coinSearch.trim() === "" && (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                Coin ara...
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {allCoins.length} coin mevcut (Binance)
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('crypto.quantity')}</Label>
                      <Input 
                        type="number" 
                        step="any"
                        value={quantity} 
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('crypto.purchasePrice')}</Label>
                      <Input 
                        type="number" 
                        step="any"
                        value={purchasePrice} 
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="50000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('crypto.exchange')}</Label>
                    <Select value={exchange} onValueChange={setExchange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('crypto.selectExchange')} />
                      </SelectTrigger>
                      <SelectContent>
                        {exchanges.map(ex => (
                          <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('crypto.notes')}</Label>
                    <Input 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('crypto.optionalNote')}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingHolding ? t('crypto.update') : t('crypto.add')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Portfolio Stats Cards - Horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:overflow-visible">
          <Card className="p-2 sm:p-3 min-w-[140px] sm:min-w-0 shrink-0 sm:shrink">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1 sm:p-1.5 rounded-full bg-primary/10 shrink-0">
                <Wallet className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{t('crypto.totalValue')}</p>
                <p className="text-sm sm:text-base font-bold truncate">{formatAmount(stats.totalValue)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2 sm:p-3 min-w-[140px] sm:min-w-0 shrink-0 sm:shrink">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1 sm:p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
                <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{t('crypto.totalCost')}</p>
                <p className="text-sm sm:text-base font-bold truncate">{formatAmount(stats.totalCost)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2 sm:p-3 min-w-[140px] sm:min-w-0 shrink-0 sm:shrink">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`p-1 sm:p-1.5 rounded-full shrink-0 ${stats.totalPnL >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {stats.totalPnL >= 0 ? (
                  <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{t('crypto.profitLoss')}</p>
                <p className={`text-sm sm:text-base font-bold truncate ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalPnL >= 0 ? '+' : ''}{formatAmount(stats.totalPnL)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-2 sm:p-3 min-w-[120px] sm:min-w-0 shrink-0 sm:shrink">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`p-1 sm:p-1.5 rounded-full shrink-0 ${stats.totalPnLPercent >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {stats.totalPnLPercent >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{t('crypto.change')}</p>
                <p className={`text-sm sm:text-base font-bold ${stats.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalPnLPercent >= 0 ? '+' : ''}{stats.totalPnLPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Market Overview */}
        <MarketOverview />

        {/* Price Alerts & My Holdings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
          <PriceAlerts prices={prices} availableCoins={allCoins.slice(0, 100)} />
          
          <Card>
            <CardHeader className="pb-1.5 sm:pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
              <CardTitle className="text-xs sm:text-sm">{t('crypto.myAssets')}</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[250px] sm:max-h-[300px] overflow-y-auto px-3 sm:px-4 pb-3 sm:pb-4">
              {holdings.length === 0 ? (
                <div className="text-center py-4 sm:py-6 text-muted-foreground">
                  <Bitcoin className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('crypto.noAssets')}</p>
                  <p className="text-xs">{t('crypto.noAssetsHint')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {holdings.map(holding => {
                    const price = prices[holding.symbol];
                    const currentValue = price ? holding.quantity * price.price : 0;
                    const cost = holding.quantity * holding.purchase_price;
                    const pnl = currentValue - cost;
                    const pnlPercent = cost > 0 ? ((currentValue - cost) / cost) * 100 : 0;

                    return (
                      <div 
                        key={holding.id}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CryptoIcon symbol={holding.symbol} size="md" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{holding.name}</p>
                                <Badge variant="secondary" className="text-[10px] px-1.5">
                                  {holding.symbol}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {holding.quantity} @ ${holding.purchase_price.toLocaleString('en-US')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {price ? (
                              <div className="text-right">
                                <p className="text-sm font-semibold">
                                  {formatAmount(currentValue)}
                                </p>
                                <p className={`text-xs font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                                </p>
                              </div>
                            ) : (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEdit(holding)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(holding.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
          <PortfolioHistoryChart holdings={holdings} />
          <PortfolioDistributionChart holdings={holdings} prices={prices} />
        </div>

        {/* Live Prices Table */}
        <PortfolioLiveTable holdings={holdings} onPricesUpdate={setPrices} />

        {/* Top 10 Crypto */}
        <Top10CryptoWidget />
      </div>
    </Layout>
  );
}
