import { useState } from 'react';
import { Box, IconButton, Typography, Tooltip, useMediaQuery, useTheme, Paper, Divider, ToggleButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { CalendarGrid } from './CalendarGrid';
import { ExpenseDialog } from '../ExpenseDialog/ExpenseDialog';
import { WeekBudgetDialog } from './WeekBudgetDialog';
import { MonthBudgetDialog } from './MonthBudgetDialog';
import { MonthBudgetPanel } from './MonthBudgetPanel';
import { useExpensesByDateRange } from '../../hooks/useExpenses';
import { useMonthBudget } from '../../hooks/useMonthBudget';
import { useDayMemosByDateRange } from '../../hooks/useDayMemo';
import { useMonthlyFixedCosts } from '../../hooks/useFixedCosts';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useViewedMonth } from '../../contexts/viewedMonth';
import { getMonthDays, toDateString } from '../../utils/date';
import { formatYearMonth } from '../../utils/fixedCost';
import { formatCurrency } from '../../utils/format';
import { aggregateByCategory } from '../../utils/chart';
import { CategoryDonutChart } from '../Summary/CategoryDonutChart';

export function CalendarView() {
  const today = new Date();
  // 表示中の年月はサマリー（月次）と共有する（タブを切り替えても月が維持される）
  const { year, month, goToPrevMonth, goToNextMonth, goToCurrentMonth, isCurrentMonth } =
    useViewedMonth();
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

  // メモがある日付（カレンダーにマークを表示する）
  const dayMemos = useDayMemosByDateRange(calendarStart, calendarEnd);
  const memoDates = new Set(dayMemos.map(m => m.date));

  // 月合計・カテゴリ集計は当月分のみ
  const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-31`;
  const monthExpenses = filteredExpenses.filter(e => e.date >= monthStartStr && e.date <= monthEndStr);
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // カテゴリ別集計（当月分のみ）
  const categoryTotals = aggregateByCategory(monthExpenses);

  // 月の平均計算
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const daysForAverage = isCurrentMonth ? today.getDate() : lastDayOfMonth;
  const dailyAverage = daysForAverage > 0 ? Math.floor(monthTotal / daysForAverage) : 0;

  // 月予算との比較（特別な支出も含めるため、表示フィルタ前の全支出から集計する）
  const yearMonth = formatYearMonth(year, month);
  const monthBudget = useMonthBudget(yearMonth);
  const { total: fixedCostTotal } = useMonthlyFixedCosts(yearMonth);
  const monthTotalForBudget = allExpenses
    .filter(e => e.date >= monthStartStr && e.date <= monthEndStr)
    .reduce((sum, e) => sum + e.amount, 0);

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
        {/* 月切り替え + 特別な支出フィルタ（1行に統合） */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: { xs: 1, sm: 2 },
          }}
        >
          {/* 月切り替え */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={goToPrevMonth} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                mx: { xs: 0.5, sm: 2 },
                minWidth: { xs: 96, sm: 120 },
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
              <IconButton onClick={goToCurrentMonth} size="small" color="primary">
                <MyLocationIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* 特別な支出フィルタ（⭐️トグル。特別な支出のマーカーと同じwarning色） */}
          <Tooltip title="特別な支出を除いて表示">
            <ToggleButton
              value="excludeSpecial"
              selected={excludeSpecial}
              onChange={() => setExcludeSpecial(!excludeSpecial)}
              size="small"
              color="warning"
              sx={{
                px: 1,
                py: 0.5,
                textTransform: 'none',
                lineHeight: 1,
                borderColor: 'warning.main',
                '&.Mui-selected': { borderColor: 'warning.main' },
              }}
            >
              {excludeSpecial ? (
                <StarIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'warning.main' }} />
              ) : (
                <StarBorderIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'warning.main' }} />
              )}
              <Typography variant="caption">特別を除く</Typography>
            </ToggleButton>
          </Tooltip>
        </Box>

        {/* 月予算パネル（モバイルのみ。PC版はサマリーパネル内に表示）
            スクロールしても見えるように画面上部に固定表示する */}
        {!isDesktop && (
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              backgroundColor: 'background.default',
              pt: 0.5,
              mt: -0.5,
              pb: { xs: 1, sm: 2 },
            }}
          >
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
          allExpenses={allExpenses}
          specialDates={specialDates}
          memoDates={memoDates}
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

            {/* 月予算パネル（今月合計を含む） */}
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
