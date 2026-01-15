import Tesseract from 'tesseract.js';

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

// Category detection patterns
const categoryPatterns: { pattern: RegExp; category: string }[] = [
  // Market & Grocery
  { pattern: /market|migros|bim|a101|şok|carrefour|macro|file|kipa|metro|grocery/i, category: "Market" },
  // Pharmacy
  { pattern: /eczane|pharmacy|ilaç|medicine/i, category: "Eczane" },
  // Restaurant & Food
  { pattern: /restoran|restaurant|cafe|kafe|kahve|starbucks|burger|pizza|döner|kebab|lokanta/i, category: "Restoran" },
  // Fast Food
  { pattern: /mcdonald|burger king|kfc|popeyes|subway|domino|little caesars/i, category: "Fast Food" },
  // Fuel & Transport
  { pattern: /benzin|akaryakıt|petrol|opet|shell|bp|total|fuel|station|istasyon/i, category: "Yakıt" },
  // Clothing
  { pattern: /giyim|clothing|moda|fashion|zara|h&m|lcw|koton|mango|defacto/i, category: "Giyim" },
  // Bills
  { pattern: /elektrik|su fatura|doğalgaz|natural gas|water|electricity|igdaş|tedaş/i, category: "Faturalar" },
  // Internet & Phone
  { pattern: /turkcell|vodafone|türk telekom|internet|telefon|mobile|gsm/i, category: "Telefon" },
  // Entertainment
  { pattern: /sinema|cinema|bilet|ticket|konser|concert|eğlence/i, category: "Eğlence" },
  // Health
  { pattern: /hastane|hospital|klinik|clinic|sağlık|health|doktor|doctor/i, category: "Sağlık" },
  // Education
  { pattern: /eğitim|education|okul|school|kurs|course|kitap|book/i, category: "Eğitim" },
  // Online Shopping
  { pattern: /trendyol|hepsiburada|amazon|n11|gittigidiyor|online/i, category: "Online Alışveriş" },
];

// Currency detection patterns
const currencyPatterns = [
  { pattern: /₺|tl|try|türk liras/i, currency: "TRY" },
  { pattern: /\$|usd|dolar|dollar/i, currency: "USD" },
  { pattern: /€|eur|euro/i, currency: "EUR" },
];

// Amount extraction patterns - look for "Tutar" keyword specifically
const amountPatterns = [
  /dahil\s*tutar\s*[:\s]*([0-9][0-9.,]*)/i,
  /toplam\s*tutar\s*[:\s]*([0-9][0-9.,]*)/i,
  /toplam\s*[:\s]*([0-9][0-9.,]*)/i,
  /genel\s*toplam\s*[:\s]*([0-9][0-9.,]*)/i,
  /ödenecek\s*tutar\s*[:\s]*([0-9][0-9.,]*)/i,
  /total\s*[:\s]*([0-9][0-9.,]*)/i,
  /grand\s*total\s*[:\s]*([0-9][0-9.,]*)/i,
  /amount\s*[:\s]*([0-9][0-9.,]*)/i,
  /tutar\s*[:\s]*([0-9][0-9.,]*)/i,
  /₺\s*([0-9][0-9.,]*)/,
  /([0-9][0-9.,]*)\s*₺/,
  /([0-9][0-9.,]*)\s*tl\b/i,
];

// Date extraction patterns
const datePatterns = [
  /(\d{2})[./-](\d{2})[./-](\d{4})/,  // DD/MM/YYYY or DD.MM.YYYY
  /(\d{4})[./-](\d{2})[./-](\d{2})/,  // YYYY-MM-DD
  /(\d{2})[./-](\d{2})[./-](\d{2})/,  // DD/MM/YY
];

