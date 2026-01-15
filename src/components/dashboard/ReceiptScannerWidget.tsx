import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Check, ScanLine, ArrowRight, CreditCard, Building, Package, AlertTriangle, Edit } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo, DEMO_MOCK_DATA } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { scanReceiptWithTesseract } from "@/utils/freeOCR";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
  brand?: string | null;
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

export function ReceiptScannerWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [usingFreeOcr, setUsingFreeOcr] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDemoMode) {
      setAccounts(DEMO_MOCK_DATA.accounts);
      setCards(DEMO_MOCK_DATA.credit_cards);
    } else if (user) {
      fetchAccountsAndCards();
    }
  }, [user, isDemoMode]);

  const fetchAccountsAndCards = async () => {
    if (!user) return;

    const [accountsRes, cardsRes] = await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", user.id),
      supabase.from("credit_cards").select("*").eq("user_id", user.id),
    ]);

    if (accountsRes.data) setAccounts(accountsRes.data);
    if (cardsRes.data) setCards(cardsRes.data);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
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
    }
  };

  // Demo mode mock receipt data
  const DEMO_RECEIPT_DATA: ReceiptData = {
    amount: 347.50,
    category: "Market",
    description: "Migros",
    currency: "TRY",
    date: format(new Date(), "yyyy-MM-dd"),
    confidence: 95,
    items: [
      { name: "Süt 1lt", quantity: 2, unit_price: 32.90, total_price: 65.80, category: "Gıda", brand: "Sütaş" },
      { name: "Ekmek", quantity: 1, unit_price: 12.50, total_price: 12.50, category: "Gıda", brand: null },
      { name: "Peynir 400g", quantity: 1, unit_price: 89.90, total_price: 89.90, category: "Gıda", brand: "Pınar" },
      { name: "Zeytinyağı 1lt", quantity: 1, unit_price: 145.00, total_price: 145.00, category: "Gıda", brand: "Tariş" },
      { name: "Kola 1lt", quantity: 2, unit_price: 17.15, total_price: 34.30, category: "İçecek", brand: "Coca-Cola" },
    ]
  };

  const scanReceipt = async (imageBase64: string) => {
    setScanning(true);
    setReceiptData(null);
    setOcrProgress(0);
    setOcrStatus("");
    setUsingFreeOcr(false);

    // Demo mode: simulate scanning with mock data
    if (isDemoMode) {
      setOcrStatus("Demo fiş taranıyor...");
      setOcrProgress(50);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOcrProgress(100);
      setReceiptData(DEMO_RECEIPT_DATA);
      setShowItems(true);
      toast.success(t('receiptScanner.scanSuccess') + ' (Demo)');
      setScanning(false);
      return;
    }

    try {
      // Try AI-powered scanner first
      const { data, error } = await supabase.functions.invoke('receipt-scanner', {
        body: { image: imageBase64 }
      });

      if (error) throw error;
      
      if (data.error) {
        // Check if it's a payment/rate limit error - fallback to free OCR
        if (data.error.includes('402') || data.error.includes('429') || 
            data.error.includes('Payment required') || data.error.includes('Rate limit')) {
          console.log('AI credits exhausted, falling back to free OCR...');
          setUsingFreeOcr(true);
          const freeResult = await scanReceiptWithTesseract(imageBase64, (progress, status) => {
            setOcrProgress(progress);
            setOcrStatus(status);
          });
          console.log('Tesseract fallback result:', freeResult);
          console.log('Tesseract items:', freeResult.items);
          setReceiptData(freeResult);
          if (freeResult.items && freeResult.items.length > 0) {
            setShowItems(true);
          }
          toast.success(t('receiptScanner.scanSuccess') + ' (Ücretsiz OCR)');
          return;
        }
        throw new Error(data.error);
      }

      console.log('AI scan result:', data);
      console.log('AI items:', data.items);
      setReceiptData(data);
      if (data.items && data.items.length > 0) {
        setShowItems(true);
      }
      toast.success(t('receiptScanner.scanSuccess'));
    } catch (error: any) {
      console.error('Receipt scan error:', error);
      
      // Fallback to free OCR on any error
      try {
        console.log('Falling back to free OCR...');
        setUsingFreeOcr(true);
        const freeResult = await scanReceiptWithTesseract(imageBase64, (progress, status) => {
          setOcrProgress(progress);
          setOcrStatus(status);
        });
        console.log('Tesseract fallback result:', freeResult);
        console.log('Tesseract items:', freeResult.items);
        setReceiptData(freeResult);
        if (freeResult.items && freeResult.items.length > 0) {
          setShowItems(true);
        }
        toast.success(t('receiptScanner.scanSuccess') + ' (Ücretsiz OCR)');
      } catch (freeOcrError) {
        console.error('Free OCR also failed:', freeOcrError);
        toast.error(t('receiptScanner.scanError'));
      }
    } finally {
      setScanning(false);
      setUsingFreeOcr(false);
    }
  };

  const updateAccountBalance = async (accountId: string, amount: number) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const newBalance = account.balance - amount;
    
    // Check if overdraft is needed
    if (newBalance < 0 && account.overdraft_limit > 0) {
      const availableWithOverdraft = account.balance + account.overdraft_limit;
      if (amount > availableWithOverdraft) {
        toast.error(t('receiptScanner.insufficientFunds'));
        return false;
      }
    }

    const { error } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', accountId);

    if (error) {
      console.error('Account update error:', error);
      return false;
    }

    return true;
  };

  const updateCardBalance = async (cardId: string, amount: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const newBalance = card.balance + amount;
    
    // Check card limit
    if (newBalance > card.card_limit) {
      toast.error(t('receiptScanner.cardLimitExceeded'));
      return false;
    }

    const { error } = await supabase
      .from('credit_cards')
      .update({ balance: newBalance })
      .eq('id', cardId);

    if (error) {
      console.error('Card update error:', error);
      return false;
    }

    return true;
  };

  const handleSaveTransaction = async () => {
    if (!receiptData) return;

    // Demo mode: simulate saving
    if (isDemoMode) {
      setSaving(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      handleReset();
      setSaving(false);
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      // Upload image first
      const imageUrl = await uploadReceiptImage();

      // Update account or card balance if selected
      if (selectedPaymentMethod) {
        if (selectedPaymentMethod.startsWith('account-')) {
          const accountId = selectedPaymentMethod.replace('account-', '');
          const success = await updateAccountBalance(accountId, receiptData.amount);
          if (!success) {
            setSaving(false);
            return;
          }
        } else if (selectedPaymentMethod.startsWith('card-')) {
          const cardId = selectedPaymentMethod.replace('card-', '');
          const success = await updateCardBalance(cardId, receiptData.amount);
          if (!success) {
            setSaving(false);
            return;
          }
        }
      }

      const insertData: any = {
        user_id: user.id,
        transaction_type: "expense",
        amount: receiptData.amount,
        currency: receiptData.currency,
        category: receiptData.category,
        description: receiptData.description,
        transaction_date: receiptData.date || format(new Date(), "yyyy-MM-dd"),
      };

      if (imageUrl) {
        insertData.receipt_image_url = imageUrl;
      }

      if (selectedPaymentMethod) {
        if (selectedPaymentMethod.startsWith('account-')) {
          insertData.account_id = selectedPaymentMethod.replace('account-', '');
        } else if (selectedPaymentMethod.startsWith('card-')) {
          insertData.card_id = selectedPaymentMethod.replace('card-', '');
        }
      }

      const { data: transactionData, error } = await supabase
        .from("transactions")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Save receipt items if available
      let hasUnknownItems = false;
      if (receiptData.items && receiptData.items.length > 0 && transactionData) {
        const transactionDate = receiptData.date || format(new Date(), "yyyy-MM-dd");
        const itemsToInsert = receiptData.items.map(item => {
          // Check for unknown brand or category
          if (!item.brand || !item.category) {
            hasUnknownItems = true;
          }
          return {
            user_id: user.id,
            transaction_id: transactionData.id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category: item.category || null,
            brand: item.brand || null,
            transaction_date: transactionDate,
          };
        });

        await supabase.from("receipt_items").insert(itemsToInsert);
      }

      // Create notification for successful receipt scan
      const paymentMethodName = selectedPaymentMethod
        ? selectedPaymentMethod.startsWith('account-')
          ? accounts.find(a => a.id === selectedPaymentMethod.replace('account-', ''))?.name
          : cards.find(c => c.id === selectedPaymentMethod.replace('card-', ''))?.name
        : null;

      await supabase.from("notifications").insert({
        user_id: user.id,
        title: t('receiptScanner.notificationTitle'),
        message: `${receiptData.description} - ${receiptData.amount.toLocaleString('tr-TR')} ${receiptData.currency}${paymentMethodName ? ` (${paymentMethodName})` : ''}`,
        notification_type: 'receipt_scanned',
        priority: 'low',
        related_entity_type: 'transaction',
        related_entity_id: transactionData.id,
        action_url: '/transactions'
      });

      // Show warning for unknown items with action to edit
      if (hasUnknownItems) {
        toast.warning(t('receiptScanner.unknownItemsWarning'), {
          duration: 8000,
          action: {
            label: t('receiptScanner.editItems'),
            onClick: () => navigate(`/transactions?edit=${transactionData.id}`)
          }
        });
      }
      
      handleReset();
      fetchAccountsAndCards(); // Refresh balances
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setReceiptData(null);
    setSelectedPaymentMethod("");
    setShowItems(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <>
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background h-full min-h-[200px] lg:min-h-[280px] flex flex-col">
      <CardHeader className="pb-2 lg:pb-4 px-3 lg:px-6 pt-3 lg:pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ScanLine className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm lg:text-lg">{t('receiptScanner.title')}</CardTitle>
              <p className="text-[10px] lg:text-sm text-muted-foreground hidden sm:block">{t('dashboard.scanReceiptDesc')}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6 flex-1 flex flex-col">
        {/* Upload buttons */}
        {!previewUrl && (
          <div className="grid grid-cols-2 gap-2 lg:gap-4">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleFileSelect}
              className="hidden"
              id="camera-input"
            />
            <label 
              htmlFor="camera-input"
              className="h-14 lg:h-20 flex flex-col items-center justify-center gap-1 lg:gap-2 border-dashed border-2 rounded-md cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Camera className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              <span className="text-xs lg:text-sm">{t('receiptScanner.takePhoto')}</span>
            </label>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label 
              htmlFor="file-input"
              className="h-14 lg:h-20 flex flex-col items-center justify-center gap-1 lg:gap-2 border-dashed border-2 rounded-md cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Upload className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              <span className="text-xs lg:text-sm">{t('receiptScanner.uploadImage')}</span>
            </label>
          </div>
        )}

        {/* Preview & Scanning */}
        {previewUrl && !receiptData && (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="w-full rounded-lg border max-h-40 object-contain bg-muted"
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
        {receiptData && !scanning && (
          <div className="space-y-2 lg:space-y-4">
            <div className="flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg bg-muted/50">
              <img
                src={previewUrl!}
                alt="Receipt"
                className="w-12 h-12 lg:w-16 lg:h-16 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs lg:text-base truncate">{receiptData.description}</span>
                  <span className={`text-[10px] lg:text-xs flex-shrink-0 ${getConfidenceColor(receiptData.confidence)}`}>
                    {receiptData.confidence}%
                  </span>
                </div>
                <p className="text-lg lg:text-2xl font-bold text-primary">
                  {receiptData.amount.toLocaleString('tr-TR')} {receiptData.currency}
                </p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">{receiptData.category}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:gap-3">
              <div className="space-y-0.5 lg:space-y-1">
                <Label className="text-[10px] lg:text-xs">{t('dialogs.amount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={receiptData.amount}
                  onChange={(e) => setReceiptData({ ...receiptData, amount: parseFloat(e.target.value) || 0 })}
                  className="h-8 lg:h-9 text-xs lg:text-sm"
                />
              </div>
              <div className="space-y-0.5 lg:space-y-1">
                <Label className="text-[10px] lg:text-xs">{t('dialogs.category')}</Label>
                <Select
                  value={receiptData.category}
                  onValueChange={(value) => setReceiptData({ ...receiptData, category: value })}
                >
                  <SelectTrigger className="h-8 lg:h-9 text-xs lg:text-sm">
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
            </div>

            {/* Items from receipt */}
            {receiptData.items && receiptData.items.length > 0 && (
              <div className="space-y-1.5 lg:space-y-2">
                {/* Unknown items warning */}
                {receiptData.items.some(item => !item.brand || !item.category) && (
                  <Alert className="py-2 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-300">
                      {t('receiptScanner.unknownItemsWarning')}
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-between h-7 lg:h-9 text-xs lg:text-sm"
                  onClick={() => setShowItems(!showItems)}
                >
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <Package className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span>{t('receiptScanner.items')} ({receiptData.items.length})</span>
                    {receiptData.items.some(item => !item.brand || !item.category) && (
                      <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <span className="text-[10px] lg:text-xs text-muted-foreground">
                    {showItems ? '▲' : '▼'}
                  </span>
                </Button>
                {showItems && (
                  <ScrollArea className="h-28 lg:h-40 rounded-md border p-1.5 lg:p-2">
                    <div className="space-y-1 lg:space-y-2">
                      {receiptData.items.map((item, index) => {
                        const isUnknown = !item.brand || !item.category;
                        return (
                          <div 
                            key={index} 
                            className={`flex items-center justify-between text-[10px] lg:text-sm p-1.5 lg:p-2 rounded ${
                              isUnknown ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700' : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="font-medium truncate">{item.name}</p>
                                {isUnknown && (
                                  <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-[9px] lg:text-xs text-muted-foreground">
                                {item.quantity} x {item.unit_price.toLocaleString('tr-TR')} ₺
                                {item.brand && <span className="ml-1">• {item.brand}</span>}
                                {!item.brand && <span className="ml-1 text-yellow-600 dark:text-yellow-400">• {t('receiptScanner.hasUnknownItems')}</span>}
                              </p>
                            </div>
                            <span className="font-medium ml-2 flex-shrink-0">{item.total_price.toLocaleString('tr-TR')} ₺</span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="space-y-0.5 lg:space-y-1">
              <Label className="text-[10px] lg:text-xs">{t('dialogs.accountOrCard')}</Label>
              <Select
                value={selectedPaymentMethod}
                onValueChange={setSelectedPaymentMethod}
              >
                <SelectTrigger className="h-8 lg:h-9 text-xs lg:text-sm">
                  <SelectValue placeholder={t('dialogs.select')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length === 0 && cards.length === 0 && (
                    <SelectItem value="no-payment" disabled>
                      {t('dialogs.noAccountsOrCards')}
                    </SelectItem>
                  )}
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={`account-${acc.id}`}>
                      <div className="flex items-center gap-2">
                        <Building className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                        <span className="text-xs lg:text-sm">{acc.name} ({acc.balance.toLocaleString('tr-TR')} {acc.currency || '₺'})</span>
                      </div>
                    </SelectItem>
                  ))}
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={`card-${card.id}`}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                        <span className="text-xs lg:text-sm">{card.name} ({(card.card_limit - card.balance).toLocaleString('tr-TR')} {card.currency || '₺'} kalan)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-8 lg:h-10 text-xs lg:text-sm"
                onClick={handleReset}
              >
                {t('receiptScanner.scanAnother')}
              </Button>
              <Button
                className="flex-1 gap-1.5 lg:gap-2 h-8 lg:h-10 text-xs lg:text-sm"
                onClick={handleSaveTransaction}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 lg:h-4 lg:w-4 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 lg:h-4 lg:w-4" />
                )}
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}

        {/* Link to transactions */}
        {!previewUrl && (
          <Button 
            variant="ghost" 
            className="w-full mt-2 lg:mt-4 text-muted-foreground hover:text-foreground h-8 lg:h-10 text-xs lg:text-sm"
            onClick={() => navigate('/transactions')}
          >
            {t('dashboard.goToTransactions')}
            <ArrowRight className="h-3.5 w-3.5 lg:h-4 lg:w-4 ml-1.5 lg:ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
    </>
  );
}
