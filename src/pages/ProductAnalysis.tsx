import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, 
  TrendingUp, 
  Search, 
  Calendar,
  Tag,
  Package,
  BarChart3,
  PieChart as PieChartIcon,
  Building2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, endOfDay } from "date-fns";
import { tr, enUS, de } from "date-fns/locale";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  category: string | null;
  brand: string | null;
  created_at: string;
  transaction_date: string | null;
  transaction_id: string | null;
}

interface CategoryStats {
  category: string;
  total: number;
  count: number;
}

interface ProductStats {
  name: string;
  total: number;
  count: number;
  avgPrice: number;
}

interface BrandStats {
  brand: string;
  total: number;
  count: number;
}

const COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#3b82f6', '#eab308', '#14b8a6', '#6366f1', '#ef4444', '#06b6d4'];

const getItemCategories = (t: (key: string) => string) => [
  t('productAnalysis.itemCategories.food'),
  t('productAnalysis.itemCategories.beverage'),
  t('productAnalysis.itemCategories.cleaning'),
  t('productAnalysis.itemCategories.personalCare'),
  t('productAnalysis.itemCategories.electronics'),
  t('productAnalysis.itemCategories.clothing'),
  t('productAnalysis.itemCategories.household'),
  t('productAnalysis.itemCategories.other')
];

