import { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Chip,
  Paper,
  Stack,
  LinearProgress,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useExpensesByMonth, useExpensesByDateRange } from '../../hooks/useExpenses';
import { useMonthlyFixedCosts } from '../../hooks/useFixedCosts';
import { useDefaultMonthBudget } from '../../hooks/useMonthBudget';
import { formatCurrency } from '../../utils/format';
import { toDateString } from '../../utils/date';
import {
  formatYearMonth,
  formatYearMonthLabel,
  isPastYearMonth,
} from '../../utils/fixedCost';
import {
  aggregateByCategory,
  aggregateFoodBySubcategory,
  buildCategoryComparison,
  buildFoodSubcategoryMonthlyTrend,
} from '../../utils/chart';
import { FOOD_SUBCATEGORIES } from '../../constants/foodSubcategories';
import { CategoryDonutChart } from './CategoryDonutChart';
import { FoodFrequencyTrendChart } from './FoodFrequencyTrendChart';
import { ExpenseListSection } from './ExpenseListSection';
import { FixedCostItemDialog } from './FixedCostItemDialog';
import { SectionCard } from './SectionCard';
import { ExpenseDialog } from '../ExpenseDialog/ExpenseDialog';
import type { Expense, FixedCostItem } from '../../types';

const FREQUENCY_TREND_MONTHS = 6;

