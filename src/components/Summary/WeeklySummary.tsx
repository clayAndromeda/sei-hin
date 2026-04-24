import { useState } from 'react';
import { Box, IconButton, Typography, Divider, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import { getWeekRange, toDateString } from '../../utils/date';
import { useExpensesByDateRange } from '../../hooks/useExpenses';
import { useWeekBudget } from '../../hooks/useWeekBudget';
import { formatCurrency } from '../../utils/format';
import { aggregateByCategory } from '../../utils/chart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { DailyBarChart } from './DailyBarChart';
import { ExpenseListSection } from './ExpenseListSection';
import { ExpenseDialog } from '../ExpenseDialog/ExpenseDialog';
import type { Expense } from '../../types';

interface WeeklySummaryProps {
  includeSpecial: boolean;
}

export function WeeklySummary({ includeSpecial }: WeeklySummaryProps) {
  const today = new Date();
  const { start: initialStart } = getWeekRange(today);
  const [weekStart, setWeekStart] = useState(initialStart);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

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

  // 特別な支出のフィルタリング
  const filteredExpenses = includeSpecial
    ? expenses
    : expenses.filter(e => !e.isSpecial);

  const filteredPrevWeekExpenses = includeSpecial
    ? prevWeekExpenses
    : prevWeekExpenses.filter(e => !e.isSpecial);

  // 週予算を取得
  const weekBudget = useWeekBudget(toDateString(weekStart));

  // 各曜日の合計を計算
  const dailyTotals: { date: Date; dateStr: string; total: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = toDateString(d);
    const total = filteredExpenses
      .filter((e) => e.date === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);
    dailyTotals.push({ date: d, dateStr, total });
  }

  const weekTotal = dailyTotals.reduce((sum, d) => sum + d.total, 0);

  // 予算との差分計算と背景色の判定
  let budgetText = '';
  let budgetColor = 'text.secondary';
  let budgetBackgroundColor = 'transparent'; // デフォルトは透明

  if (weekBudget !== null) {
    const remaining = weekBudget - weekTotal;
    if (remaining >= 0) {
      budgetText = `予算まであと${formatCurrency(remaining)}`;
    } else {
      budgetText = `予算超過: ${formatCurrency(Math.abs(remaining))}`;
      budgetColor = 'common.white';
      budgetBackgroundColor = 'error.main'; // 予算超過時は赤背景に白文字
    }
  }

  // 前週の合計
  const prevWeekTotal = filteredPrevWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
  const weekDiff = weekTotal - prevWeekTotal;
  const weekDiffPercent = prevWeekTotal > 0 ? Math.round((weekDiff / prevWeekTotal) * 100) : 0;

  // 特別な支出の合計（トグルに関わらず当週の全特別支出を集計）
  const specialTotal = expenses
    .filter((e) => e.isSpecial)
    .reduce((sum, e) => sum + e.amount, 0);

  // カテゴリ別集計
  const categoryTotals = aggregateByCategory(filteredExpenses);

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
      <CategoryDonutChart categoryTotals={categoryTotals} total={weekTotal} />

      {/* 日別棒グラフ */}
      <DailyBarChart dailyTotals={dailyTotals} expenses={filteredExpenses} />

      <Divider sx={{ my: 1 }} />

      {/* 合計・平均 */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          backgroundColor: budgetBackgroundColor, // 予算超過時に背景色変更
          borderRadius: 1,
          transition: 'background-color 0.2s ease', // スムーズな色変更
        }}
      >
        <Typography variant="body1" fontWeight="bold" color={budgetColor === 'common.white' ? 'common.white' : 'text.primary'}>
          週合計: {formatCurrency(weekTotal)}
        </Typography>
        <Typography variant="body2" color={budgetColor === 'common.white' ? 'common.white' : 'text.secondary'}>
          1日平均: {formatCurrency(dailyAverage)}
        </Typography>

        {/* 予算情報 */}
        {weekBudget !== null && (
          <Typography
            variant="body2"
            sx={{
              color: budgetColor,
              mt: 0.5,
              fontWeight: budgetColor === 'common.white' ? 'bold' : 'normal',
            }}
          >
            {budgetText}
          </Typography>
        )}

        {prevWeekTotal > 0 && (
          <Typography
            variant="body2"
            sx={{
              color: budgetColor === 'common.white' ? 'common.white' : (weekDiff > 0 ? 'error.main' : weekDiff < 0 ? 'success.main' : 'text.secondary'),
              mt: 0.5,
            }}
          >
            前週比: {weekDiff > 0 ? '+' : ''}
            {formatCurrency(weekDiff)} ({weekDiff > 0 ? '+' : ''}
            {weekDiffPercent}%)
          </Typography>
        )}

        {specialTotal > 0 && (
          <Typography
            variant="body2"
            sx={{
              color: budgetColor === 'common.white' ? 'common.white' : 'warning.main',
              mt: 0.5,
            }}
          >
            ⭐️ 特別な支出: {formatCurrency(specialTotal)}
          </Typography>
        )}
      </Box>

      {/* 支出一覧（特別な支出を除外中も全件表示） */}
      <ExpenseListSection expenses={expenses} onEditExpense={setEditingExpense} />

      {/* 支出編集ダイアログ */}
      <ExpenseDialog
        open={editingExpense !== null}
        date={editingExpense?.date ?? ''}
        initialEditExpense={editingExpense ?? undefined}
        onClose={() => setEditingExpense(null)}
      />
    </Box>
  );
}
