import { useState } from 'react';
import { Box, IconButton, Typography, ToggleButton, ToggleButtonGroup, Tooltip, useMediaQuery, useTheme, Paper, Divider, List, ListItem, ListItemText, FormControlLabel, Switch } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { CalendarGrid } from './CalendarGrid';
import { ExpenseDialog } from '../ExpenseDialog/ExpenseDialog';
import { WeekBudgetDialog } from './WeekBudgetDialog';
import { useExpensesByDateRange } from '../../hooks/useExpenses';
import { getMonthDays, toDateString } from '../../utils/date';
import { formatCurrency } from '../../utils/format';
import { aggregateByCategory } from '../../utils/chart';
import { CategoryDonutChart } from '../Summary/CategoryDonutChart';
import type { CalendarViewMode } from '../../types';

interface CalendarViewProps {
  onDataChanged?: () => void;
}

export function CalendarView({ onDataChanged }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('weekly');
  const [excludeSpecial, setExcludeSpecial] = useState(false);
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

          {/* モード切り替え */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ToggleButtonGroup
              size="small"
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
            >
              <ToggleButton value="weekly">
                <ViewWeekIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="current-week">
                <TodayIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="simple">
                <CalendarMonthIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>

            {/* 特別な支出フィルタ */}
            <FormControlLabel
              control={
                <Switch
                  checked={excludeSpecial}
                  onChange={(e) => setExcludeSpecial(e.target.checked)}
                  size="small"
                />
              }
              label="特別な支出を除く"
              sx={{ ml: 1, mb: 0 }}
            />
          </Box>
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

        {/* カレンダーグリッド */}
        <CalendarGrid
          year={year}
          month={month}
          expenses={filteredExpenses}
          onDateClick={(dateStr) => setSelectedDate(dateStr)}
          onWeekBudgetClick={(weekStart) => setSelectedWeekStart(weekStart)}
          viewMode={viewMode}
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

            {/* カテゴリ別ドーナツチャート */}
            {categoryTotals.size > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  ジャンル別
                </Typography>
                <CategoryDonutChart categoryTotals={categoryTotals} total={monthTotal} />
              </>
            )}

            {/* カテゴリ別リスト */}
            {categoryTotals.size > 0 && (
              <List dense sx={{ mt: 1 }}>
                {Array.from(categoryTotals.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([category, amount]) => {
                    const percentage = monthTotal > 0 ? Math.round((amount / monthTotal) * 100) : 0;
                    return (
                      <ListItem key={category} sx={{ px: 0 }}>
                        <ListItemText
                          primary={category}
                          secondary={`${percentage}%`}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(amount)}
                        </Typography>
                      </ListItem>
                    );
                  })}
              </List>
            )}
          </Paper>
        </Box>
      )}

      {/* 入力/編集ダイアログ */}
      <ExpenseDialog
        open={selectedDate !== null}
        date={selectedDate ?? ''}
        onClose={() => setSelectedDate(null)}
      />

      {/* 週予算設定ダイアログ */}
      <WeekBudgetDialog
        open={selectedWeekStart !== null}
        weekStart={selectedWeekStart ?? ''}
        onClose={() => setSelectedWeekStart(null)}
        onDataChanged={onDataChanged}
      />
    </Box>
  );
}
