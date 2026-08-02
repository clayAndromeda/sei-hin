import { Box, Typography } from '@mui/material';
import { BarChart, Bar, Cell, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts';
import { CATEGORIES } from '../../constants/categories';
import { formatCurrency, formatAxisAmount } from '../../utils/format';
import type { PeriodCategoryTotal } from '../../utils/chart';
import { ChartReadout } from './ChartReadout';
import { useChartSelection } from '../../hooks/useChartSelection';

interface PeriodTrendChartProps {
  data: PeriodCategoryTotal[];
  height?: number;
}

// 期間（月・週）ごとのカテゴリ別積み上げ棒グラフ
// バーをタップすると下の固定領域に内訳を表示する（タップで内訳を確認できる）
export function PeriodTrendChart({ data, height = 240 }: PeriodTrendChartProps) {
  const { selected, handleChartClick } = useChartSelection(
    data.map((d) => `${d.label}:${d.total}`).join('|'),
  );
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

  const selectedData = selected !== null ? data[selected] : null;

  return (
    <Box sx={{ width: '100%', my: 1, '& .recharts-wrapper': { cursor: 'pointer' }, '& .recharts-wrapper svg:focus:not(:focus-visible)': { outline: 'none' } }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          onClick={handleChartClick}
        >
          <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={formatAxisAmount}
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

      {/* 選択したバーの内訳（グラフを覆わない固定領域） */}
      {selectedData && (
        <ChartReadout
          title={selectedData.label}
          total={`合計 ${formatCurrency(selectedData.total)}`}
          items={activeCategories
            .filter((cat) => (selectedData.totals[cat.id] ?? 0) > 0)
            .map((cat) => ({
              color: cat.color,
              label: cat.label,
              value: formatCurrency(selectedData.totals[cat.id] ?? 0),
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