// Known Turkish market/store names for description extraction
const knownStorePatterns = [
  /file\s*market/i,
  /migros/i,
  /bim\b/i,
  /a101/i,
  /şok\s*market/i,
  /carrefour/i,
  /macro\s*center/i,
  /metro\b/i,
  /gratis/i,
  /watsons/i,
  /rossmann/i,
  /koçtaş/i,
  /bauhaus/i,
  /teknosa/i,
  /media\s*markt/i,
  /eczane/i,
  /starbucks/i,
  /kahve\s*dünyası/i,
];

function parseAmount(amountStr: string): number {
  // Handle Turkish number format: 1.599,90 or 1599,90 or 1599.90
  let cleaned = amountStr.trim();
  
  // Check if it has both dot and comma - Turkish format 1.599,90
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } 
  // Only comma - could be 1599,90 (decimal) or 1,599 (thousand)
  else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // If comma is followed by exactly 2 digits at end, it's decimal
    if (/,\d{2}$/.test(cleaned)) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(',', '');
    }
  }
  // Only dots - could be 1.599 (thousand) or 15.99 (decimal)
  else if (cleaned.includes('.') && !cleaned.includes(',')) {
    // If dot is followed by exactly 2 digits at end, it's decimal
    if (/\.\d{2}$/.test(cleaned)) {
      // Keep as is - already decimal format
    } else {
      // Thousand separator
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  return parseFloat(cleaned);
}

function extractAmount(text: string): number {
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseAmount(match[1]);
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        return amount;
      }
    }
  }
  
  // Fallback: Find numbers that look like prices (with decimals)
  const priceMatches = text.match(/\b(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\b/g);
  if (priceMatches) {
    let maxAmount = 0;
    for (const numStr of priceMatches) {
      const num = parseAmount(numStr);
      if (!isNaN(num) && num > maxAmount && num < 100000) {
        maxAmount = num;
      }
    }
    if (maxAmount > 0) return maxAmount;
  }
  
  return 0;
}

function extractCategory(text: string): string {
  for (const { pattern, category } of categoryPatterns) {
    if (pattern.test(text)) {
      return category;
    }
  }
  return "Diğer";
}

function extractCurrency(text: string): string {
  for (const { pattern, currency } of currencyPatterns) {
    if (pattern.test(text)) {
      return currency;
    }
  }
  return "TRY"; // Default to TRY
}

function extractDate(text: string): string | null {
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let year: string, month: string, day: string;
      
      if (match[1].length === 4) {
        // YYYY-MM-DD format
        year = match[1];
        month = match[2];
        day = match[3];
      } else if (match[3].length === 4) {
        // DD/MM/YYYY format
        day = match[1];
        month = match[2];
        year = match[3];
      } else {
        // DD/MM/YY format
        day = match[1];
        month = match[2];
        year = `20${match[3]}`;
      }
      
      // Validate date
      const dateNum = parseInt(day);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (dateNum >= 1 && dateNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2020 && yearNum <= 2030) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function extractDescription(text: string): string {
  const lowerText = text.toLowerCase();
  
  // FIRST: Try to match known store names anywhere in the text
  for (const pattern of knownStorePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Try to get a cleaner version from original text
      const fullMatch = match[0];
      // Capitalize properly
      return fullMatch.charAt(0).toUpperCase() + fullMatch.slice(1).toLowerCase();
    }
  }
  
  // SECOND: Look for company indicators in the text
  const companyIndicators = [
    /([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü\s]+)\s*(?:A\.?Ş\.?|LTD|ŞTİ|ŞİRKETİ|MARKET|MAĞAZA)/i,
    /([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü\s]+)\s*MAĞ[AR]ZACILIK/i,
  ];
  
  for (const pattern of companyIndicators) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length >= 3 && name.length <= 40) {
        return name;
      }
    }
  }
  
  // THIRD: Look for clean lines at the top that look like store names
  const lines = text.split('\n').filter(line => line.trim().length > 2);
  
  for (const line of lines.slice(0, 10)) {
    const cleanLine = line.trim();
    
    // Skip garbage lines (too many special chars, numbers at start, etc.)
    if (/^[^A-Za-zÇĞİÖŞÜçğıöşü]/.test(cleanLine)) continue;
    if (/^[\d\s:=.,\-*]+$/.test(cleanLine)) continue;
    if (cleanLine.length < 4 || cleanLine.length > 50) continue;
    
    // Skip lines that look like addresses or dates
    if (/\d{2}[./-]\d{2}[./-]\d{2,4}/.test(cleanLine)) continue;
    if (/mahalle|cadde|sokak|no:|kat:/i.test(cleanLine)) continue;
    
    // Good candidate
    if (/^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü\s]+/.test(cleanLine)) {
      return cleanLine.substring(0, 40);
    }
  }
  
  return "Fiş Taraması";
}

