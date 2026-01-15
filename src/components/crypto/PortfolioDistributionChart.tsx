import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

interface CryptoHolding {
  symbol: string;
  name: string;
  quantity: number;
}

interface CryptoPrice {
  symbol: string;
  price: number;
}

interface PortfolioDistributionChartProps {
  holdings: CryptoHolding[];
  prices: Record<string, CryptoPrice>;
}

const COLORS = [
  "hsl(25, 95%, 53%)",   // Orange - BTC
  "hsl(221, 83%, 53%)",  // Blue - ETH
  "hsl(142, 71%, 45%)",  // Green
  "hsl(262, 83%, 58%)",  // Purple
  "hsl(349, 89%, 60%)",  // Red
  "hsl(47, 96%, 53%)",   // Yellow
  "hsl(187, 85%, 43%)",  // Cyan
  "hsl(315, 70%, 50%)",  // Pink
  "hsl(200, 90%, 45%)",  // Sky
  "hsl(100, 60%, 45%)",  // Lime
];

export function PortfolioDistributionChart({ holdings, prices }: PortfolioDistributionChartProps) {
  const { t } = useTranslation();
  
  if (holdings.length === 0) {
    return null;
  }

  // Calculate values and percentages
  const data = holdings.map(holding => {
    const price = prices[holding.symbol]?.price || 0;
    const value = holding.quantity * price;
    return {
      name: holding.symbol,
      fullName: holding.name,
      value,
      quantity: holding.quantity,
    };
  }).filter(item => item.value > 0);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  // Add percentage to data
  const chartData = data.map(item => ({
    ...item,
    percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
  })).sort((a, b) => b.value - a.value);

  const formatValue = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.fullName} ({data.name})</p>
          <p className="text-sm text-muted-foreground">Miktar: {data.quantity.toLocaleString()}</p>
          <p className="text-sm font-medium">{formatValue(data.value)}</p>
          <p className="text-sm text-primary">%{data.percentage.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.05) return null; // Don't show label for small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {name}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          {t('crypto.portfolioDistribution')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                animationDuration={500}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="font-medium truncate">{item.name}</span>
              <span className="text-muted-foreground">%{item.percentage.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}