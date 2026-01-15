import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Loader2, CheckCircle } from "lucide-react";

interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  target_price: number;
  direction: "above" | "below";
  is_active: boolean;
  is_triggered: boolean;
  triggered_at: string | null;
}

interface CryptoPrice {
  symbol: string;
  price: number;
}

interface PriceAlertsProps {
  prices: Record<string, CryptoPrice>;
  availableCoins: { symbol: string; name: string }[];
}

export function PriceAlerts({ prices, availableCoins }: PriceAlertsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedCoin, setSelectedCoin] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  // Check alerts when prices update
  useEffect(() => {
    if (Object.keys(prices).length > 0 && alerts.length > 0) {
      checkAlerts();
    }
  }, [prices]);

  const fetchAlerts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("crypto_price_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts((data || []) as PriceAlert[]);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkAlerts = async () => {
    const triggeredAlerts: PriceAlert[] = [];

    for (const alert of alerts) {
      if (!alert.is_active || alert.is_triggered) continue;

      const currentPrice = prices[alert.symbol]?.price;
      if (!currentPrice) continue;

      const shouldTrigger =
        (alert.direction === "above" && currentPrice >= alert.target_price) ||
        (alert.direction === "below" && currentPrice <= alert.target_price);

      if (shouldTrigger) {
        triggeredAlerts.push(alert);
      }
    }

    if (triggeredAlerts.length > 0) {
      for (const alert of triggeredAlerts) {
        const currentPrice = prices[alert.symbol]?.price;
        
        // Update alert as triggered
        await supabase
          .from("crypto_price_alerts")
          .update({ is_triggered: true, triggered_at: new Date().toISOString() })
          .eq("id", alert.id);

        // Create notification
        const directionText = alert.direction === "above" ? t('crypto.priceWentAbove') : t('crypto.priceWentBelow');
        await supabase.from("notifications").insert({
          user_id: user!.id,
          title: `${t('crypto.priceAlertTitle')}: ${alert.symbol}`,
          message: `${alert.name} ${directionText}: $${currentPrice?.toLocaleString()} (${t('crypto.target')}: $${alert.target_price.toLocaleString()})`,
          notification_type: "price_alert",
          priority: "high",
        });

        toast.success(`🔔 ${alert.symbol} ${t('crypto.reachedTarget')}: $${currentPrice?.toLocaleString()}`);
      }

      fetchAlerts();
    }
  };

  const handleSave = async () => {
    if (!user || !selectedCoin || !targetPrice) {
      toast.error(t('crypto.fillRequired'));
      return;
    }

    setSaving(true);
    try {
      const coin = availableCoins.find((c) => c.symbol === selectedCoin);

      const { error } = await supabase.from("crypto_price_alerts").insert({
        user_id: user.id,
        symbol: selectedCoin,
        name: coin?.name || selectedCoin,
        target_price: parseFloat(targetPrice),
        direction,
      });

      if (error) throw error;

      toast.success(t('crypto.alertAdded'));
      setDialogOpen(false);
      resetForm();
      fetchAlerts();
    } catch (error) {
      console.error("Error saving alert:", error);
      toast.error(t('crypto.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("crypto_price_alerts").delete().eq("id", id);
      if (error) throw error;
      toast.success(t('crypto.alertDeleted'));
      fetchAlerts();
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast.error(t('crypto.deleteError'));
    }
  };

  const resetForm = () => {
    setSelectedCoin("");
    setTargetPrice("");
    setDirection("above");
  };

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {t('crypto.priceAlerts')}
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 sm:h-8 px-2 sm:px-3 text-xs">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-1">{t('crypto.addAlert')}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('crypto.newPriceAlert')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('crypto.coin')}</Label>
                <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('crypto.selectCoin')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCoins.map((coin) => (
                      <SelectItem key={coin.symbol} value={coin.symbol}>
                        {coin.symbol} - {coin.name}
                        {prices[coin.symbol] && (
                          <span className="ml-2 text-muted-foreground">
                            (${prices[coin.symbol].price.toLocaleString()})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('crypto.direction')}</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as "above" | "below")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        {t('crypto.above')}
                      </span>
                    </SelectItem>
                    <SelectItem value="below">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        {t('crypto.below')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('crypto.targetPrice')}</Label>
                <Input
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="50000"
                />
                {selectedCoin && prices[selectedCoin] && (
                  <p className="text-xs text-muted-foreground">
                    {t('crypto.currentPriceLabel')}: ${prices[selectedCoin].price.toLocaleString()}
                  </p>
                )}
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('crypto.addAlertBtn')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        {loading ? (
          <div className="flex justify-center py-3 sm:py-4">
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-4 sm:py-6 text-muted-foreground">
            <Bell className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">{t('crypto.noAlerts')}</p>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
            {alerts.map((alert) => {
              const currentPrice = prices[alert.symbol]?.price;
              const progress = currentPrice
                ? alert.direction === "above"
                  ? Math.min(100, (currentPrice / alert.target_price) * 100)
                  : Math.min(100, (alert.target_price / currentPrice) * 100)
                : 0;

              return (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border ${
                    alert.is_triggered ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                      className={`p-1.5 sm:p-2 rounded-full shrink-0 ${
                        alert.direction === "above"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}
                    >
                      {alert.direction === "above" ? (
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-medium text-sm">{alert.symbol}</span>
                        {alert.is_triggered && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] sm:text-xs px-1.5 py-0">
                            <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                            <span className="hidden sm:inline">{t('crypto.triggered')}</span>
                            <span className="sm:hidden">✓</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {alert.direction === "above" ? "≥" : "≤"} {formatPrice(alert.target_price)}
                        {currentPrice && !alert.is_triggered && (
                          <span className="hidden sm:inline ml-2">
                            ({t('crypto.currentPriceLabel')}: {formatPrice(currentPrice)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={() => handleDelete(alert.id)}>
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}