import { useState } from 'react';
import { Box, IconButton, Typography, List, ListItem, ListItemText, Divider, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useExpensesByMonth } from '../../hooks/useExpenses';
import { useMonthlyFixedCosts } from '../../hooks/useFixedCosts';
import { formatCurrency } from '../../utils/format';
import { toDateString } from '../../utils/date';
import {
  formatYearMonth,
  formatYearMonthLabel,
  isPastYearMonth,
} from '../../utils/fixedCost';
import { aggregateByCategory } from '../../utils/chart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { ExpenseListSection } from './ExpenseListSection';
import { FixedCostItemDialog } from './FixedCostItemDialog';
import type { FixedCostItem } from '../../types';

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
  const [fixedCostDialogMode, setFixedCostDialogMode] =
    useState<'add' | 'edit' | null>(null);
  const [fixedCostDialogItem, setFixedCostDialogItem] =
    useState<FixedCostItem | null>(null);

  const expenses = useExpensesByMonth(year, month);
  const yearMonth = formatYearMonth(year, month);
  const isPast = isPastYearMonth(yearMonth, today);
  const { resolved: fixedCosts, total: fixedCostTotal } =
    useMonthlyFixedCosts(yearMonth);

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
  const categoryTotals = aggregateByCategory(filteredExpenses);

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
            前月比（月合計）: {monthDiff > 0 ? '+' : ''}
            {formatCurrency(monthDiff)} ({monthDiff > 0 ? '+' : ''}
            {monthDiffPercent}%)
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

      {/* 月固定費の内訳 */}
      {(fixedCosts.length > 0 || !isPast) && (
        <>
          <Divider>
            <Typography variant="caption">固定費の内訳</Typography>
          </Divider>
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
        </>
      )}

      {/* 支出一覧（メモ確認用） */}
      <ExpenseListSection expenses={filteredExpenses} />

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
