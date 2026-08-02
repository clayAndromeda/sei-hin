import { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Button,
  Paper,
  Stack,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import { getWeekRange, toDateString, addDaysToDateString } from '../../utils/date';
import { useExpensesByDateRange } from '../../hooks/useExpenses';
import { useWeekBudget } from '../../hooks/useWeekBudget';
import { formatCurrency } from '../../utils/format';
import {
  aggregateByCategory,
  aggregateFoodBySubcategory,
  aggregateFoodSubcategoryCount,
  buildWeeklyCategoryTrend,
} from '../../utils/chart';
import { FOOD_SUBCATEGORIES } from '../../constants/foodSubcategories';
import { usePersistedState } from '../../hooks/usePersistedState';
import { CategoryDonutChart } from './CategoryDonutChart';
import { DailyBarChart } from './DailyBarChart';
import { PeriodTrendChart } from './PeriodTrendChart';
import { ExpenseListSection } from './ExpenseListSection';
import { SectionCard } from './SectionCard';
import { ExpenseDialog } from '../ExpenseDialog/ExpenseDialog';
import type { Expense } from '../../types';

// 支出推移の表示期間の選択肢（週）
const SPENDING_TREND_WEEK_OPTIONS = [4, 8, 12];

export function WeeklySummary() {
  const today = new Date();
  const { start: initialStart } = getWeekRange(today);
  const [weekStart, setWeekStart] = useState(initialStart);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  // 支出編集ダイアログの表示日（null=閉じる。◀▶で日を移動できる）
  const [expenseDialogDate, setExpenseDialogDate] = useState<string | null>(null);

  // 支出一覧から編集ダイアログを開く
  const openExpenseDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseDialogDate(expense.date);
  };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const expenses = useExpensesByDateRange(
    toDateString(weekStart),
    toDateString(weekEnd),
  );

  // 週予算を取得
  const weekBudget = useWeekBudget(toDateString(weekStart));

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

  // 予算との差分と消化率（進捗バー表示用）
  const isOverBudget = weekBudget !== null && weekTotal > weekBudget;
  const budgetRemaining = weekBudget !== null ? weekBudget - weekTotal : 0;
  const budgetProgress =
    weekBudget !== null && weekBudget > 0
      ? Math.min((weekTotal / weekBudget) * 100, 100)
      : 0;

  // 特別な支出の合計
  const specialTotal = expenses
    .filter((e) => e.isSpecial)
    .reduce((sum, e) => sum + e.amount, 0);

  // カテゴリ別集計
  const categoryTotals = aggregateByCategory(expenses);

  // 外食・間食の回数・金額
  const foodSubcategoryCounts = aggregateFoodSubcategoryCount(expenses);
  const foodSubcategoryTotals = aggregateFoodBySubcategory(expenses);
  const hasFoodSubcategoryCounts = FOOD_SUBCATEGORIES.some(
    (sub) => (foodSubcategoryCounts.get(sub.id) ?? 0) > 0,
  );

  const weekEndStr = toDateString(weekEnd);

  // 支出の推移（表示中の週を含む直近N週のカテゴリ別比較）
  const [spendingTrendWeeks, setSpendingTrendWeeks] = usePersistedState(
    'summary.week.trendWeeks',
    8,
  );
  const weekStartStr = toDateString(weekStart);
  const spendingTrendStart = addDaysToDateString(weekStartStr, -7 * (spendingTrendWeeks - 1));
  const spendingTrendExpenses = useExpensesByDateRange(spendingTrendStart, weekEndStr);
  const spendingTrend = buildWeeklyCategoryTrend(
    spendingTrendExpenses,
    weekStartStr,
    spendingTrendWeeks,
  );
  const hasSpendingTrend = spendingTrend.some((w) => w.total > 0);
  // 記録のある週だけで平均を出す（記録開始前の週で平均が下がるのを防ぐ）
  const recordedWeeks = spendingTrend.filter((w) => w.total > 0);
  const spendingTrendAverage =
    recordedWeeks.length > 0
      ? Math.floor(recordedWeeks.reduce((sum, w) => sum + w.total, 0) / recordedWeeks.length)
      : 0;

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
    <Stack spacing={1.5}>
      {/* 週切り替え */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
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

      {/* 週サマリーカード（週合計と予算の消化状況を一目で把握できるようにする） */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          ...(isOverBudget && { borderColor: 'error.main' }),
        }}
      >
        <Typography variant="body2" color="text.secondary">
          週合計
        </Typography>
        <Typography variant="h4" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
          {formatCurrency(weekTotal)}
        </Typography>

        {/* 予算の消化状況（進捗バー） */}
        {weekBudget !== null && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={budgetProgress}
              color={isOverBudget ? 'error' : 'primary'}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography
                variant="body2"
                sx={{
                  color: isOverBudget ? 'error.main' : 'text.secondary',
                  fontWeight: isOverBudget ? 'bold' : 'normal',
                }}
              >
                {isOverBudget
                  ? `予算超過: ${formatCurrency(Math.abs(budgetRemaining))}`
                  : `予算まであと${formatCurrency(budgetRemaining)}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                予算 {formatCurrency(weekBudget)}
              </Typography>
            </Box>
          </Box>
        )}

        {hasFoodSubcategoryCounts && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {FOOD_SUBCATEGORIES.map(
              (sub) =>
                `${sub.label} ${foodSubcategoryCounts.get(sub.id) ?? 0}回・${formatCurrency(
                  foodSubcategoryTotals.get(sub.id) ?? 0,
                )}`,
            ).join(' ／ ')}
          </Typography>
        )}

        {specialTotal > 0 && (
          <Typography variant="body2" sx={{ mt: 0.5, color: 'warning.main' }}>
            ⭐️ 特別な支出: {formatCurrency(specialTotal)}
          </Typography>
        )}
      </Paper>

      {/* 支出一覧（参照頻度が高いため上部に配置） */}
      <ExpenseListSection
        expenses={expenses}
        onEditExpense={openExpenseDialog}
        storageKey="summary.week.expensesOpen"
        defaultOpen
      />

      {/* 日別棒グラフ */}
      <SectionCard
        title="日別の支出"
        storageKey="summary.week.dailyOpen"
        defaultOpen
      >
        <DailyBarChart dailyTotals={dailyTotals} expenses={expenses} />
      </SectionCard>

      {/* カテゴリ別ドーナツチャート */}
      <SectionCard
        title="カテゴリ別内訳"
        storageKey="summary.week.categoryOpen"
        defaultOpen
      >
        <CategoryDonutChart
          categoryTotals={categoryTotals}
          total={weekTotal}
          foodSubcategoryTotals={foodSubcategoryTotals}
        />
      </SectionCard>

      {/* 支出の推移（複数週のカテゴリ別比較） */}
      {hasSpendingTrend && (
        <SectionCard
          title="支出の推移"
          summary={`週平均 ${formatCurrency(spendingTrendAverage)}`}
          storageKey="summary.week.spendingTrendOpen"
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5 }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={spendingTrendWeeks}
              onChange={(_, value) => {
                if (value !== null) setSpendingTrendWeeks(value);
              }}
            >
              {SPENDING_TREND_WEEK_OPTIONS.map((count) => (
                <ToggleButton key={count} value={count}>
                  {count}週
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', px: 2, pt: 1 }}
          >
            直近{spendingTrendWeeks}週の支出・週平均 {formatCurrency(spendingTrendAverage)}
            （記録のある週のみ）
          </Typography>
          <PeriodTrendChart data={spendingTrend} />
        </SectionCard>
      )}

      {/* 支出編集ダイアログ（◀▶で日を移動しながら連続修正できる） */}
      <ExpenseDialog
        open={expenseDialogDate !== null}
        date={expenseDialogDate ?? ''}
        initialEditExpense={editingExpense ?? undefined}
        onClose={() => {
          setExpenseDialogDate(null);
          setEditingExpense(null);
        }}
        onNavigateDate={setExpenseDialogDate}
      />
    </Stack>
  );
}