export default function ProductAnalysis() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { formatCurrency } = useCurrencyFormat();
  const { formatDate } = useDateFormat();
  
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("month");
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [brandStats, setBrandStats] = useState<BrandStats[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      const demoItems = demoData.receipt_items.map((item: any) => ({
        ...item,
        quantity: item.quantity || 1,
      }));
      setItems(demoItems);
      calculateStats(demoItems);
      setLoading(false);
    } else if (user) {
      fetchItems();
    }
  }, [user, dateRange, isDemoMode]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "week":
        // Use weekStartsOn: 1 for Monday start (Turkish locale)
        return { 
          start: startOfWeek(now, { weekStartsOn: 1 }), 
          end: endOfDay(endOfWeek(now, { weekStartsOn: 1 })) 
        };
      case "month":
        return { start: startOfMonth(now), end: endOfDay(endOfMonth(now)) };
      case "3months":
        return { start: startOfMonth(subMonths(now, 2)), end: endOfDay(endOfMonth(now)) };
      case "year":
        return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
      case "all":
        return { start: null, end: null };
      default:
        return { start: startOfMonth(now), end: endOfDay(endOfMonth(now)) };
    }
  };

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);

    const { start, end } = getDateRange();

    let query = supabase
      .from("receipt_items")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false, nullsFirst: false });

    // Only apply date filters if not "all" - use transaction_date for proper filtering
    if (start && end) {
      query = query
        .gte("transaction_date", format(start, 'yyyy-MM-dd'))
        .lte("transaction_date", format(end, 'yyyy-MM-dd'));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching items:", error);
      setLoading(false);
      return;
    }

    console.log("Fetched receipt items:", data?.length, "items");
    setItems(data || []);
    calculateStats(data || []);
    setLoading(false);
  };

  const calculateStats = (itemsData: ReceiptItem[]) => {
    // Category stats - count based on quantity, not item count
    const catMap = new Map<string, { total: number; count: number }>();
    itemsData.forEach(item => {
      const cat = item.category || t('productAnalysis.itemCategories.other');
      const existing = catMap.get(cat) || { total: 0, count: 0 };
      catMap.set(cat, {
        total: existing.total + Number(item.total_price),
        count: existing.count + Number(item.quantity || 1)
      });
    });

    const catStats: CategoryStats[] = Array.from(catMap.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.total - a.total);
    setCategoryStats(catStats);

    // Top products
    const prodMap = new Map<string, { total: number; count: number }>();
    itemsData.forEach(item => {
      const name = item.name.toLowerCase().trim();
      const existing = prodMap.get(name) || { total: 0, count: 0 };
      prodMap.set(name, {
        total: existing.total + Number(item.total_price),
        count: existing.count + Number(item.quantity || 1)
      });
    });

    const prodStats: ProductStats[] = Array.from(prodMap.entries())
      .map(([name, stats]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        total: stats.total,
        count: stats.count,
        avgPrice: stats.total / stats.count
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    setTopProducts(prodStats);

    // Brand stats - exclude unknown/null brands from chart
    const brandMap = new Map<string, { total: number; count: number }>();
    itemsData.forEach(item => {
      // Only include items with known brands
      if (item.brand && item.brand.trim() !== '') {
        const brand = item.brand.trim();
        const existing = brandMap.get(brand) || { total: 0, count: 0 };
        brandMap.set(brand, {
          total: existing.total + Number(item.total_price),
          count: existing.count + Number(item.quantity || 1)
        });
      }
    });

    const bStats: BrandStats[] = Array.from(brandMap.entries())
      .map(([brand, stats]) => ({ brand, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    setBrandStats(bStats);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalSpent = filteredItems.reduce((sum, item) => sum + Number(item.total_price), 0);
  const totalItems = Math.round(filteredItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0));

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              {t('productAnalysis.title')}
            </h1>
            <p className="text-muted-foreground">{t('productAnalysis.description')}</p>
            <p className="text-sm text-primary font-medium mt-1">
              {(() => {
                const { start, end } = getDateRange();
                if (!start || !end) return t('productAnalysis.allTime');
                const locale = i18n.language === 'tr' ? tr : i18n.language === 'de' ? de : enUS;
                return `${format(start, 'd MMMM yyyy', { locale })} - ${format(end, 'd MMMM yyyy', { locale })}`;
              })()}
            </p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('productAnalysis.allTime')}</SelectItem>
              <SelectItem value="week">{t('productAnalysis.thisWeek')}</SelectItem>
              <SelectItem value="month">{t('productAnalysis.thisMonth')}</SelectItem>
              <SelectItem value="3months">{t('productAnalysis.last3Months')}</SelectItem>
              <SelectItem value="year">{t('productAnalysis.thisYear')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm">{t('productAnalysis.totalProducts')}</span>
              </div>
              <p className="text-2xl font-bold">{totalItems}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">{t('productAnalysis.totalSpent')}</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent, "TRY")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Tag className="h-4 w-4" />
                <span className="text-sm">{t('productAnalysis.categories')}</span>
              </div>
              <p className="text-2xl font-bold">{categoryStats.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">{t('productAnalysis.avgPerItem')}</span>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(totalItems > 0 ? totalSpent / totalItems : 0, "TRY")}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <PieChartIcon className="h-4 w-4" />
              {t('productAnalysis.overview')}
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              {t('productAnalysis.products')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Category Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('productAnalysis.byCategory')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={categoryStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="total"
                          nameKey="category"
                          label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value, "TRY")}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      {t('productAnalysis.noData')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Products Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('productAnalysis.topProducts')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                        <XAxis type="number" tickFormatter={(v) => `₺${v}`} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={100}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value, "TRY")}
                        />
                        <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      {t('productAnalysis.noData')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Brand Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {t('productAnalysis.byBrand')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {brandStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={brandStats.slice(0, 8)} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `₺${v}`} />
                      <YAxis 
                        type="category" 
                        dataKey="brand" 
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value, "TRY")}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {brandStats.slice(0, 8).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t('productAnalysis.noData')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category and Brand Lists */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Category List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('productAnalysis.categoryBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {categoryStats.map((cat, index) => (
                      <div key={cat.category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                          />
                          <div>
                            <p className="font-medium">{cat.category}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(cat.count)} {t('productAnalysis.items')}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold">{formatCurrency(cat.total, "TRY")}</p>
                      </div>
                    ))}
                    {categoryStats.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        {t('productAnalysis.noData')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Brand List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('productAnalysis.brandBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {brandStats.map((brand, index) => (
                      <div key={brand.brand} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                          />
                          <div>
                            <p className="font-medium">{brand.brand}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(brand.count)} {t('productAnalysis.items')}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold">{formatCurrency(brand.total, "TRY")}</p>
                      </div>
                    ))}
                    {brandStats.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        {t('productAnalysis.noData')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('productAnalysis.searchProducts')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('productAnalysis.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('productAnalysis.allCategories')}</SelectItem>
                  {getItemCategories(t).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products List */}
            <Card>
              <CardContent className="p-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="space-y-2">
                    {filteredItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{item.name}</p>
                            {item.brand && (
                              <Badge variant="outline" className="text-xs">
                                {item.brand}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            {item.category && (
                              <Badge variant="secondary" className="text-xs">
                                {item.category}
                              </Badge>
                            )}
                            {item.quantity > 1 && (
                              <span>{item.quantity} {t('productAnalysis.pieces')}</span>
                            )}
                            <span>•</span>
                            <span>{format(new Date(item.transaction_date || item.created_at), "d MMM yyyy", { locale: i18n.language === 'tr' ? tr : i18n.language === 'de' ? de : enUS })}</span>
                          </div>
                        </div>
                        <p className="font-bold whitespace-nowrap ml-4">
                          {formatCurrency(Number(item.total_price), "TRY")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('productAnalysis.noProducts')}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