// Item category detection based on product name
function detectItemCategory(name: string): string | null {
  const lowerName = name.toLowerCase();
  
  // Food & Beverages
  if (/süt|peynir|yoğurt|tereyağ|kaymak|lor/i.test(lowerName)) return "Süt Ürünleri";
  if (/ekmek|simit|poğaça|börek|pasta|kek/i.test(lowerName)) return "Fırın Ürünleri";
  if (/et|tavuk|balık|köfte|sucuk|salam|sosis|pastırma/i.test(lowerName)) return "Et & Şarküteri";
  if (/meyve|elma|portakal|muz|domates|biber|salatalık|patates|soğan/i.test(lowerName)) return "Meyve & Sebze";
  if (/su|kola|gazoz|meyve suyu|ayran|bira|şarap|rakı/i.test(lowerName)) return "İçecekler";
  if (/çikolata|şeker|gofret|bisküvi|cips|kuruyemiş/i.test(lowerName)) return "Atıştırmalık";
  if (/makarna|bulgur|pirinç|un|şeker|tuz|baharat|yağ/i.test(lowerName)) return "Temel Gıda";
  if (/kahve|çay|nescafe/i.test(lowerName)) return "Sıcak İçecekler";
  
  // Household
  if (/deterjan|yumuşatıcı|çamaşır|bulaşık/i.test(lowerName)) return "Temizlik";
  if (/şampuan|sabun|diş|deodorant|krem|losyon/i.test(lowerName)) return "Kişisel Bakım";
  if (/tuvalet|peçete|mendil|poşet/i.test(lowerName)) return "Kağıt Ürünleri";
  
  return null;
}

// Known brand detection
function detectBrand(name: string): string | null {
  const brands = [
    /sütaş|pınar|eker|danone|activia|içim/i,
    /coca[\s-]?cola|pepsi|fanta|sprite|schweppes/i,
    /eti|ülker|tadım|peyman|çerezza|doritos|lays|ruffles/i,
    /ariel|persil|omo|ace|domestos|fairy|pril|cif/i,
    /dove|nivea|rexona|head.*shoulders|pantene|elseve|clear/i,
  ];
  
  for (const pattern of brands) {
    const match = name.match(pattern);
    if (match) {
      return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
    }
  }
  
  return null;
}

// Validate quantity - should be reasonable (1-99 for most products)
function isValidQuantity(qty: number): boolean {
  return qty >= 1 && qty <= 99 && Number.isInteger(qty);
}

// Check if a number in product name is likely part of the name (not quantity)
function isNumberPartOfProductName(name: string, numberStr: string): boolean {
  const num = parseInt(numberStr);
  
  // Large numbers (100+) are almost never quantities for grocery items
  if (num >= 100) return true;
  
  // Numbers that look like weights/volumes (g, ml, lt, kg, oz, cl)
  const weightVolumePattern = new RegExp(`${numberStr}\\s*(g|gr|ml|lt|l|kg|oz|cl|cc)\\b`, 'i');
  if (weightVolumePattern.test(name)) return true;
  
  // Numbers followed by common product size indicators
  const sizePattern = new RegExp(`${numberStr}\\s*('|"|li|lu|lı|lü)`, 'i');
  if (sizePattern.test(name)) return true;
  
  // Numbers that are part of product codes or model numbers (mixed with letters)
  const codePattern = new RegExp(`[A-Za-z]${numberStr}|${numberStr}[A-Za-z]`);
  if (codePattern.test(name)) return true;
  
  return false;
}

