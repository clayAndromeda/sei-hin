import { Box, Typography } from '@mui/material';
import { BarChart, Bar, Cell, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts';
import { FOOD_SUBCATEGORIES } from '../../constants/foodSubcategories';
import { formatCurrency, formatAxisAmount } from '../../utils/format';
import type { MonthlySubcategoryTrend } from '../../utils/chart';
import { ChartReadout } from './ChartReadout';
import { useChartSelection } from '../../hooks/useChartSelection';

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

// 外食・間食の回数/金額の推移棒グラフ
// バーをタップすると下の固定領域に回数と金額の両方を表示する
export function FoodFrequencyTrendChart({
  data,
  mode = 'count',
  height = 200,
}: FoodFrequencyTrendChartProps) {
  const { selected, handleChartClick } = useChartSelection(
    data.map((d) => d.label).join('|'),
  );
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

  const selectedData = selected !== null ? data[selected] : null;

  return (
    <Box sx={{ width: '100%', my: 1, '& .recharts-wrapper': { cursor: 'pointer' }, '& .recharts-wrapper svg:focus:not(:focus-visible)': { outline: 'none' } }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          onClick={handleChartClick}
        >
          <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={mode === 'amount' ? 40 : 24}
            tickFormatter={mode === 'amount' ? formatAxisAmount : undefined}
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
            >
              {/* 選択中以外のバーを減光して、選択バーを目立たせる */}
              {chartData.map((_, dataIndex) => (
                <Cell
                  key={dataIndex}
                  fillOpacity={selected === null || selected === dataIndex ? 1 : 0.35}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* 選択したバーの内訳（回数と金額を両方表示） */}
      {selectedData && (
        <ChartReadout
          title={selectedData.label}
          items={FOOD_SUBCATEGORIES.map((sub) => ({
            color: SUBCATEGORY_COLORS[sub.id],
            label: sub.label,
            value: `${selectedData.counts[sub.id] ?? 0}回・${formatCurrency(
              selectedData.amounts[sub.id] ?? 0,
            )}`,
          }))}
        />
      )}
      {!selectedData && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mb: 0.5 }}
        >
          バーをタップすると内訳を表示します
        </Typography>
      )}
    </Box>
  );
}
