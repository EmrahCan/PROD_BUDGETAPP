import {
  Banknote,
  Briefcase,
  TrendingUp,
  Home,
  Building,
  Receipt,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Phone,
  ShoppingCart,
  ShoppingBag,
  Shirt,
  Sparkles,
  Sofa,
  Bus,
  Fuel,
  Wrench,
  ParkingCircle,
  Car,
  UtensilsCrossed,
  Coffee,
  Pizza,
  Bike,
  Heart,
  Pill,
  Dumbbell,
  PartyPopper,
  Film,
  Music,
  Gamepad2,
  Palette,
  GraduationCap,
  BookOpen,
  School,
  CreditCard,
  Shield,
  FileText,
  Landmark,
  Bell,
  Tv,
  Headphones,
  Youtube,
  Apple,
  Gift,
  Plane,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react";

export interface CategoryConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  group: string;
}

export const categoryConfig: Record<string, CategoryConfig> = {
  // Gelir
  "Maaş": { icon: Banknote, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", group: "Gelir" },
  "Ek Gelir": { icon: Briefcase, color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", group: "Gelir" },
  "Yatırım Geliri": { icon: TrendingUp, color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", group: "Gelir" },
  "Kira Geliri": { icon: Home, color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", group: "Gelir" },
  "Hediye": { icon: Gift, color: "text-pink-500", bgColor: "bg-pink-100 dark:bg-pink-900/30", group: "Gelir" },

  // Ev & Yaşam
  "Kira": { icon: Home, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", group: "Ev & Yaşam" },
  "Aidat": { icon: Building, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30", group: "Ev & Yaşam" },
  "Faturalar": { icon: Receipt, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30", group: "Ev & Yaşam" },
  "Elektrik": { icon: Zap, color: "text-yellow-500", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", group: "Ev & Yaşam" },
  "Su": { icon: Droplets, color: "text-cyan-500", bgColor: "bg-cyan-100 dark:bg-cyan-900/30", group: "Ev & Yaşam" },
  "Doğalgaz": { icon: Flame, color: "text-orange-500", bgColor: "bg-orange-100 dark:bg-orange-900/30", group: "Ev & Yaşam" },
  "İnternet": { icon: Wifi, color: "text-indigo-500", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", group: "Ev & Yaşam" },
  "Telefon": { icon: Phone, color: "text-slate-500", bgColor: "bg-slate-100 dark:bg-slate-900/30", group: "Ev & Yaşam" },

  // Market & Alışveriş
  "Market": { icon: ShoppingCart, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", group: "Market & Alışveriş" },
  "Online Alışveriş": { icon: ShoppingBag, color: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-900/30", group: "Market & Alışveriş" },
  "Giyim": { icon: Shirt, color: "text-pink-500", bgColor: "bg-pink-100 dark:bg-pink-900/30", group: "Market & Alışveriş" },
  "Kozmetik": { icon: Sparkles, color: "text-fuchsia-500", bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/30", group: "Market & Alışveriş" },
  "Ev Eşyası": { icon: Sofa, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30", group: "Market & Alışveriş" },

  // Ulaşım
  "Ulaşım": { icon: Bus, color: "text-sky-600", bgColor: "bg-sky-100 dark:bg-sky-900/30", group: "Ulaşım" },
  "Yakıt": { icon: Fuel, color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/30", group: "Ulaşım" },
  "Araç Bakım": { icon: Wrench, color: "text-slate-600", bgColor: "bg-slate-100 dark:bg-slate-900/30", group: "Ulaşım" },
  "Otopark": { icon: ParkingCircle, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30", group: "Ulaşım" },
  "Taksi": { icon: Car, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", group: "Ulaşım" },

  // Yeme & İçme
  "Restoran": { icon: UtensilsCrossed, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30", group: "Yeme & İçme" },
  "Kafe": { icon: Coffee, color: "text-amber-700", bgColor: "bg-amber-100 dark:bg-amber-900/30", group: "Yeme & İçme" },
  "Fast Food": { icon: Pizza, color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/30", group: "Yeme & İçme" },
  "Yemek Siparişi": { icon: Bike, color: "text-orange-500", bgColor: "bg-orange-100 dark:bg-orange-900/30", group: "Yeme & İçme" },

  // Sağlık & Spor
  "Sağlık": { icon: Heart, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", group: "Sağlık & Spor" },
  "Eczane": { icon: Pill, color: "text-teal-500", bgColor: "bg-teal-100 dark:bg-teal-900/30", group: "Sağlık & Spor" },
  "Spor Salonu": { icon: Dumbbell, color: "text-violet-500", bgColor: "bg-violet-100 dark:bg-violet-900/30", group: "Sağlık & Spor" },

  // Eğlence & Hobi
  "Eğlence": { icon: PartyPopper, color: "text-pink-500", bgColor: "bg-pink-100 dark:bg-pink-900/30", group: "Eğlence & Hobi" },
  "Sinema": { icon: Film, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30", group: "Eğlence & Hobi" },
  "Konser": { icon: Music, color: "text-rose-500", bgColor: "bg-rose-100 dark:bg-rose-900/30", group: "Eğlence & Hobi" },
  "Oyun": { icon: Gamepad2, color: "text-indigo-500", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", group: "Eğlence & Hobi" },
  "Hobi": { icon: Palette, color: "text-cyan-500", bgColor: "bg-cyan-100 dark:bg-cyan-900/30", group: "Eğlence & Hobi" },

  // Eğitim
  "Eğitim": { icon: GraduationCap, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", group: "Eğitim" },
  "Kitap": { icon: BookOpen, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30", group: "Eğitim" },
  "Kurs": { icon: School, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", group: "Eğitim" },

  // Finans
  "Kredi Ödemesi": { icon: CreditCard, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", group: "Finans" },
  "Sigorta": { icon: Shield, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", group: "Finans" },
  "Vergi": { icon: FileText, color: "text-slate-600", bgColor: "bg-slate-100 dark:bg-slate-900/30", group: "Finans" },
  "Banka Masrafı": { icon: Landmark, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30", group: "Finans" },
  "Kredi Kartı Ödemesi": { icon: CreditCard, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", group: "Finans" },

  // Abonelikler
  "Abonelik": { icon: Bell, color: "text-violet-500", bgColor: "bg-violet-100 dark:bg-violet-900/30", group: "Abonelikler" },
  "Netflix": { icon: Tv, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", group: "Abonelikler" },
  "Spotify": { icon: Headphones, color: "text-green-500", bgColor: "bg-green-100 dark:bg-green-900/30", group: "Abonelikler" },
  "YouTube": { icon: Youtube, color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/30", group: "Abonelikler" },
  "Apple": { icon: Apple, color: "text-slate-600", bgColor: "bg-slate-100 dark:bg-slate-900/30", group: "Abonelikler" },

  // Diğer
  "Bağış": { icon: Heart, color: "text-rose-500", bgColor: "bg-rose-100 dark:bg-rose-900/30", group: "Diğer" },
  "Tatil": { icon: Plane, color: "text-sky-500", bgColor: "bg-sky-100 dark:bg-sky-900/30", group: "Diğer" },
  "Diğer": { icon: MoreHorizontal, color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-900/30", group: "Diğer" },
};

// Grafik için hex renkleri
export const categoryChartColors: Record<string, string> = {
  // Gelir
  "Maaş": "#10b981",
  "Ek Gelir": "#34d399",
  "Yatırım Geliri": "#059669",
  "Kira Geliri": "#047857",
  "Hediye": "#ec4899",

  // Ev & Yaşam
  "Kira": "#2563eb",
  "Aidat": "#3b82f6",
  "Faturalar": "#60a5fa",
  "Elektrik": "#eab308",
  "Su": "#06b6d4",
  "Doğalgaz": "#f97316",
  "İnternet": "#6366f1",
  "Telefon": "#64748b",

  // Market & Alışveriş
  "Market": "#16a34a",
  "Online Alışveriş": "#a855f7",
  "Giyim": "#ec4899",
  "Kozmetik": "#d946ef",
  "Ev Eşyası": "#d97706",

  // Ulaşım
  "Ulaşım": "#0284c7",
  "Yakıt": "#ef4444",
  "Araç Bakım": "#475569",
  "Otopark": "#3b82f6",
  "Taksi": "#ca8a04",

  // Yeme & İçme
  "Restoran": "#ea580c",
  "Kafe": "#b45309",
  "Fast Food": "#dc2626",
  "Yemek Siparişi": "#f97316",

  // Sağlık & Spor
  "Sağlık": "#dc2626",
  "Eczane": "#14b8a6",
  "Spor Salonu": "#8b5cf6",

  // Eğlence & Hobi
  "Eğlence": "#ec4899",
  "Sinema": "#9333ea",
  "Konser": "#f43f5e",
  "Oyun": "#6366f1",
  "Hobi": "#06b6d4",

  // Eğitim
  "Eğitim": "#2563eb",
  "Kitap": "#d97706",
  "Kurs": "#4f46e5",

  // Finans
  "Kredi Ödemesi": "#dc2626",
  "Sigorta": "#16a34a",
  "Vergi": "#475569",
  "Banka Masrafı": "#6b7280",
  "Kredi Kartı Ödemesi": "#10b981",

  // Abonelikler
  "Abonelik": "#8b5cf6",
  "Netflix": "#e50914",
  "Spotify": "#1db954",
  "YouTube": "#ff0000",
  "Apple": "#555555",

  // Diğer
  "Bağış": "#f43f5e",
  "Tatil": "#0ea5e9",
  "Diğer": "#6b7280",
};

export const getDefaultCategoryConfig = (): CategoryConfig => ({
  icon: MoreHorizontal,
  color: "text-gray-500",
  bgColor: "bg-gray-100 dark:bg-gray-900/30",
  group: "Diğer",
});

export const getCategoryConfig = (category: string): CategoryConfig => {
  return categoryConfig[category] || getDefaultCategoryConfig();
};

export const getCategoryChartColor = (category: string): string => {
  return categoryChartColors[category] || "#6b7280";
};

// Gruplandırılmış kategoriler
export const groupedCategories = Object.entries(categoryConfig).reduce((acc, [name, config]) => {
  if (!acc[config.group]) {
    acc[config.group] = [];
  }
  acc[config.group].push(name);
  return acc;
}, {} as Record<string, string[]>);
