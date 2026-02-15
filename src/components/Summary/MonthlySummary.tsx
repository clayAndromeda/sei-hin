import { useState } from 'react';
import { Box, IconButton, Typography, List, ListItem, ListItemText, Divider, Chip, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import { useExpensesByMonth } from '../../hooks/useExpenses';
import { formatCurrency } from '../../utils/format';
import { toDateString } from '../../utils/date';
import { CATEGORIES } from '../../constants/categories';
import { CategoryDonutChart } from './CategoryDonutChart';

interface WeekBreakdown {
  label: string;
  total: number;
}

// 月の日付を月曜始まりの週に分割する
function getWeekBreakdowns(
  year: number,
  month: number,
  expensesByDate: Map<string, number>,
): WeekBreakdown[] {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weeks: WeekBreakdown[] = [];
  let weekNum = 1;
  let weekStart = 1;

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    // 日曜（0）が週の最終日、または月末
    const isEndOfWeek = dayOfWeek === 0;
    const isLastDay = d === lastDay;

    if (isEndOfWeek || isLastDay) {
      let total = 0;
      for (let i = weekStart; i <= d; i++) {
        const dateStr = toDateString(new Date(year, month, i));
        total += expensesByDate.get(dateStr) ?? 0;
      }

      const m = month + 1;
      const label = `第${weekNum}週 (${m}/${weekStart}-${m}/${d})`;
      weeks.push({ label, total });

      weekNum++;
      weekStart = d + 1;
    }
  }

  return weeks;
}

interface MonthlySummaryProps {
  includeSpecial: boolean;
}

export function MonthlySummary({ includeSpecial }: MonthlySummaryProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const expenses = useExpensesByMonth(year, month);

  // 前月のデータを取得
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthExpenses = useExpensesByMonth(prevYear, prevMonth);

  // 特別な支出のフィルタリング
  const filteredExpenses = includeSpecial
    ? expenses
    : expenses.filter(e => !e.isSpecial);

  const filteredPrevMonthExpenses = includeSpecial
    ? prevMonthExpenses
    : prevMonthExpenses.filter(e => !e.isSpecial);

  const monthTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 前月の合計
  const prevMonthTotal = filteredPrevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthDiff = monthTotal - prevMonthTotal;
  const monthDiffPercent = prevMonthTotal > 0 ? Math.round((monthDiff / prevMonthTotal) * 100) : 0;

  // 平均の分母: 当月なら今日までの日数、過去月なら月の日数
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const daysForAverage = isCurrentMonth ? today.getDate() : lastDayOfMonth;
  const dailyAverage = daysForAverage > 0 ? Math.floor(monthTotal / daysForAverage) : 0;

  // 日付ごとの金額マップ
  const expensesByDate = new Map<string, number>();
  for (const e of filteredExpenses) {
    expensesByDate.set(e.date, (expensesByDate.get(e.date) ?? 0) + e.amount);
  }

  const weekBreakdowns = getWeekBreakdowns(year, month, expensesByDate);

  // カテゴリ別集計
  const categoryTotals = new Map<string, number>();
  for (const e of filteredExpenses) {
    const cat = e.category ?? 'food';
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + e.amount);
  }

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  return (
    <Box>
      {/* 月切り替え */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
        <IconButton onClick={goToPrevMonth} size="small">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="body1" sx={{ mx: 1, minWidth: 120, textAlign: 'center' }}>
          {year}年{month + 1}月
        </Typography>
        <IconButton onClick={goToNextMonth} size="small">
          <ChevronRightIcon />
        </IconButton>
        <Button
          onClick={goToToday}
          size="small"
          startIcon={<TodayIcon />}
          variant="outlined"
          sx={{ ml: 1 }}
        >
          今月
        </Button>
      </Box>

      {/* 月合計・平均 */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          月合計: {formatCurrency(monthTotal)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          1日平均: {formatCurrency(dailyAverage)}
        </Typography>
        {prevMonthTotal > 0 && (
          <Typography
            variant="body2"
            sx={{
              color: monthDiff > 0 ? 'error.main' : monthDiff < 0 ? 'success.main' : 'text.secondary',
              mt: 0.5,
            }}
          >
            前月比: {monthDiff > 0 ? '+' : ''}
            {formatCurrency(monthDiff)} ({monthDiff > 0 ? '+' : ''}
            {monthDiffPercent}%)
          </Typography>
        )}
      </Box>

      {/* カテゴリ別ドーナツチャート */}
      <CategoryDonutChart categoryTotals={categoryTotals} total={monthTotal} />

      {/* カテゴリ別内訳 */}
      {categoryTotals.size > 0 && (
        <>
          <Divider>
            <Typography variant="caption">ジャンル別内訳</Typography>
          </Divider>
          <List dense>
            {CATEGORIES.filter((cat) => categoryTotals.has(cat.id)).map((cat) => {
              const total = categoryTotals.get(cat.id) ?? 0;
              const percentage = monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0;
              return (
                <ListItem key={cat.id}>
                  <Chip
                    label={cat.label}
                    size="small"
                    sx={{
                      backgroundColor: cat.color,
                      color: '#fff',
                      fontSize: '0.7rem',
                      height: 20,
                      mr: 1,
                    }}
                  />
                  <ListItemText
                    primary={`${formatCurrency(total)} (${percentage}%)`}
                  />
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      <Divider>
        <Typography variant="caption">週ごとの内訳</Typography>
      </Divider>

      {/* 週ごとの内訳 */}
      <List dense>
        {weekBreakdowns.map((week) => (
          <ListItem key={week.label}>
            <ListItemText primary={week.label} />
            <Typography variant="body2">{formatCurrency(week.total)}</Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
