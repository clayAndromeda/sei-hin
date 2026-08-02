import { Box, Typography, useTheme } from '@mui/material';
import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, LabelList } from 'recharts';
import { WEEKDAY_LABELS, isFutureDate } from '../../utils/date';
import { CATEGORIES } from '../../constants/categories';
import { formatCurrency } from '../../utils/format';
import type { Expense } from '../../types';
import { ChartReadout } from './ChartReadout';
import { useChartSelection } from '../../hooks/useChartSelection';

interface DailyBarChartProps {
  dailyTotals: { date: Date; dateStr: string; total: number }[];
  expenses: Expense[];
  height?: number;
}

// 週の日別積み上げ棒グラフ
// バーをタップすると下の固定領域にその日の内訳を表示する
export function DailyBarChart({ dailyTotals, expenses, height = 200 }: DailyBarChartProps) {
  const theme = useTheme();
  const { selected, handleChartClick } = useChartSelection(
    dailyTotals.map((d) => `${d.dateStr}:${d.total}`).join('|'),
  );

  // 日×カテゴリの集計データを作成
  const chartData = dailyTotals.map((item, i) => {
    const future = isFutureDate(item.date);
    const dayExpenses = expenses.filter((e) => e.date === item.dateStr);

    const entry: Record<string, string | number> = { name: WEEKDAY_LABELS[i] };
    for (const cat of CATEGORIES) {
      entry[cat.id] = future
        ? 0
        : dayExpenses
            .filter((e) => (e.category ?? 'food') === cat.id)
            .reduce((sum, e) => sum + e.amount, 0);
    }
    // 合計（ラベル表示用）
    entry.total = future ? 0 : item.total;
    return entry;
  });

  const hasData = chartData.some((d) => (d.total as number) > 0);

  if (!hasData) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          この週のデータはありません
        </Typography>
      </Box>
    );
  }

  // 実際にデータがあるカテゴリのみ表示
  const activeCategories = CATEGORIES.filter((cat) =>
    chartData.some((d) => (d[cat.id] as number) > 0),
  );

  const selectedEntry = selected !== null ? chartData[selected] : null;
  const selectedDay = selected !== null ? dailyTotals[selected] : null;
  const selectedTitle = selectedDay
    ? `${selectedDay.date.getMonth() + 1}/${selectedDay.date.getDate()}（${WEEKDAY_LABELS[selected ?? 0]}）`
    : '';

  return (
    <Box sx={{ width: '100%', my: 2, '& .recharts-wrapper': { cursor: 'pointer' }, '& .recharts-wrapper svg:focus:not(:focus-visible)': { outline: 'none' } }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 8, left: 8, bottom: 0 }}
          onClick={handleChartClick}
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          {activeCategories.map((cat, i) => (
            <Bar
              key={cat.id}
              dataKey={cat.id}
              stackId="daily"
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
              {/* 最後のカテゴリ（一番上）にだけ合計ラベルを表示 */}
              {i === activeCategories.length - 1 && (
                <LabelList
                  dataKey="total"
                  position="top"
                  style={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  formatter={(v: string | number | boolean | null | undefined) => {
                    const n = Number(v ?? 0);
                    return n > 0 ? `¥${n.toLocaleString()}` : '';
                  }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* 選択した日の内訳（グラフを覆わない固定領域） */}
      {selectedEntry && (
        <ChartReadout
          title={selectedTitle}
          total={`合計 ${formatCurrency(selectedEntry.total as number)}`}
          items={activeCategories
            .filter((cat) => (selectedEntry[cat.id] as number) > 0)
            .map((cat) => ({
              color: cat.color,
              label: cat.label,
              value: formatCurrency(selectedEntry[cat.id] as number),
            }))}
        />
      )}
      {!selectedEntry && (
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
