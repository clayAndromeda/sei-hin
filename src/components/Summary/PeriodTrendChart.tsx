import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CATEGORIES } from '../../constants/categories';
import { formatCurrency, formatAxisAmount } from '../../utils/format';
import type { PeriodCategoryTotal } from '../../utils/chart';

interface PeriodTrendChartProps {
  data: PeriodCategoryTotal[];
  height?: number;
}

// 期間（月・週）ごとのカテゴリ別積み上げ棒グラフ
export function PeriodTrendChart({ data, height = 240 }: PeriodTrendChartProps) {
  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          この期間のデータはありません
        </Typography>
      </Box>
    );
  }

  const chartData = data.map((d) => ({
    label: d.label,
    total: d.total,
    ...d.totals,
  }));

  // 実際にデータがあるカテゴリのみ表示
  const activeCategories = CATEGORIES.filter((cat) =>
    data.some((d) => (d.totals[cat.id] ?? 0) > 0),
  );

  return (
    <Box sx={{ width: '100%', my: 1 }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={formatAxisAmount}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const cat = CATEGORIES.find((c) => c.id === name);
              return [formatCurrency(value ?? 0), cat?.label ?? name ?? ''];
            }}
            labelFormatter={(label, payload) => {
              const total = payload?.[0]?.payload?.total as number | undefined;
              return `${label}（合計 ${formatCurrency(total ?? 0)}）`;
            }}
          />
          <Legend
            formatter={(value: string) => CATEGORIES.find((c) => c.id === value)?.label ?? value}
            wrapperStyle={{ fontSize: 12 }}
          />
          {activeCategories.map((cat, i) => (
            <Bar
              key={cat.id}
              dataKey={cat.id}
              stackId="period"
              fill={cat.color}
              isAnimationActive={false}
              radius={i === activeCategories.length - 1 ? [4, 4, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
