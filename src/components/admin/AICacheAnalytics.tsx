import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  Zap, 
  Clock, 
  TrendingUp,
  PieChart,
  BarChart3,
  Settings,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface CacheEntry {
  id: string;
  cache_key: string;
  cache_type: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  hit_count: number;
  base_ttl_hours?: number;
  adjusted_ttl_hours?: number;
  last_hit_at?: string;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  avgHitsPerEntry: number;
  byType: Record<string, { count: number; hits: number }>;
  expiredCount: number;
  activeCount: number;
  avgHitRate: number;
}

interface AdaptiveCacheConfig {
  enabled: boolean;
  min_ttl_hours: number;
  max_ttl_hours: number;
  hit_rate_threshold_low: number;
  hit_rate_threshold_high: number;
  ttl_decrease_factor: number;
  ttl_increase_factor: number;
  min_entries_for_analysis: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const DEFAULT_CONFIG: AdaptiveCacheConfig = {
  enabled: true,
  min_ttl_hours: 6,
  max_ttl_hours: 48,
  hit_rate_threshold_low: 0.2,
  hit_rate_threshold_high: 0.5,
  ttl_decrease_factor: 0.8,
  ttl_increase_factor: 1.3,
  min_entries_for_analysis: 5
};

export function AICacheAnalytics() {
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [config, setConfig] = useState<AdaptiveCacheConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const fetchCacheConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('cache_settings')
        .select('setting_value')
        .eq('setting_key', 'adaptive_cache_config')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.setting_value) {
        setConfig(data.setting_value as unknown as AdaptiveCacheConfig);
      }
    } catch (error) {
      console.error('Error fetching cache config:', error);
    }
  };

  const saveConfig = async () => {
    setConfigLoading(true);
    try {
      // Cast to any to bypass strict type checking for JSONB column
      const { error } = await supabase
        .from('cache_settings')
        .update({
          setting_value: JSON.parse(JSON.stringify(config)),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'adaptive_cache_config');

      if (error) throw error;
      toast.success('Ayarlar kaydedildi');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Ayarlar kaydedilemedi');
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchCacheData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_cache')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const entries = (data || []) as CacheEntry[];
      setCacheEntries(entries);

      // Calculate stats
      const now = new Date();
      const byType: Record<string, { count: number; hits: number }> = {};
      let totalHits = 0;
      let expiredCount = 0;
      let activeCount = 0;

      entries.forEach(entry => {
        totalHits += entry.hit_count || 0;
        
        if (new Date(entry.expires_at) < now) {
          expiredCount++;
        } else {
          activeCount++;
        }

        if (!byType[entry.cache_type]) {
          byType[entry.cache_type] = { count: 0, hits: 0 };
        }
        byType[entry.cache_type].count++;
        byType[entry.cache_type].hits += entry.hit_count || 0;
      });

      const avgHitRate = entries.length > 0 ? totalHits / entries.length : 0;

      setStats({
        totalEntries: entries.length,
        totalHits,
        avgHitsPerEntry: entries.length > 0 ? totalHits / entries.length : 0,
        byType,
        expiredCount,
        activeCount,
        avgHitRate
      });

    } catch (error) {
      console.error('Error fetching cache data:', error);
      toast.error('Cache verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const cleanExpiredCache = async () => {
    setCleaning(true);
    try {
      const { error } = await supabase
        .from('ai_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;

      toast.success('Süresi dolmuş cache temizlendi');
      fetchCacheData();
    } catch (error) {
      console.error('Error cleaning cache:', error);
      toast.error('Cache temizlenemedi');
    } finally {
      setCleaning(false);
    }
  };

  const clearAllCache = async () => {
    if (!confirm('Tüm AI cache verilerini silmek istediğinizden emin misiniz?')) return;
    
    setCleaning(true);
    try {
      const { error } = await supabase
        .from('ai_cache')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast.success('Tüm cache temizlendi');
      fetchCacheData();
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Cache temizlenemedi');
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    fetchCacheData();
    fetchCacheConfig();
  }, []);

  const typeChartData = stats ? Object.entries(stats.byType).map(([type, data]) => ({
    name: type.replace('financial-', '').replace('-', ' '),
    count: data.count,
    hits: data.hits
  })) : [];

  const statusChartData = stats ? [
    { name: 'Aktif', value: stats.activeCount, color: '#10b981' },
    { name: 'Süresi Dolmuş', value: stats.expiredCount, color: '#ef4444' }
  ] : [];

  const estimatedSavings = stats ? stats.totalHits * 0.5 : 0;

  // Determine adaptive status based on hit rate
  const getAdaptiveStatus = () => {
    if (!stats) return { label: '-', color: 'secondary' as const };
    if (stats.avgHitRate < config.hit_rate_threshold_low) {
      return { label: 'Düşük Hit', color: 'destructive' as const };
    } else if (stats.avgHitRate > config.hit_rate_threshold_high) {
      return { label: 'Yüksek Hit', color: 'default' as const };
    }
    return { label: 'Normal', color: 'secondary' as const };
  };

  const adaptiveStatus = getAdaptiveStatus();

  return (
    <div className="space-y-6">
      {/* Adaptive Cache Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Akıllı Cache Sistemi</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="adaptive-enabled" className="text-sm">
                  {config.enabled ? 'Aktif' : 'Pasif'}
                </Label>
                <Switch
                  id="adaptive-enabled"
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showSettings ? 'Gizle' : 'Ayarlar'}
              </Button>
            </div>
          </div>
          <CardDescription>
            Cache hit oranına göre otomatik TTL ayarlaması yapar. Düşük hit = kısa TTL, yüksek hit = uzun TTL.
          </CardDescription>
        </CardHeader>
        
        {showSettings && (
          <CardContent className="space-y-6 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Minimum TTL: {config.min_ttl_hours} saat
                  </Label>
                  <Slider
                    value={[config.min_ttl_hours]}
                    onValueChange={([value]) => setConfig({ ...config, min_ttl_hours: value })}
                    min={1}
                    max={24}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Maksimum TTL: {config.max_ttl_hours} saat
                  </Label>
                  <Slider
                    value={[config.max_ttl_hours]}
                    onValueChange={([value]) => setConfig({ ...config, max_ttl_hours: value })}
                    min={24}
                    max={168}
                    step={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Analiz için min. kayıt: {config.min_entries_for_analysis}
                  </Label>
                  <Slider
                    value={[config.min_entries_for_analysis]}
                    onValueChange={([value]) => setConfig({ ...config, min_entries_for_analysis: value })}
                    min={2}
                    max={20}
                    step={1}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Düşük hit eşiği: {(config.hit_rate_threshold_low * 100).toFixed(0)}%
                  </Label>
                  <Slider
                    value={[config.hit_rate_threshold_low * 100]}
                    onValueChange={([value]) => setConfig({ ...config, hit_rate_threshold_low: value / 100 })}
                    min={5}
                    max={50}
                    step={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Yüksek hit eşiği: {(config.hit_rate_threshold_high * 100).toFixed(0)}%
                  </Label>
                  <Slider
                    value={[config.hit_rate_threshold_high * 100]}
                    onValueChange={([value]) => setConfig({ ...config, hit_rate_threshold_high: value / 100 })}
                    min={30}
                    max={100}
                    step={5}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Azaltma: {(config.ttl_decrease_factor * 100).toFixed(0)}%
                    </Label>
                    <Slider
                      value={[config.ttl_decrease_factor * 100]}
                      onValueChange={([value]) => setConfig({ ...config, ttl_decrease_factor: value / 100 })}
                      min={50}
                      max={90}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Artırma: {(config.ttl_increase_factor * 100).toFixed(0)}%
                    </Label>
                    <Slider
                      value={[config.ttl_increase_factor * 100]}
                      onValueChange={([value]) => setConfig({ ...config, ttl_increase_factor: value / 100 })}
                      min={110}
                      max={200}
                      step={10}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfig(DEFAULT_CONFIG)}
              >
                Varsayılana Dön
              </Button>
              <Button
                onClick={saveConfig}
                disabled={configLoading}
              >
                {configLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Kaydet
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Toplam Cache
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEntries || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeCount || 0} aktif, {stats?.expiredCount || 0} süresi dolmuş
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Toplam Hit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalHits || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ort. {stats?.avgHitsPerEntry?.toFixed(1) || 0} hit/cache
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Tahmini Tasarruf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">~{estimatedSavings.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              API çağrısı önlendi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              Adaptive Durum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={adaptiveStatus.color}>{adaptiveStatus.label}</Badge>
              <span className="text-sm text-muted-foreground">
                {config.enabled ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ort. Hit: {stats?.avgHitRate?.toFixed(2) || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Cache Türüne Göre Dağılım
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeChartData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Bar dataKey="count" fill="#8b5cf6" name="Cache Sayısı" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hits" fill="#06b6d4" name="Hit Sayısı" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Cache Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.some(d => d.value > 0) ? (
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={150} height={150}>
                  <RechartsPieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {statusChartData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                Veri yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Cache Kayıtları</CardTitle>
              <CardDescription>Son AI yanıt önbellekleri</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchCacheData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={cleanExpiredCache}
                disabled={cleaning || (stats?.expiredCount || 0) === 0}
              >
                <Clock className="h-4 w-4 mr-2" />
                Süresiz Olanları Temizle
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={clearAllCache}
                disabled={cleaning || (stats?.totalEntries || 0) === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Tümünü Temizle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cacheEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz cache kaydı yok</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tür</TableHead>
                    <TableHead>Cache Key</TableHead>
                    <TableHead>Hit Sayısı</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead>Bitiş</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cacheEntries.slice(0, 50).map((entry) => {
                    const isExpired = new Date(entry.expires_at) < new Date();
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant="secondary">
                            {entry.cache_type.replace('financial-', '')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {entry.cache_key}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.hit_count > 0 ? 'default' : 'outline'}>
                            {entry.hit_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.created_at), { 
                            addSuffix: true, 
                            locale: tr 
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.expires_at), { 
                            addSuffix: true, 
                            locale: tr 
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isExpired ? 'destructive' : 'default'}>
                            {isExpired ? 'Süresi Doldu' : 'Aktif'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {cacheEntries.length > 50 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  ... ve {cacheEntries.length - 50} kayıt daha
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
