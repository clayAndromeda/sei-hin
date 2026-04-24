import { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Button,
  Collapse,
  Chip,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useExpensesByMonth } from '../../hooks/useExpenses';
import { useMonthlyFixedCosts } from '../../hooks/useFixedCosts';
import { formatCurrency } from '../../utils/format';
import {
  formatYearMonth,
  formatYearMonthLabel,
  isPastYearMonth,
} from '../../utils/fixedCost';
import { aggregateByCategory, buildCategoryComparison } from '../../utils/chart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { ExpenseListSection } from './ExpenseListSection';
import { FixedCostItemDialog } from './FixedCostItemDialog';
import { ExpenseDialog } from '../ExpenseDialog/ExpenseDialog';
import type { Expense, FixedCostItem } from '../../types';

interface MonthlySummaryProps {
  includeSpecial: boolean;
}

export function MonthlySummary({ includeSpecial }: MonthlySummaryProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [fixedCostDialogMode, setFixedCostDialogMode] =
    useState<'add' | 'edit' | null>(null);
  const [fixedCostDialogItem, setFixedCostDialogItem] =
    useState<FixedCostItem | null>(null);
  const [fixedCostOpen, setFixedCostOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const expenses = useExpensesByMonth(year, month);
  const yearMonth = formatYearMonth(year, month);
  const isPast = isPastYearMonth(yearMonth, today);
  const { resolved: fixedCosts, total: fixedCostTotal } =
    useMonthlyFixedCosts(yearMonth);

  // 前月のデータを取得
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthExpenses = useExpensesByMonth(prevYear, prevMonth);

  // 特別な支出のフィルタリング（集計用）
  const filteredExpenses = includeSpecial
    ? expenses
    : expenses.filter(e => !e.isSpecial);

  const filteredPrevMonthExpenses = includeSpecial
    ? prevMonthExpenses
    : prevMonthExpenses.filter(e => !e.isSpecial);

  const monthTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 特別な支出の合計（トグルに関わらず当月の全特別支出を集計）
  const specialTotal = expenses
    .filter((e) => e.isSpecial)
    .reduce((sum, e) => sum + e.amount, 0);

  // 前月の合計
  const prevMonthTotal = filteredPrevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthDiff = monthTotal - prevMonthTotal;
  const monthDiffPercent = prevMonthTotal > 0 ? Math.round((monthDiff / prevMonthTotal) * 100) : 0;

  // 平均の分母: 当月なら今日までの日数、過去月なら月の日数
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const daysForAverage = isCurrentMonth ? today.getDate() : lastDayOfMonth;
  const dailyAverage = daysForAverage > 0 ? Math.floor(monthTotal / daysForAverage) : 0;

  // カテゴリ別集計
  const categoryTotals = aggregateByCategory(filteredExpenses);
  const prevCategoryTotals = aggregateByCategory(filteredPrevMonthExpenses);
  const categoryComparison = buildCategoryComparison(categoryTotals, prevCategoryTotals);

  // 1日平均の前月比: 期間を揃えて比較する（MTD同士）
  // 当月進行中の場合、前月も同じ日数分のみを対象にする（例: 今日が4/5なら3/1〜3/5のみ）。
  // 過去月閲覧時は両月ともフル期間で比較する。
  const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
  const prevDaysForAverage = isCurrentMonth
    ? Math.min(today.getDate(), prevMonthLastDay)
    : prevMonthLastDay;
  const prevMonthTotalForAverage = isCurrentMonth
    ? filteredPrevMonthExpenses
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
          <>
            <Typography
              variant="body2"
              sx={{
                color: monthDiff > 0 ? 'error.main' : monthDiff < 0 ? 'success.main' : 'text.secondary',
                mt: 0.5,
              }}
            >
              前月比（月合計）: {monthDiff > 0 ? '+' : ''}
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
        {fixedCosts.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              固定費: {formatCurrency(fixedCostTotal)}
            </Typography>
            <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
              月合計 + 固定費: {formatCurrency(monthTotal + fixedCostTotal)}
            </Typography>
          </>
        )}
      </Box>

      {/* カテゴリ別ドーナツチャート */}
      <CategoryDonutChart categoryTotals={categoryTotals} total={monthTotal} />

      {/* カテゴリ別前月比較（折りたたみ） */}
      {categoryComparison.length > 0 && prevMonthTotal > 0 && (
        <>
          <Divider sx={{ mt: 1 }} />
          <ListItemButton
            onClick={() => setComparisonOpen(!comparisonOpen)}
            sx={{ py: 1, px: 2, justifyContent: 'space-between' }}
          >
            <Typography variant="body2" color="text.secondary">
              前月比較（カテゴリ別）
            </Typography>
            {comparisonOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </ListItemButton>
          <Collapse in={comparisonOpen}>
            <Box sx={{ px: 1, pb: 1 }}>
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
          </Collapse>
        </>
      )}

      {/* 月固定費の内訳（折りたたみ） */}
      {(fixedCosts.length > 0 || !isPast) && (
        <>
          <Divider sx={{ mt: 1 }} />
          <ListItemButton
            onClick={() => setFixedCostOpen(!fixedCostOpen)}
            sx={{ py: 1, px: 2, justifyContent: 'space-between' }}
          >
            <Typography variant="body2" color="text.secondary">
              固定費の内訳（{fixedCosts.length}件・{formatCurrency(fixedCostTotal)}）
            </Typography>
            {fixedCostOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </ListItemButton>
          <Collapse in={fixedCostOpen}>
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
          </Collapse>
        </>
      )}

      {/* 支出一覧（特別な支出を除外中も全件表示・カテゴリフィルタあり） */}
      <ExpenseListSection expenses={expenses} onEditExpense={setEditingExpense} />

      {/* 支出編集ダイアログ */}
      <ExpenseDialog
        open={editingExpense !== null}
        date={editingExpense?.date ?? ''}
        initialEditExpense={editingExpense ?? undefined}
        onClose={() => setEditingExpense(null)}
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
    </Box>
  );
}
