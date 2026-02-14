import { useState } from 'react';
import { Box, IconButton, List, ListItem, ListItemText, Typography, Divider, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import { getWeekRange, toDateString, WEEKDAY_LABELS, isFutureDate } from '../../utils/date';
import { useExpensesByDateRange } from '../../hooks/useExpenses';
import { formatCurrency } from '../../utils/format';
import { aggregateByCategory } from '../../utils/chart';
import { CategoryDonutChart } from './CategoryDonutChart';

export function WeeklySummary() {
  const today = new Date();
  const { start: initialStart } = getWeekRange(today);
  const [weekStart, setWeekStart] = useState(initialStart);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const expenses = useExpensesByDateRange(
    toDateString(weekStart),
    toDateString(weekEnd),
  );

  // 前週のデータを取得
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekEnd = new Date(prevWeekStart);
  prevWeekEnd.setDate(prevWeekStart.getDate() + 6);
  const prevWeekExpenses = useExpensesByDateRange(
    toDateString(prevWeekStart),
    toDateString(prevWeekEnd),
  );

  // 各曜日の合計を計算
  const dailyTotals: { date: Date; dateStr: string; total: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = toDateString(d);
    const total = expenses
      .filter((e) => e.date === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);
    dailyTotals.push({ date: d, dateStr, total });
  }

  const weekTotal = dailyTotals.reduce((sum, d) => sum + d.total, 0);

  // 前週の合計
  const prevWeekTotal = prevWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
  const weekDiff = weekTotal - prevWeekTotal;
  const weekDiffPercent = prevWeekTotal > 0 ? Math.round((weekDiff / prevWeekTotal) * 100) : 0;

  // カテゴリ別集計
  const categoryTotals = aggregateByCategory(expenses);

  // 平均の分母: 当週なら今日までの日数、過去週なら7
  const todayStr = toDateString(today);
  const weekEndStr = toDateString(weekEnd);
  let daysForAverage: number;
  if (todayStr < toDateString(weekStart)) {
    // 未来の週
    daysForAverage = 7;
  } else if (todayStr >= toDateString(weekStart) && todayStr <= weekEndStr) {
    // 今週
    const diffMs = today.getTime() - weekStart.getTime();
    daysForAverage = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  } else {
    // 過去の週
    daysForAverage = 7;
  }
  const dailyAverage = daysForAverage > 0 ? Math.floor(weekTotal / daysForAverage) : 0;

  const goToPrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const goToToday = () => {
    const { start } = getWeekRange(today);
    setWeekStart(start);
  };

  const formatShortDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <Box>
      {/* 週切り替え */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
        <IconButton onClick={goToPrevWeek} size="small">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="body1" sx={{ mx: 1, minWidth: 130, textAlign: 'center' }}>
          {formatShortDate(weekStart)} 〜 {formatShortDate(weekEnd)}
        </Typography>
        <IconButton onClick={goToNextWeek} size="small">
          <ChevronRightIcon />
        </IconButton>
        <Button
          onClick={goToToday}
          size="small"
          startIcon={<TodayIcon />}
          variant="outlined"
          sx={{ ml: 1 }}
        >
          今週
        </Button>
      </Box>

      {/* カテゴリ別ドーナツチャート */}
      {categoryTotals.size > 0 && (
        <CategoryDonutChart categoryTotals={categoryTotals} total={weekTotal} />
      )}

      {/* 日別リスト */}
      <List dense>
        {dailyTotals.map((item, i) => (
          <ListItem key={item.dateStr}>
            <ListItemText
              primary={`${WEEKDAY_LABELS[i]} ${formatShortDate(item.date)}`}
              sx={{ flex: '0 0 auto', minWidth: 80 }}
            />
            <Typography variant="body2" sx={{ ml: 'auto' }}>
              {isFutureDate(item.date) ? '−' : formatCurrency(item.total)}
            </Typography>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* 合計・平均 */}
      <Box sx={{ px: 2 }}>
        <Typography variant="body1" fontWeight="bold">
          週合計: {formatCurrency(weekTotal)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          1日平均: {formatCurrency(dailyAverage)}
        </Typography>
        {prevWeekTotal > 0 && (
          <Typography
            variant="body2"
            sx={{
              color: weekDiff > 0 ? 'error.main' : weekDiff < 0 ? 'success.main' : 'text.secondary',
              mt: 0.5,
            }}
          >
            前週比: {weekDiff > 0 ? '+' : ''}
            {formatCurrency(weekDiff)} ({weekDiff > 0 ? '+' : ''}
            {weekDiffPercent}%)
          </Typography>
        )}
      </Box>
    </Box>
  );
}