export function MonthlySummary() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [fixedCostDialogMode, setFixedCostDialogMode] =
    useState<'add' | 'edit' | null>(null);
  const [fixedCostDialogItem, setFixedCostDialogItem] =
    useState<FixedCostItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  // 支出編集ダイアログの表示日（null=閉じる。◀▶で日を移動できる）
  const [expenseDialogDate, setExpenseDialogDate] = useState<string | null>(null);

  // 支出一覧から編集ダイアログを開く
  const openExpenseDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseDialogDate(expense.date);
  };

  const expenses = useExpensesByMonth(year, month);
  const yearMonth = formatYearMonth(year, month);
  const isPast = isPastYearMonth(yearMonth, today);
  const { resolved: fixedCosts, total: fixedCostTotal } =
    useMonthlyFixedCosts(yearMonth);

  // 前月のデータを取得
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthExpenses = useExpensesByMonth(prevYear, prevMonth);

  const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 特別な支出の合計
  const specialTotal = expenses
    .filter((e) => e.isSpecial)
    .reduce((sum, e) => sum + e.amount, 0);

  // 月予算（固定費+変動費）との比較
  // 特別な支出（isSpecial）は予算から除外する
  const monthBudget = useDefaultMonthBudget();
  const budgetSpent = monthTotal - specialTotal + fixedCostTotal;
  const isOverBudget = monthBudget !== null && budgetSpent > monthBudget;
  const budgetRemaining = monthBudget !== null ? monthBudget - budgetSpent : 0;
  const budgetProgress =
    monthBudget !== null && monthBudget > 0
      ? Math.min((budgetSpent / monthBudget) * 100, 100)
      : 0;

  // 前月の合計
  const prevMonthTotal = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthDiff = monthTotal - prevMonthTotal;
  const monthDiffPercent = prevMonthTotal > 0 ? Math.round((monthDiff / prevMonthTotal) * 100) : 0;

  // 平均の分母: 当月なら今日までの日数、過去月なら月の日数
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const daysForAverage = isCurrentMonth ? today.getDate() : lastDayOfMonth;
  const dailyAverage = daysForAverage > 0 ? Math.floor(monthTotal / daysForAverage) : 0;

  // カテゴリ別集計
  const categoryTotals = aggregateByCategory(expenses);
  const prevCategoryTotals = aggregateByCategory(prevMonthExpenses);
  const categoryComparison = buildCategoryComparison(categoryTotals, prevCategoryTotals);

  // 食費のサブカテゴリ別集計（間食の無駄遣いを把握するため）
  const foodSubcategoryTotals = aggregateFoodBySubcategory(expenses);

  // 外食・間食の回数推移（直近6ヶ月、当月含む）
  const trendRangeStart = new Date(year, month - (FREQUENCY_TREND_MONTHS - 1), 1);
  const trendRangeEnd = new Date(year, month + 1, 0);
  const trendExpenses = useExpensesByDateRange(
    toDateString(trendRangeStart),
    toDateString(trendRangeEnd),
  );
  const foodFrequencyTrend = buildFoodSubcategoryMonthlyTrend(
    trendExpenses,
    year,
    month,
    FREQUENCY_TREND_MONTHS,
  );
  const currentMonthFrequency = foodFrequencyTrend[foodFrequencyTrend.length - 1].counts;
  const hasFrequencyData = foodFrequencyTrend.some((m) =>
    FOOD_SUBCATEGORIES.some((sub) => m.counts[sub.id] > 0),
  );

  // 1日平均の前月比: 期間を揃えて比較する（MTD同士）
  // 当月進行中の場合、前月も同じ日数分のみを対象にする（例: 今日が4/5なら3/1〜3/5のみ）。
  // 過去月閲覧時は両月ともフル期間で比較する。
  const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
  const prevDaysForAverage = isCurrentMonth
    ? Math.min(today.getDate(), prevMonthLastDay)
    : prevMonthLastDay;
  const prevMonthTotalForAverage = isCurrentMonth
    ? prevMonthExpenses
        .filter((e) => parseInt(e.date.slice(8, 10), 10) <= prevDaysForAverage)
        .reduce((sum, e) => sum + e.amount, 0)
    : prevMonthTotal;
  const prevDailyAverage = prevDaysForAverage > 0
    ? Math.floor(prevMonthTotalForAverage / prevDaysForAverage)
    : 0;
  const dailyAverageDiff = dailyAverage - prevDailyAverage;

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
    <Stack spacing={1.5}>
      {/* 月切り替え */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
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

      {/* 支出サマリーカード（総支出＝変動費＋固定費を一目で把握できるようにする） */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          ...(isOverBudget && { borderColor: 'error.main' }),
        }}
      >
        <Typography variant="body2" color="text.secondary">
          総支出（変動費 + 固定費）
        </Typography>
        <Typography variant="h4" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
          {formatCurrency(monthTotal + fixedCostTotal)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              変動費
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {formatCurrency(monthTotal)}
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="caption" color="text.secondary">
              固定費
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {formatCurrency(fixedCostTotal)}
            </Typography>
          </Box>
        </Box>

        {/* 月予算の消化状況（進捗バー、特別な支出は除く） */}
        {monthBudget !== null && (
          <Box sx={{ mt: 1.5 }}>
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
                月予算 {formatCurrency(monthBudget)}
              </Typography>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 1.5 }} />
        <Typography variant="body2" color="text.secondary">
          1日平均（変動費）: {formatCurrency(dailyAverage)}
        </Typography>
        {prevMonthTotal > 0 && (
          <>
            <Typography
              variant="body2"
              sx={{
                color: monthDiff > 0 ? 'error.main' : monthDiff < 0 ? 'success.main' : 'text.secondary',
                mt: 0.5,
              }}
            >
              前月比（変動費）: {monthDiff > 0 ? '+' : ''}
              {formatCurrency(monthDiff)} ({monthDiff > 0 ? '+' : ''}
              {monthDiffPercent}%)
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: dailyAverageDiff > 0 ? 'error.main' : dailyAverageDiff < 0 ? 'success.main' : 'text.secondary',
              }}
            >
              前月比（1日平均）: {dailyAverageDiff > 0 ? '+' : ''}
              {formatCurrency(dailyAverageDiff)}
            </Typography>
          </>
        )}
        {specialTotal > 0 && (
          <Typography
            variant="body2"
            sx={{ mt: 0.5, color: 'warning.main' }}
          >
            ⭐️ 特別な支出: {formatCurrency(specialTotal)}
          </Typography>
        )}
      </Paper>

      {/* カテゴリ別ドーナツチャート */}
      <SectionCard
        title="カテゴリ別内訳"
        storageKey="summary.month.categoryOpen"
        defaultOpen
      >
        <CategoryDonutChart
          categoryTotals={categoryTotals}
          total={monthTotal}
          foodSubcategoryTotals={foodSubcategoryTotals}
        />
      </SectionCard>

      {/* カテゴリ別前月比較 */}
      {categoryComparison.length > 0 && prevMonthTotal > 0 && (
        <SectionCard
          title="前月比較（カテゴリ別）"
          storageKey="summary.month.comparisonOpen"
        >
            <Box sx={{ px: 1, py: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr 1fr 1fr',
                  gap: 0.5,
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  px: 1,
                }}
              >
                <Box />
                <Typography variant="caption" color="text.secondary" align="right">
                  今月
                </Typography>
                <Typography variant="caption" color="text.secondary" align="right">
                  前月
                </Typography>
                <Typography variant="caption" color="text.secondary" align="right">
                  差分
                </Typography>
                {categoryComparison.map((row) => {
                  const diffColor =
                    row.diff > 0 ? 'error.main'
                    : row.diff < 0 ? 'success.main'
                    : 'text.secondary';
                  const sign = row.diff > 0 ? '+' : '';
                  const percentText =
                    row.diffPercent === null
                      ? '新規'
                      : `${sign}${row.diffPercent}%`;
                  return (
                    <Box key={row.id} sx={{ display: 'contents' }}>
                      <Chip
                        label={row.label}
                        size="small"
                        sx={{
                          backgroundColor: row.color,
                          color: '#fff',
                          fontSize: '0.65rem',
                          height: 20,
                          justifySelf: 'start',
                        }}
                      />
                      <Typography variant="body2" align="right" sx={{ fontSize: '0.8rem' }}>
                        {formatCurrency(row.current)}
                      </Typography>
                      <Typography
                        variant="body2"
                        align="right"
                        color="text.secondary"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        {formatCurrency(row.previous)}
                      </Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          variant="body2"
                          sx={{ color: diffColor, fontSize: '0.8rem', lineHeight: 1.2 }}
                        >
                          {sign}{formatCurrency(row.diff)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: diffColor, fontSize: '0.65rem' }}
                        >
                          {percentText}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
        </SectionCard>
      )}

      {/* 外食・間食の回数推移 */}
      {hasFrequencyData && (
        <SectionCard
          title="外食・間食の回数"
          summary={FOOD_SUBCATEGORIES.map(
            (sub) => `${sub.label} ${currentMonthFrequency[sub.id] ?? 0}回`,
          ).join('・')}
          storageKey="summary.month.frequencyOpen"
        >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', px: 2, pt: 1 }}
            >
              直近{FREQUENCY_TREND_MONTHS}ヶ月の推移
            </Typography>
            <FoodFrequencyTrendChart data={foodFrequencyTrend} />
        </SectionCard>
      )}

      {/* 月固定費の内訳 */}
      {(fixedCosts.length > 0 || !isPast) && (
        <SectionCard
          title="固定費の内訳"
          summary={`${fixedCosts.length}件・${formatCurrency(fixedCostTotal)}`}
          storageKey="summary.month.fixedCostOpen"
        >
            {fixedCosts.length > 0 ? (
              <List dense>
                {fixedCosts.map(({ item, amount, changedFrom }) => (
                  <ListItem
                    key={item.id}
                    secondaryAction={
                      !isPast && (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => {
                            setFixedCostDialogItem(item);
                            setFixedCostDialogMode('edit');
                          }}
                          aria-label={`${item.name}を編集`}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText
                      primary={item.name}
                      secondary={
                        changedFrom
                          ? `${formatYearMonthLabel(changedFrom)}以降の金額`
                          : '初期金額'
                      }
                    />
                    <Typography variant="body2" sx={{ mr: isPast ? 0 : 5 }}>
                      {formatCurrency(amount)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 2 }}
              >
                固定費は登録されていません
              </Typography>
            )}
            {!isPast && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setFixedCostDialogItem(null);
                    setFixedCostDialogMode('add');
                  }}
                >
                  項目を追加
                </Button>
              </Box>
            )}
        </SectionCard>
      )}

      {/* 支出一覧（カテゴリフィルタあり） */}
      <ExpenseListSection
        expenses={expenses}
        onEditExpense={openExpenseDialog}
        storageKey="summary.month.expensesOpen"
      />

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

      <FixedCostItemDialog
        open={fixedCostDialogMode !== null}
        mode={fixedCostDialogMode ?? 'add'}
        item={fixedCostDialogItem}
        yearMonth={yearMonth}
        onClose={() => {
          setFixedCostDialogMode(null);
          setFixedCostDialogItem(null);
        }}
      />
    </Stack>
  );
}
