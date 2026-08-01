import { useState } from 'react';
import { Box, IconButton, Typography, Tooltip, useMediaQuery, useTheme, Paper, Divider, FormControlLabel, Switch } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { CalendarGrid } from './CalendarGrid';
import { ExpenseDialog } from '../ExpenseDialog/ExpenseDialog';
import { WeekBudgetDialog } from './WeekBudgetDialog';
import { MonthBudgetDialog } from './MonthBudgetDialog';
import { MonthBudgetPanel } from './MonthBudgetPanel';
import { useExpensesByDateRange } from '../../hooks/useExpenses';
import { useMonthBudget } from '../../hooks/useMonthBudget';
import { useMonthlyFixedCosts } from '../../hooks/useFixedCosts';
import { usePersistedState } from '../../hooks/usePersistedState';
import { getMonthDays, toDateString } from '../../utils/date';
import { formatYearMonth } from '../../utils/fixedCost';
import { formatCurrency } from '../../utils/format';
import { aggregateByCategory } from '../../utils/chart';
import { CategoryDonutChart } from '../Summary/CategoryDonutChart';

export function CalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [monthBudgetDialogOpen, setMonthBudgetDialogOpen] = useState(false);
  const [excludeSpecial, setExcludeSpecial] = usePersistedState('excludeSpecial', false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // カレンダーグリッド全体（42日分）の日付範囲を取得
  const calendarDays = getMonthDays(year, month);
  const calendarStart = toDateString(calendarDays[0]);
  const calendarEnd = toDateString(calendarDays[calendarDays.length - 1]);

  // カレンダー全体の支出を取得（月をまたぐ週の合計を正しく計算するため）
  const allExpenses = useExpensesByDateRange(calendarStart, calendarEnd);

  // 特別な支出のフィルタリング
  const filteredExpenses = excludeSpecial
    ? allExpenses.filter(e => !e.isSpecial)
    : allExpenses;

  // 特別な支出がある日付（除外モードでもマーカーを表示するためフィルタ前の全支出から算出）
  const specialDates = new Set(
    allExpenses.filter(e => e.isSpecial).map(e => e.date),
  );

  // 月合計・カテゴリ集計は当月分のみ
  const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-31`;
  const monthExpenses = filteredExpenses.filter(e => e.date >= monthStartStr && e.date <= monthEndStr);
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // カテゴリ別集計（当月分のみ）
  const categoryTotals = aggregateByCategory(monthExpenses);

  // 月の平均計算
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const daysForAverage = isCurrentMonth ? today.getDate() : lastDayOfMonth;
  const dailyAverage = daysForAverage > 0 ? Math.floor(monthTotal / daysForAverage) : 0;

  // 月予算との比較（特別な支出も含めるため、表示フィルタ前の全支出から集計する）
  const yearMonth = formatYearMonth(year, month);
  const monthBudget = useMonthBudget(yearMonth);
  const { total: fixedCostTotal } = useMonthlyFixedCosts(yearMonth);
  const monthTotalForBudget = allExpenses
    .filter(e => e.date >= monthStartStr && e.date <= monthEndStr)
    .reduce((sum, e) => sum + e.amount, 0);

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
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { md: 3 },
        p: { xs: 1, sm: 2, md: 3 },
        maxWidth: { md: 1400 },
        mx: 'auto',
      }}
    >
      {/* 左側: カレンダーエリア */}
      <Box sx={{ flex: { md: '1 1 auto' }, maxWidth: { md: 700 } }}>
        {/* 月切り替えヘッダー */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: { xs: 1, sm: 2 },
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: { xs: 1, sm: 0 },
          }}
        >
          {/* 月切り替え */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
            <IconButton onClick={goToPrevMonth} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                mx: { xs: 1, sm: 2 },
                minWidth: { xs: 100, sm: 120 },
                textAlign: 'center',
                fontSize: { xs: '1rem', sm: '1.25rem' },
              }}
            >
              {year}年{month + 1}月
            </Typography>
            <IconButton onClick={goToNextMonth} size="small">
              <ChevronRightIcon />
            </IconButton>
            <Tooltip title="今日にジャンプ">
              <IconButton onClick={goToToday} size="small" color="primary">
                <MyLocationIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

        </Box>

        {/* 特別な支出フィルタ */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 1, sm: 2 } }}>
          <FormControlLabel
            control={
              <Switch
                checked={excludeSpecial}
                onChange={(e) => setExcludeSpecial(e.target.checked)}
                size="small"
              />
            }
            label="特別な支出を除く"
            sx={{ mb: 0 }}
          />
        </Box>

        {/* 月合計（モバイルのみ表示） */}
        {!isDesktop && (
          <Typography
            variant="body1"
            align="center"
            sx={{
              mb: { xs: 1, sm: 2 },
              fontWeight: 'bold',
              fontSize: { xs: '0.95rem', sm: '1rem' },
            }}
          >
            今月合計: {formatCurrency(monthTotal)}
          </Typography>
        )}

        {/* 月予算パネル（モバイルのみ。PC版はサマリーパネル内に表示） */}
        {!isDesktop && (
          <Box sx={{ mb: { xs: 1, sm: 2 } }}>
            <MonthBudgetPanel
              budget={monthBudget}
              variableSpent={monthTotalForBudget}
              fixedCostTotal={fixedCostTotal}
              daysElapsed={daysForAverage}
              daysInMonth={lastDayOfMonth}
              isCurrentMonth={isCurrentMonth}
              onEditBudget={() => setMonthBudgetDialogOpen(true)}
            />
          </Box>
        )}

        {/* カレンダーグリッド */}
        <CalendarGrid
          year={year}
          month={month}
          expenses={filteredExpenses}
          specialDates={specialDates}
          onDateClick={(dateStr) => setSelectedDate(dateStr)}
          onWeekBudgetClick={(weekStart) => setSelectedWeekStart(weekStart)}
        />
      </Box>

      {/* 右側: サマリーパネル（PC版のみ） */}
      {isDesktop && (
        <Box sx={{ flex: '0 0 320px' }}>
          <Paper sx={{ p: 2, position: 'sticky', top: 16 }}>
            <Typography variant="h6" gutterBottom>
              {month + 1}月の統計
            </Typography>

            <Divider sx={{ mb: 2 }} />

            {/* 月予算パネル */}
            <Box sx={{ mb: 2 }}>
              <MonthBudgetPanel
                budget={monthBudget}
                variableSpent={monthTotalForBudget}
                fixedCostTotal={fixedCostTotal}
                daysElapsed={daysForAverage}
                daysInMonth={lastDayOfMonth}
                isCurrentMonth={isCurrentMonth}
                onEditBudget={() => setMonthBudgetDialogOpen(true)}
              />
            </Box>

            {/* 月合計・平均 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {formatCurrency(monthTotal)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                月合計
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                1日平均: {formatCurrency(dailyAverage)}
              </Typography>
            </Box>

            {/* カテゴリ別ドーナツチャート（凡例にラベル・金額・割合を含む） */}
            {categoryTotals.size > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  ジャンル別
                </Typography>
                <CategoryDonutChart categoryTotals={categoryTotals} total={monthTotal} />
              </>
            )}
          </Paper>
        </Box>
      )}

      {/* 入力/編集ダイアログ（◀▶で日を移動しながら連続入力できる） */}
      <ExpenseDialog
        open={selectedDate !== null}
        date={selectedDate ?? ''}
        onClose={() => setSelectedDate(null)}
        onNavigateDate={setSelectedDate}
      />

      {/* 週予算設定ダイアログ */}
      <WeekBudgetDialog
        open={selectedWeekStart !== null}
        weekStart={selectedWeekStart ?? ''}
        onClose={() => setSelectedWeekStart(null)}
      />

      {/* 月予算設定ダイアログ */}
      <MonthBudgetDialog
        open={monthBudgetDialogOpen}
        yearMonth={yearMonth}
        onClose={() => setMonthBudgetDialogOpen(false)}
      />
    </Box>
  );
}
