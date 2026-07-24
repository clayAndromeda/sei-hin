import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FOOD_SUBCATEGORIES } from '../../constants/foodSubcategories';
import { formatCurrency, formatAxisAmount } from '../../utils/format';
import type { MonthlySubcategoryTrend } from '../../utils/chart';

// カテゴリ色（食費: #4CAF50）と被らない配色
const SUBCATEGORY_COLORS: Record<string, string> = {
  eating_out: '#FF7043',
  snack: '#26A69A',
};

export type FoodTrendMode = 'count' | 'amount';

interface FoodFrequencyTrendChartProps {
  data: MonthlySubcategoryTrend[];
  // 回数（count）と金額（amount）のどちらを表示するか
  mode?: FoodTrendMode;
  height?: number;
}

export function FoodFrequencyTrendChart({
  data,
  mode = 'count',
  height = 200,
}: FoodFrequencyTrendChartProps) {
  const hasData = data.some((d) => FOOD_SUBCATEGORIES.some((sub) => d.counts[sub.id] > 0));

  if (!hasData) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          この期間の外食・間食の記録はありません
        </Typography>
      </Box>
    );
  }

  const chartData = data.map((d) => ({
    label: d.label,
    ...(mode === 'count' ? d.counts : d.amounts),
  }));

  return (
    <Box sx={{ width: '100%', my: 1 }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={mode === 'amount' ? 40 : 24}
            tickFormatter={mode === 'amount' ? formatAxisAmount : undefined}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const sub = FOOD_SUBCATEGORIES.find((s) => s.id === name);
              const text =
                mode === 'count' ? `${value ?? 0}回` : formatCurrency(value ?? 0);
              return [text, sub?.label ?? name ?? ''];
            }}
          />
          <Legend
            formatter={(value: string) => FOOD_SUBCATEGORIES.find((s) => s.id === value)?.label ?? value}
            wrapperStyle={{ fontSize: 12 }}
          />
          {FOOD_SUBCATEGORIES.map((sub) => (
            <Bar
              key={sub.id}
              dataKey={sub.id}
              fill={SUBCATEGORY_COLORS[sub.id]}
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
