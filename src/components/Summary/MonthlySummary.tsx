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
  Paper,
  Stack,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useExpensesByMonth, useExpensesByDateRange } from '../../hooks/useExpenses';
import { useMonthlyFixedCosts } from '../../hooks/useFixedCosts';
import { useMonthBudget } from '../../hooks/useMonthBudget';
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
  buildFoodSubcategoryMonthlyTrend,
  buildMonthlyCategoryTrend,
} from '../../utils/chart';
import { FOOD_SUBCATEGORIES } from '../../constants/foodSubcategories';
import { usePersistedState } from '../../hooks/usePersistedState';
import { CategoryDonutChart } from './CategoryDonutChart';
import { FoodFrequencyTrendChart, type FoodTrendMode } from './FoodFrequencyTrendChart';
import { PeriodTrendChart } from './PeriodTrendChart';
import { ExpenseListSection } from './ExpenseListSection';
import { FixedCostItemDialog } from './FixedCostItemDialog';
import { SectionCard } from './SectionCard';
import { ExpenseDialog } from '../ExpenseDialog/ExpenseDialog';
import type { Expense, FixedCostItem } from '../../types';

const FREQUENCY_TREND_MONTHS = 6;

// 支出推移の表示期間の選択肢（ヶ月）
const SPENDING_TREND_MONTH_OPTIONS = [3, 6, 12];

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

  const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 特別な支出の合計
  const specialTotal = expenses
    .filter((e) => e.isSpecial)
    .reduce((sum, e) => sum + e.amount, 0);

  // 月予算（固定費+変動費）との比較（特別な支出も含める。個別設定 or デフォルト）
  const monthBudget = useMonthBudget(yearMonth);
  const budgetSpent = monthTotal + fixedCostTotal;
  const isOverBudget = monthBudget !== null && budgetSpent > monthBudget;
  const budgetRemaining = monthBudget !== null ? monthBudget - budgetSpent : 0;
  const budgetProgress =
    monthBudget !== null && monthBudget > 0
      ? Math.min((budgetSpent / monthBudget) * 100, 100)
      : 0;

  // カテゴリ別集計
  const categoryTotals = aggregateByCategory(expenses);

  // 食費のサブカテゴリ別集計（間食の無駄遣いを把握するため）
  const foodSubcategoryTotals = aggregateFoodBySubcategory(expenses);

  // 外食・間食の回数・金額推移（直近6ヶ月、当月含む）
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
  const currentMonthFood = foodFrequencyTrend[foodFrequencyTrend.length - 1];
  const hasFrequencyData = foodFrequencyTrend.some((m) =>
    FOOD_SUBCATEGORIES.some((sub) => m.counts[sub.id] > 0),
  );
  // 推移グラフの表示モード（回数/金額）
  const [foodTrendMode, setFoodTrendMode] = usePersistedState<FoodTrendMode>(
    'summary.month.foodTrendMode',
    'count',
  );
  // 当月の外食・間食の合計（セクションヘッダーの要約用）
  const currentMonthFoodAmount = FOOD_SUBCATEGORIES.reduce(
    (sum, sub) => sum + (currentMonthFood.amounts[sub.id] ?? 0),
    0,
  );
  const currentMonthFoodCount = FOOD_SUBCATEGORIES.reduce(
    (sum, sub) => sum + (currentMonthFood.counts[sub.id] ?? 0),
    0,
  );

  // 支出の推移（表示中の月を含む直近Nヶ月のカテゴリ別比較）
  const [spendingTrendMonths, setSpendingTrendMonths] = usePersistedState(
    'summary.month.trendMonths',
    6,
  );
  const spendingTrendStart = new Date(year, month - (spendingTrendMonths - 1), 1);
  const spendingTrendExpenses = useExpensesByDateRange(
    toDateString(spendingTrendStart),
    toDateString(trendRangeEnd),
  );
  const spendingTrend = buildMonthlyCategoryTrend(
    spendingTrendExpenses,
    year,
    month,
    spendingTrendMonths,
  );
  const hasSpendingTrend = spendingTrend.some((m) => m.total > 0);
  // 記録のある月だけで平均を出す（記録開始前の月で平均が下がるのを防ぐ）
  const recordedMonths = spendingTrend.filter((m) => m.total > 0);
  const spendingTrendAverage =
    recordedMonths.length > 0
      ? Math.floor(
          recordedMonths.reduce((sum, m) => sum + m.total, 0) / recordedMonths.length,
        )
      : 0;

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

        {/* 月予算の消化状況（進捗バー） */}
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

        {specialTotal > 0 && (
          <Typography
            variant="body2"
            sx={{ mt: 0.5, color: 'warning.main' }}
          >
            ⭐️ 特別な支出: {formatCurrency(specialTotal)}
          </Typography>
        )}
      </Paper>

      {/* 支出一覧（カテゴリフィルタあり。参照頻度が高いため上部に配置） */}
      <ExpenseListSection
        expenses={expenses}
        onEditExpense={openExpenseDialog}
        storageKey="summary.month.expensesOpen"
        defaultOpen
      />

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

      {/* 外食・間食の回数・金額推移 */}
      {hasFrequencyData && (
        <SectionCard
          title="外食・間食"
          summary={`${formatCurrency(currentMonthFoodAmount)}・${currentMonthFoodCount}回`}
          storageKey="summary.month.frequencyOpen"
        >
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={foodTrendMode}
                onChange={(_, value) => {
                  if (value !== null) setFoodTrendMode(value);
                }}
              >
                <ToggleButton value="count">回数</ToggleButton>
                <ToggleButton value="amount">金額</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', px: 2, pt: 1 }}
            >
              {month + 1}月: {FOOD_SUBCATEGORIES.map(
                (sub) =>
                  `${sub.label} ${currentMonthFood.counts[sub.id] ?? 0}回・${formatCurrency(
                    currentMonthFood.amounts[sub.id] ?? 0,
                  )}`,
              ).join(' ／ ')}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', px: 2, pt: 0.5 }}
            >
              直近{FREQUENCY_TREND_MONTHS}ヶ月の推移
            </Typography>
            <FoodFrequencyTrendChart data={foodFrequencyTrend} mode={foodTrendMode} />
        </SectionCard>
      )}

      {/* 支出の推移（複数月のカテゴリ別比較） */}
      {hasSpendingTrend && (
        <SectionCard
          title="支出の推移"
          summary={`月平均 ${formatCurrency(spendingTrendAverage)}`}
          storageKey="summary.month.spendingTrendOpen"
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5 }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={spendingTrendMonths}
              onChange={(_, value) => {
                if (value !== null) setSpendingTrendMonths(value);
              }}
            >
              {SPENDING_TREND_MONTH_OPTIONS.map((count) => (
                <ToggleButton key={count} value={count}>
                  {count}ヶ月
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', px: 2, pt: 1 }}
          >
            直近{spendingTrendMonths}ヶ月の変動費・月平均 {formatCurrency(spendingTrendAverage)}
            （記録のある月のみ）
          </Typography>
          <PeriodTrendChart data={spendingTrend} />
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
