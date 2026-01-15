import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Check, X, ScanLine, Zap, CreditCard, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { scanReceiptWithTesseract } from "@/utils/freeOCR";
import { BankLogo } from "@/components/BankLogo";

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  category: string | null;
  brand: string | null;
}

interface ReceiptData {
  amount: number;
  category: string;
  description: string;
  currency: string;
  date: string | null;
  confidence: number;
  items?: ReceiptItem[];
}

interface Account {
  id: string;
  name: string;
  bank_id: string;
  bank_name: string;
  balance: number;
  currency: string;
}

interface CreditCard {
  id: string;
  name: string;
  bank_id: string;
  bank_name: string;
  last_four_digits: string;
  balance: number;
  currency: string;
}

interface ReceiptScannerProps {
  onReceiptScanned: (data: {
    amount: string;
    category: string;
    description: string;
    currency: string;
    date?: Date;
    receiptImageUrl?: string;
    accountId?: string;
    cardId?: string;
    items?: ReceiptItem[];
  }) => void;
}

const categories = [
  // Gelir
  "Maaş",
  "Ek Gelir",
  "Yatırım Geliri",
  "Kira Geliri",
  "Hediye",
  // Ev & Yaşam
  "Kira",
  "Aidat",
  "Faturalar",
  "Elektrik",
  "Su",
  "Doğalgaz",
  "İnternet",
  "Telefon",
  // Market & Alışveriş
  "Market",
  "Online Alışveriş",
  "Giyim",
  "Kozmetik",
  "Ev Eşyası",
  // Ulaşım
  "Ulaşım",
  "Yakıt",
  "Araç Bakım",
  "Otopark",
  "Taksi",
  // Yeme & İçme
  "Restoran",
  "Kafe",
  "Fast Food",
  "Yemek Siparişi",
  // Sağlık & Spor
  "Sağlık",
  "Eczane",
  "Spor Salonu",
  // Eğlence & Hobi
  "Eğlence",
  "Sinema",
  "Konser",
  "Oyun",
  "Hobi",
  // Eğitim
  "Eğitim",
  "Kitap",
  "Kurs",
  // Finans
  "Kredi Ödemesi",
  "Sigorta",
  "Vergi",
  "Banka Masrafı",
  // Abonelikler
  "Abonelik",
  "Netflix",
  "Spotify",
  "YouTube",
  "Apple",
  // Diğer
  "Bağış",
  "Tatil",
  "Diğer"
];

