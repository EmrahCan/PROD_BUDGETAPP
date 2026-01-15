import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { Package, ShoppingCart, Tag, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { tr, de, enUS } from "date-fns/locale";
import i18n from "i18next";
import { toast } from "sonner";
import { scanReceiptWithTesseract } from "@/utils/freeOCR";
import { Progress } from "@/components/ui/progress";

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  category: string | null;
  brand: string | null;
  created_at: string;
}

interface TransactionItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
  transactionDescription?: string;
  transactionDate?: string;
  transactionAmount?: number;
  receiptImageUrl?: string | null;
}

export function TransactionItemsDialog({
  open,
  onOpenChange,
  transactionId,
  transactionDescription,
  transactionDate,
  transactionAmount,
  receiptImageUrl
}: TransactionItemsDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatCurrency } = useCurrencyFormat();
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanProgress, setRescanProgress] = useState(0);
  const [rescanStatus, setRescanStatus] = useState("");

  const getLocale = () => {
    switch (i18n.language) {
      case 'tr': return tr;
      case 'de': return de;
      default: return enUS;
    }
  };

  useEffect(() => {
    if (open && transactionId) {
      fetchItems();
    } else {
      setItems([]);
    }
  }, [open, transactionId]);

  const fetchItems = async () => {
    if (!transactionId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("receipt_items")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching receipt items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRescan = async () => {
    if (!receiptImageUrl || !transactionId || !user) {
      toast.error("Fiş görseli bulunamadı");
      return;
    }

    setRescanning(true);
    setRescanProgress(0);
    setRescanStatus(t('receiptScanner.loadingImage'));

    try {
      // Fetch the image and convert to base64
      const response = await fetch(receiptImageUrl);
      if (!response.ok) throw new Error("Görsel yüklenemedi");
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const base64 = await base64Promise;
      
      // Try Tesseract first
      setRescanStatus(t('receiptScanner.analyzingReceipt'));
      const tesseractResult = await scanReceiptWithTesseract(base64, (progress, status) => {
        setRescanProgress(progress);
        setRescanStatus(status);
      });

      let finalItems = tesseractResult.items || [];

      // If Tesseract doesn't extract items well, try AI
      if (finalItems.length === 0 || tesseractResult.confidence < 50) {
        setRescanStatus("AI ile analiz ediliyor...");
        setRescanProgress(70);

        try {
          const { data, error } = await supabase.functions.invoke('receipt-scanner', {
            body: { image: base64 }
          });

          if (!error && data && !data.error && data.items && data.items.length > 0) {
            finalItems = data.items;
          }
        } catch (aiError) {
          console.log("AI fallback failed, using Tesseract result:", aiError);
        }
      }

      if (finalItems.length === 0) {
        toast.error("Ürün bilgisi çıkarılamadı. Fiş kalitesi yeterli olmayabilir.");
        return;
      }

      // Delete existing items for this transaction
      await supabase
        .from("receipt_items")
        .delete()
        .eq("transaction_id", transactionId);

      // Insert new items
      setRescanStatus("Ürünler kaydediliyor...");
      setRescanProgress(90);

      const itemsToInsert = finalItems.map((item: any) => ({
        user_id: user.id,
        transaction_id: transactionId,
        name: item.name,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        total_price: item.total_price,
        category: item.category || "Gıda",
        brand: item.brand || null,
        transaction_date: transactionDate || null
      }));

      const { error: insertError } = await supabase
        .from("receipt_items")
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      setRescanProgress(100);
      toast.success(`${finalItems.length} ürün başarıyla eklendi!`);
      
      // Refresh items list
      fetchItems();

    } catch (error: any) {
      console.error("Rescan error:", error);
      toast.error("Fiş tarama hatası: " + (error.message || "Bilinmeyen hata"));
    } finally {
      setRescanning(false);
      setRescanProgress(0);
      setRescanStatus("");
    }
  };

  const totalItemsPrice = items.reduce((sum, item) => sum + Number(item.total_price), 0);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

  const canRescan = receiptImageUrl && items.length === 0 && !rescanning;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t('transactionItems.title')}
          </DialogTitle>
          {transactionDate && (
            <p className="text-sm text-muted-foreground">
              {format(new Date(transactionDate), "d MMMM yyyy", { locale: getLocale() })}
              {transactionDescription && ` • ${transactionDescription}`}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : rescanning ? (
            <div className="py-8 px-4">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{rescanStatus}</p>
                <Progress value={rescanProgress} className="w-full" />
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('transactionItems.noItems')}</p>
              <p className="text-xs mt-1">{t('transactionItems.noItemsHint')}</p>
              
              {/* Rescan button for receipts with image but no items */}
              {receiptImageUrl && (
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Fiş görseli mevcut
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Bu işlem için fiş görseli var ancak ürün kalemleri çıkarılmamış. 
                        Fişi tekrar tarayarak ürün kalemlerini ekleyebilirsiniz.
                      </p>
                      <Button
                        onClick={handleRescan}
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Fişi Tekrar Tara
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Summary */}
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="font-medium">{totalQuantity} {t('transactionItems.totalItems')}</span>
                </div>
                <span className="font-bold">{formatCurrency(totalItemsPrice, "TRY")}</span>
              </div>

              {/* Items List */}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{item.name}</p>
                      {item.brand && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.brand}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {item.category}
                        </Badge>
                      )}
                      {item.quantity > 1 && (
                        <span>{item.quantity} {t('transactionItems.pieces')}</span>
                      )}
                      {item.unit_price && (
                        <span>@ {formatCurrency(Number(item.unit_price), "TRY")}</span>
                      )}
                    </div>
                  </div>
                  <p className="font-bold whitespace-nowrap ml-4">
                    {formatCurrency(Number(item.total_price), "TRY")}
                  </p>
                </div>
              ))}

              {/* Rescan option even when items exist */}
              {receiptImageUrl && (
                <div className="pt-4 border-t mt-4">
                  <Button
                    onClick={handleRescan}
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground hover:text-foreground"
                    disabled={rescanning}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Ürünleri Yeniden Tara
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