// Extract items from OCR text - improved version with better quantity validation
function extractItems(text: string): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  const lines = text.split('\n');
  
  // Skip patterns for non-product lines
  const skipPatterns = [
    /toplam|tutar|kdv|vergi|fatura|tarih|saat|kasa|no:|fiş|teşekkür|nakit|kredi|banka|visa|master/i,
    /^\d{2}[./-]\d{2}[./-]\d{2,4}/,
    /mahalle|cadde|sokak|istanbul|ankara|izmir|tel:|faks:|e-?mail/i,
    /^[*\-=_#]+$/,
    /^\s*$/,
    /vergi\s*dairesi|vkn|tckn/i,
  ];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 5) continue;
    
    // Skip header/footer lines
    let shouldSkip = false;
    for (const pattern of skipPatterns) {
      if (pattern.test(trimmedLine)) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) continue;
    
    // Try multiple price extraction patterns
    const pricePatterns = [
      /[£₺*]?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*$/,  // Price at end
      /\s+(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*[₺TL]*\s*$/i,  // Price with TL
      /\s+(\d+[.,]\d{2})\s*$/,  // Simple decimal price
    ];
    
    let priceMatch = null;
    for (const pattern of pricePatterns) {
      priceMatch = trimmedLine.match(pattern);
      if (priceMatch) break;
    }
    
    if (priceMatch) {
      const priceStr = priceMatch[1];
      let price = 0;
      
      // Parse Turkish number format
      if (priceStr.includes('.') && priceStr.includes(',')) {
        price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
      } else if (priceStr.includes(',')) {
        price = parseFloat(priceStr.replace(',', '.'));
      } else {
        price = parseFloat(priceStr);
      }
      
      if (isNaN(price) || price <= 0 || price > 50000) continue;
      
      // Extract product name
      let productName = trimmedLine.substring(0, trimmedLine.lastIndexOf(priceMatch[0])).trim();
      
      // Clean up product name - but KEEP numbers that are part of product names
      productName = productName
        .replace(/[*#@%£₺€$]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (productName.length < 2 || /^[\d\s.,]+$/.test(productName)) continue;
      
      // Skip if looks like a total line
      if (/^(ara\s*)?toplam|^genel|^ödenecek|^kalan|^para\s*üstü/i.test(productName)) continue;
      
      // Check for quantity - only accept explicit quantity patterns like "3 x 25.00" or "3*25"
      let quantity = 1;
      let unitPrice: number | null = null;
      
      // Pattern 1: "3 x 25.00" or "3X25,00" - explicit multiplication
      const explicitQtyMatch = trimmedLine.match(/\b(\d{1,2})\s*[xX*]\s*(\d+[.,]?\d*)\b/);
      if (explicitQtyMatch) {
        const potentialQty = parseInt(explicitQtyMatch[1]);
        const potentialUnitPrice = parseFloat(explicitQtyMatch[2].replace(',', '.'));
        
        // Validate: quantity should be small, and qty * unit_price should roughly equal total price
        if (isValidQuantity(potentialQty) && potentialUnitPrice > 0) {
          const calculatedTotal = potentialQty * potentialUnitPrice;
          // Allow 10% tolerance for rounding
          if (Math.abs(calculatedTotal - price) / price < 0.1) {
            quantity = potentialQty;
            unitPrice = potentialUnitPrice;
          }
        }
      }
      
      // Pattern 2: "Adet: 3" or "ADT 3" - explicit count
      if (quantity === 1) {
        const adedMatch = trimmedLine.match(/\b(?:adet|adt|ad)\s*[:\s]*(\d{1,2})\b/i);
        if (adedMatch) {
          const potentialQty = parseInt(adedMatch[1]);
          if (isValidQuantity(potentialQty)) {
            quantity = potentialQty;
            unitPrice = price / quantity;
          }
        }
      }
      
      // Remove quantity patterns from product name
      productName = productName
        .replace(/\b\d{1,2}\s*[xX*]\s*\d+[.,]?\d*\s*/g, '')
        .replace(/\b(?:adet|adt|ad)\s*[:\s]*\d{1,2}\b/gi, '')
        .replace(/\*\d+\s*$/, '')
        .trim();
      
      // DO NOT extract standalone numbers as quantity - they're likely part of product name
      // For example: "Magnolya Çilekli 510" - 510 is NOT quantity, it's part of the name
      
      // Final cleanup - remove leading numbers ONLY if they're at the very start and followed by space
      // But be careful: "A101" should stay as is
      productName = productName.replace(/^(\d+)\s+(?=[A-Za-zÇĞİÖŞÜçğıöşü])/, '').trim();
      
      if (productName.length < 2) continue;
      
      items.push({
        name: productName.substring(0, 100),
        quantity,
        unit_price: unitPrice,
        total_price: price,
        category: detectItemCategory(productName),
        brand: detectBrand(productName)
      });
    }
  }
  
  // Deduplicate items with same name
  const uniqueItems = new Map<string, ReceiptItem>();
  for (const item of items) {
    const key = item.name.toLowerCase();
    if (uniqueItems.has(key)) {
      const existing = uniqueItems.get(key)!;
      existing.quantity += item.quantity;
      existing.total_price += item.total_price;
    } else {
      uniqueItems.set(key, { ...item });
    }
  }
  
  return Array.from(uniqueItems.values());
}

export async function scanReceiptWithTesseract(
  imageBase64: string,
  onProgress?: (progress: number, status: string) => void
): Promise<ReceiptData> {
  try {
    // Initialize Tesseract with Turkish language
    const result = await Tesseract.recognize(
      imageBase64,
      'tur+eng', // Turkish + English for better recognition
      {
        logger: (m) => {
          if (onProgress) {
            const progress = Math.round(m.progress * 100);
            let status = '';
            switch (m.status) {
              case 'loading tesseract core':
                status = 'Motor yükleniyor...';
                break;
              case 'initializing tesseract':
                status = 'Başlatılıyor...';
                break;
              case 'loading language traineddata':
                status = 'Dil verileri yükleniyor...';
                break;
              case 'initializing api':
                status = 'API hazırlanıyor...';
                break;
              case 'recognizing text':
                status = 'Metin tanınıyor...';
                break;
              default:
                status = m.status || 'İşleniyor...';
            }
            onProgress(progress, status);
          }
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    const text = result.data.text;
    console.log('OCR Text:', text);
    
    const amount = extractAmount(text);
    const category = extractCategory(text);
    const currency = extractCurrency(text);
    const date = extractDate(text);
    const description = extractDescription(text);
    const items = extractItems(text);
    
    console.log('Extracted items:', items);
    
    // Calculate confidence based on what we could extract
    let confidence = 50;
    if (amount > 0) confidence += 20;
    if (category !== "Diğer") confidence += 15;
    if (date) confidence += 10;
    if (description !== "Fiş Taraması") confidence += 5;
    if (items.length > 0) confidence += 5;
    
    // Also factor in Tesseract confidence
    const avgConfidence = result.data.confidence;
    confidence = Math.min(95, Math.round((confidence + avgConfidence) / 2));
    
    return {
      amount,
      category,
      description,
      currency,
      date,
      confidence,
      items: items.length > 0 ? items : undefined
    };
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    throw new Error('OCR işlemi başarısız oldu');
  }
}