export function ReceiptScanner({ onReceiptScanned }: ReceiptScannerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [editedData, setEditedData] = useState<ReceiptData | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [usingFreeOcr, setUsingFreeOcr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Account/Card selection
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  
  useEffect(() => {
    if (open && user) {
      fetchAccountsAndCards();
    }
  }, [open, user]);
  
  const fetchAccountsAndCards = async () => {
    if (!user) return;
    
    const [accountsRes, cardsRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('credit_cards').select('*').eq('user_id', user.id)
    ]);
    
    if (accountsRes.data) setAccounts(accountsRes.data);
    if (cardsRes.data) setCards(cardsRes.data);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPreviewUrl(base64);
      await scanReceipt(base64);
    };
    reader.readAsDataURL(file);
  };

  const uploadReceiptImage = async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;
    
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, selectedFile);
      
      if (uploadError) throw uploadError;
      
      // Use signed URL for private bucket access (1 year expiry)
      const { data, error: signedUrlError } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 31536000); // 1 year in seconds
      
      if (signedUrlError) throw signedUrlError;
      
      return data.signedUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Minimum confidence threshold to use Tesseract result without AI fallback
  const CONFIDENCE_THRESHOLD = 60; // Lowered from 70 to allow more Tesseract results

  const scanReceipt = async (imageBase64: string) => {
    setScanning(true);
    setReceiptData(null);
    setEditedData(null);
    setOcrProgress(0);
    setOcrStatus("");
    setUsingFreeOcr(true);

    try {
      // STEP 1: Always try free Tesseract OCR first (cost-effective)
      console.log('Starting hybrid scan: Tesseract first...');
      
      const tesseractResult = await scanReceiptWithTesseract(imageBase64, (progress, status) => {
        setOcrProgress(progress);
        setOcrStatus(status);
      });
      
      console.log('Tesseract result:', tesseractResult);
      console.log('Tesseract items:', tesseractResult.items);
      
      // STEP 2: Decide whether Tesseract result is reliable enough
      const items = tesseractResult.items ?? [];
      const itemsWithLetters = items.filter((it) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(it.name)).length;
      const itemsNamesRatio = items.length > 0 ? itemsWithLetters / items.length : 0;
      const itemsSum = items.reduce((acc, it) => acc + (Number.isFinite(it.total_price) ? it.total_price : 0), 0);
      const sumDiffRatio =
        tesseractResult.amount > 0 && itemsSum > 0
          ? Math.abs(itemsSum - tesseractResult.amount) / tesseractResult.amount
          : 1;

      const hasReasonableDescription =
        Boolean(tesseractResult.description) &&
        tesseractResult.description !== "Fiş Taraması" &&
        tesseractResult.description.trim().length >= 3 &&
        !/^[\d\s:=\-+]+$/.test(tesseractResult.description);

      // If total is large but confidence isn't very high, prefer AI (common OCR digit errors like 599.90 -> 1599.90)
      const suspiciousLargeTotal = tesseractResult.amount >= 1000 && tesseractResult.confidence < 75;

      // For product analysis, we want items even if not perfect - relaxed conditions
      const itemsLookGood = items.length > 0 && itemsNamesRatio >= 0.5;

      // Relaxed conditions for accepting Tesseract result
      const canUseTesseract =
        tesseractResult.confidence >= CONFIDENCE_THRESHOLD &&
        tesseractResult.amount > 0 &&
        !suspiciousLargeTotal;

      if (canUseTesseract) {
        // Good quality - use Tesseract result directly (FREE!)
        console.log(`Tesseract accepted (confidence ${tesseractResult.confidence}%). Using free OCR result with ${items.length} items.`);
        setReceiptData(tesseractResult);
        setEditedData(tesseractResult);
        toast.success(t('receiptScanner.scanSuccess') + ' ✓ Ücretsiz');
        return;
      }
      
      // STEP 3: Not reliable - try AI for better accuracy
      console.log('Tesseract result not reliable enough for total/items. Falling back to AI...', {
        confidence: tesseractResult.confidence,
        suspiciousLargeTotal,
        itemsCount: items.length,
        itemsNamesRatio,
        sumDiffRatio,
      });
      setUsingFreeOcr(false);
      setOcrStatus("AI ile analiz ediliyor...");
      
      try {
        const { data, error } = await supabase.functions.invoke('receipt-scanner', {
          body: { image: imageBase64 }
        });

        if (error) throw error;
        
        if (data.error) {
          // AI failed - use Tesseract result anyway
          if (data.error.includes('402') || data.error.includes('429') || 
              data.error.includes('Payment required') || data.error.includes('Rate limit')) {
            console.log('AI credits exhausted, using Tesseract result anyway...');
            setReceiptData(tesseractResult);
            setEditedData(tesseractResult);
            toast.success(t('receiptScanner.scanSuccess') + ' (Ücretsiz OCR)');
            return;
          }
          throw new Error(data.error);
        }

        // AI succeeded - use AI result
        setReceiptData(data);
        setEditedData(data);
        toast.success(t('receiptScanner.scanSuccess') + ' (AI)');
      } catch (aiError) {
        // AI failed - fallback to Tesseract result
        console.log('AI scan failed, using Tesseract result:', aiError);
        setReceiptData(tesseractResult);
        setEditedData(tesseractResult);
        toast.success(t('receiptScanner.scanSuccess') + ' (Ücretsiz OCR)');
      }
      
    } catch (error: any) {
      console.error('Receipt scan error:', error);
      toast.error(t('receiptScanner.scanError'));
    } finally {
      setScanning(false);
      setUsingFreeOcr(false);
    }
  };

  const handleConfirm = async () => {
    if (!editedData) return;
    
    if (!paymentMethod) {
      toast.error(t('dialogs.selectPaymentMethod'));
      return;
    }

    // Upload image first
    const imageUrl = await uploadReceiptImage();
    
    const isCard = paymentMethod.startsWith('card_');
    const id = paymentMethod.replace('card_', '').replace('account_', '');

    onReceiptScanned({
      amount: editedData.amount.toString(),
      category: editedData.category,
      description: editedData.description,
      currency: editedData.currency,
      date: editedData.date ? new Date(editedData.date) : undefined,
      receiptImageUrl: imageUrl || undefined,
      accountId: isCard ? undefined : id,
      cardId: isCard ? id : undefined,
      items: editedData.items
    });

    toast.success(t('receiptScanner.dataTransferred'));
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setReceiptData(null);
    setEditedData(null);
    setPaymentMethod("");
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1 lg:gap-2 h-7 lg:h-9 px-2 lg:px-4 text-xs lg:text-sm">
          <ScanLine className="h-3.5 w-3.5 lg:h-5 lg:w-5" />
          <span className="hidden sm:inline">{t('receiptScanner.scanReceipt')}</span>
          <span className="sm:hidden">{t('transactions.scanShort')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {t('receiptScanner.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload buttons */}
          {!previewUrl && (
            <div className="grid grid-cols-2 gap-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>{t('receiptScanner.takePhoto')}</span>
              </Button>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8" />
                <span>{t('receiptScanner.uploadImage')}</span>
              </Button>
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full rounded-lg border max-h-48 object-contain bg-muted"
              />
              {scanning && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <div className="flex flex-col items-center gap-2 w-full px-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm">{t('receiptScanner.scanning')}</span>
                    {usingFreeOcr && (
                      <div className="w-full space-y-1">
                        <Progress value={ocrProgress} className="h-2" />
                        <p className="text-xs text-center text-muted-foreground">
                          {ocrStatus} {ocrProgress > 0 && `(${ocrProgress}%)`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scanned data */}
          {editedData && !scanning && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('receiptScanner.extractedData')}</h4>
                <span className={`text-sm ${getConfidenceColor(editedData.confidence)}`}>
                  {t('receiptScanner.confidence')}: {editedData.confidence}%
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>{t('dialogs.amount')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedData.amount}
                    onChange={(e) => setEditedData({ ...editedData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-1">
                  <Label>{t('dialogs.currency')}</Label>
                  <Select
                    value={editedData.currency}
                    onValueChange={(value) => setEditedData({ ...editedData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>{t('dialogs.category')}</Label>
                  <Select
                    value={editedData.category}
                    onValueChange={(value) => setEditedData({ ...editedData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>{t('dialogs.description')}</Label>
                  <Input
                    value={editedData.description}
                    onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {t('dialogs.paymentMethod')}
                  </Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('dialogs.selectPaymentMethod')} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {t('accounts.title')}
                          </div>
                          {accounts.map((account) => (
                            <SelectItem key={`account_${account.id}`} value={`account_${account.id}`}>
                              <div className="flex items-center gap-2">
                                <BankLogo bankId={account.bank_id} size="sm" />
                                <span>{account.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {cards.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1 mt-1">
                            <CreditCard className="h-3 w-3" />
                            {t('cards.title')}
                          </div>
                          {cards.map((card) => (
                            <SelectItem key={`card_${card.id}`} value={`card_${card.id}`}>
                              <div className="flex items-center gap-2">
                                <BankLogo bankId={card.bank_id} size="sm" />
                                <span>{card.name} (*{card.last_four_digits})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Items List */}
                {editedData.items && editedData.items.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="flex items-center gap-2">
                      <ScanLine className="h-4 w-4" />
                      {t('receiptScanner.scannedItems')} ({editedData.items.length})
                    </Label>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {editedData.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity > 1 && `${item.quantity}x `}
                              {item.category && <span className="bg-primary/10 text-primary px-1 rounded">{item.category}</span>}
                              {item.brand && <span className="ml-1 text-muted-foreground">• {item.brand}</span>}
                            </p>
                          </div>
                          <span className="font-medium whitespace-nowrap ml-2">
                            {item.total_price.toFixed(2)} {editedData.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                  {t('dialogs.cancel')}
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleConfirm}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {t('receiptScanner.useData')}
                </Button>
              </div>
            </Card>
          )}

          {/* Retake button */}
          {previewUrl && !scanning && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setPreviewUrl(null);
                setReceiptData(null);
                setEditedData(null);
              }}
            >
              {t('receiptScanner.scanAnother')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
