import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { useBreakdowns } from '@/hooks/useBreakdowns';
import { Loader2 } from 'lucide-react';
import { format, subMonths } from 'date-fns';

const CATEGORY_COLORS: Record<string, string> = {
  mechanical: 'hsl(186, 100%, 50%)', // Neon Cyan
  electrical: 'hsl(330, 100%, 50%)', // Neon Pink
  hydraulic: 'hsl(270, 100%, 60%)',  // Neon Purple
  pneumatic: 'hsl(45, 100%, 60%)',   // Neon Gold
  software: 'hsl(160, 100%, 60%)',   // Neon Mint
  other: 'hsl(220, 20%, 70%)',       // Muted Text
};

export const BreakdownTrendChart = () => {
  const { data: breakdowns = [], isLoading } = useBreakdowns();

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM');

      const count = breakdowns.filter(b => {
        if (b.category === 'maintenance') return false;
        const bDate = new Date(b.created_at);
        return format(bDate, 'yyyy-MM') === monthKey;
      }).length;

      // Calculate a health score (inverse of breakdowns, capped at 100)
      const healthScore = Math.max(0, 100 - (count * 10));

      months.push({ month: monthLabel, breakdowns: count, health: healthScore });
    }
    return months;
  }, [breakdowns]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={monthlyData}>
          <defs>
            <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(186, 100%, 50%)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="hsl(186, 100%, 50%)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}%`, 'Health Score']}
          />
          <Area
            type="monotone"
            dataKey="health"
            stroke="hsl(186, 100%, 50%)"
            strokeWidth={3}
            fill="url(#healthGradient)"
            name="Health Score"
            style={{ filter: "drop-shadow(0px 0px 8px hsla(186, 100%, 50%, 0.8))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CategoryPieChart = () => {
  const { data: breakdowns = [], isLoading } = useBreakdowns();

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    breakdowns.filter(b => b.category !== 'maintenance').forEach(b => {
      const cat = b.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    if (total === 0) {
      return [{ name: 'No data', value: 100, color: 'hsl(215, 20%, 45%)' }];
    }

    return Object.entries(counts).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: count,
      percentage: Math.round((count / total) * 100),
      color: CATEGORY_COLORS[name] || 'hsl(215, 20%, 55%)',
    }));
  }, [breakdowns]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={categoryData} layout="vertical" barSize={16}>
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value} (${props.payload.percentage}%)`,
              'Breakdowns',
            ]}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            name="Count"
          >
            {categoryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
