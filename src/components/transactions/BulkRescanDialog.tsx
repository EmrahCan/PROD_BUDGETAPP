import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle, Package, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { scanReceiptWithTesseract } from "@/utils/freeOCR";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TransactionWithMissingItems {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  receipt_image_url: string;
}

interface ScanResult {
  transactionId: string;
  description: string;
  status: 'pending' | 'scanning' | 'success' | 'error';
  itemCount?: number;
  error?: string;
  selected: boolean;
}

interface BulkRescanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function BulkRescanDialog({ open, onOpenChange, onComplete }: BulkRescanDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatCurrency } = useCurrencyFormat();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionWithMissingItems[]>([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    if (open && user) {
      fetchTransactionsWithMissingItems();
    }
  }, [open, user]);

  const fetchTransactionsWithMissingItems = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get all transactions with receipt images
      const { data: transactionsData, error } = await supabase
        .from("transactions")
        .select("id, description, amount, transaction_date, receipt_image_url")
        .eq("user_id", user.id)
        .not("receipt_image_url", "is", null)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      // Get transactions that have receipt_items
      const { data: itemsData, error: itemsError } = await supabase
        .from("receipt_items")
        .select("transaction_id")
        .eq("user_id", user.id);

      if (itemsError) throw itemsError;

      const transactionIdsWithItems = new Set(itemsData?.map(i => i.transaction_id) || []);

      // Filter to only those without items
      const missingItems = (transactionsData || []).filter(
        t => t.receipt_image_url && !transactionIdsWithItems.has(t.id)
      ) as TransactionWithMissingItems[];

      setTransactions(missingItems);
      setResults(missingItems.map(t => ({
        transactionId: t.id,
        description: t.description || 'İsimsiz',
        status: 'pending',
        selected: true // Default all selected
      })));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("İşlemler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const scanSingleReceipt = async (transaction: TransactionWithMissingItems): Promise<{ success: boolean; itemCount: number; error?: string }> => {
    try {
      // Fetch image
      const response = await fetch(transaction.receipt_image_url);
      if (!response.ok) throw new Error("Görsel yüklenemedi");

      const blob = await response.blob();
      const reader = new FileReader();

      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Try Tesseract first
      const tesseractResult = await scanReceiptWithTesseract(base64, () => {});
      let finalItems = tesseractResult.items || [];

      // If Tesseract doesn't work well, try AI
      if (finalItems.length === 0 || tesseractResult.confidence < 50) {
        try {
          const { data, error } = await supabase.functions.invoke('receipt-scanner', {
            body: { image: base64 }
          });

          if (!error && data && !data.error && data.items?.length > 0) {
            finalItems = data.items;
          }
        } catch {
          // Ignore AI errors, use Tesseract result
        }
      }

      if (finalItems.length === 0) {
        return { success: false, itemCount: 0, error: "Ürün çıkarılamadı" };
      }

      // Insert items with transaction_date from parent transaction
      const itemsToInsert = finalItems.map((item: any) => ({
        user_id: user!.id,
        transaction_id: transaction.id,
        name: item.name,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        total_price: item.total_price,
        category: item.category || "Gıda",
        brand: item.brand || null,
        transaction_date: transaction.transaction_date
      }));

      const { error: insertError } = await supabase
        .from("receipt_items")
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      return { success: true, itemCount: finalItems.length };
    } catch (error: any) {
      return { success: false, itemCount: 0, error: error.message || "Bilinmeyen hata" };
    }
  };

  const toggleSelection = (index: number) => {
    if (scanning) return;
    const newResults = [...results];
    newResults[index].selected = !newResults[index].selected;
    setResults(newResults);
  };

  const toggleSelectAll = () => {
    if (scanning) return;
    const allSelected = results.every(r => r.selected);
    const newResults = results.map(r => ({ ...r, selected: !allSelected }));
    setResults(newResults);
  };

  const handleStartScan = async (scanAll: boolean = true) => {
    const toScan = scanAll 
      ? transactions 
      : transactions.filter((_, i) => results[i]?.selected);

    if (toScan.length === 0) {
      toast.error("Taranacak fiş seçilmedi");
      return;
    }

    setScanning(true);
    setCurrentIndex(0);
    setOverallProgress(0);

    const newResults = [...results];
    let scannedCount = 0;

    for (let i = 0; i < transactions.length; i++) {
      // Skip if not selected (when not scanning all)
      if (!scanAll && !results[i]?.selected) continue;

      setCurrentIndex(scannedCount);
      newResults[i].status = 'scanning';
      setResults([...newResults]);

      const result = await scanSingleReceipt(transactions[i]);

      if (result.success) {
        newResults[i].status = 'success';
        newResults[i].itemCount = result.itemCount;
      } else {
        newResults[i].status = 'error';
        newResults[i].error = result.error;
      }

      scannedCount++;
      setResults([...newResults]);
      setOverallProgress((scannedCount / toScan.length) * 100);

      // Small delay between scans to avoid rate limiting
      if (scannedCount < toScan.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setScanning(false);

    const successCount = newResults.filter(r => r.status === 'success').length;
    const totalItems = newResults.reduce((sum, r) => sum + (r.itemCount || 0), 0);

    if (successCount > 0) {
      toast.success(`${successCount} fiş başarıyla tarandı, ${totalItems} ürün eklendi!`);
      onComplete?.();
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const pendingCount = results.filter(r => r.status === 'pending').length;
  const selectedCount = results.filter(r => r.selected && r.status === 'pending').length;
  const allSelected = results.length > 0 && results.filter(r => r.status === 'pending').every(r => r.selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Eksik Ürün Kalemlerini Tara
          </DialogTitle>
          <DialogDescription>
            Fiş görseli olan ancak ürün kalemi çıkarılmamış işlemler tespit edildi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">Tüm fişler taranmış!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Eksik ürün kalemi olan işlem bulunamadı.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-300">
                    {transactions.length} fiş için ürün kalemi eksik
                  </span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Bu fişler tekrar taranarak ürün kalemleri çıkarılabilir ve Ürün Analizi sayfasında görüntülenebilir.
                </p>
              </div>

              {/* Select All */}
              {pendingCount > 0 && !scanning && (
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>{allSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}</span>
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} / {pendingCount} seçili
                  </span>
                </div>
              )}

              {/* Progress */}
              {scanning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Taranıyor: {currentIndex + 1} / {selectedCount || transactions.length}</span>
                    <span>{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              )}

              {/* Results list */}
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={result.transactionId}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        result.status === 'scanning' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                        result.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                        result.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                        result.selected ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-transparent'
                      }`}
                      onClick={() => result.status === 'pending' && toggleSelection(index)}
                    >
                      {/* Checkbox / Status icon */}
                      <div className="shrink-0">
                        {result.status === 'pending' && (
                          <Checkbox
                            checked={result.selected}
                            onCheckedChange={() => toggleSelection(index)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={scanning}
                          />
                        )}
                        {result.status === 'scanning' && (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        )}
                        {result.status === 'success' && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>

                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {result.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transactions[index]?.transaction_date).toLocaleDateString('tr-TR')}
                        </p>
                        {result.status === 'success' && result.itemCount && (
                          <p className="text-xs text-green-600">
                            {result.itemCount} ürün eklendi
                          </p>
                        )}
                        {result.status === 'error' && result.error && (
                          <p className="text-xs text-red-600">
                            {result.error}
                          </p>
                        )}
                      </div>

                      {/* Amount */}
                      <span className="text-sm font-medium shrink-0">
                        {formatCurrency(transactions[index]?.amount || 0, "TRY")}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Stats after scan */}
              {!scanning && (successCount > 0 || errorCount > 0) && (
                <div className="flex gap-4 text-sm">
                  {successCount > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{successCount} başarılı</span>
                    </div>
                  )}
                  {errorCount > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>{errorCount} başarısız</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:mr-auto">
            {scanning ? 'Arka Planda Devam Et' : 'Kapat'}
          </Button>
          {transactions.length > 0 && pendingCount > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="secondary"
                onClick={() => handleStartScan(false)} 
                disabled={scanning || selectedCount === 0}
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Taranıyor...
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Seçilenleri Tara ({selectedCount})
                  </>
                )}
              </Button>
              <Button onClick={() => handleStartScan(true)} disabled={scanning}>
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Taranıyor...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tümünü Tara ({pendingCount})
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
