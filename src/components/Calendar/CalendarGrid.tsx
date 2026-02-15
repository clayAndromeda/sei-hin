import { Box, Typography } from '@mui/material';
import { DayCell } from './DayCell';
import { WeekSummaryRow } from './WeekSummaryRow';
import { getMonthDays, isSameDay, WEEKDAY_LABELS, toDateString, getWeekStartString, isInMonth } from '../../utils/date';
import { useWeekBudget } from '../../hooks/useWeekBudget';
import type { Expense, CalendarViewMode } from '../../types';

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  expenses: Expense[];
  onDateClick: (dateString: string) => void;
  onWeekBudgetClick: (weekStart: string) => void; // 週予算設定ボタンクリック時
  viewMode: CalendarViewMode; // 表示モード
}

// 週ごとのデータ構造
interface WeekData {
  days: Date[]; // 7日分（前月・次月の日付も含む）
  weekStart: string; // 週開始日（月曜）のYYYY-MM-DD
}

export function CalendarGrid({ year, month, expenses, onDateClick, onWeekBudgetClick, viewMode }: CalendarGridProps) {
  const days = getMonthDays(year, month);
  const today = new Date();

  // 日付ごとの合計金額をMapで計算
  const dailyTotals = new Map<string, number>();
  for (const expense of expenses) {
    const current = dailyTotals.get(expense.date) ?? 0;
    dailyTotals.set(expense.date, current + expense.amount);
  }

  // 42マスを7日ずつ6週に分割
  const weeks: WeekData[] = [];
  for (let i = 0; i < 6; i++) {
    const weekDays = days.slice(i * 7, i * 7 + 7);
    const weekStart = getWeekStartString(weekDays[0]);
    weeks.push({ days: weekDays, weekStart });
  }

  // 当月に属する日付が1つもない週を除外
  const validWeeks = weeks.filter(w => w.days.some(d => isInMonth(d, year, month)));

  // モードに応じて表示する週をフィルタリング
  let displayWeeks = validWeeks;

  if (viewMode === 'current-week') {
    // 今日が表示中の月に含まれるかチェック
    const isTodayInCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    if (isTodayInCurrentMonth) {
      // 今日が含まれる週を表示
      const currentWeekStart = getWeekStartString(today);
      const currentWeek = validWeeks.find(w => w.weekStart === currentWeekStart);
      if (currentWeek) {
        displayWeeks = [currentWeek];
      }
    } else {
      // 今日が含まれない月の場合、表示中の月の最初の週を表示
      const firstWeekWithDates = validWeeks[0];
      if (firstWeekWithDates) {
        displayWeeks = [firstWeekWithDates];
      }
    }
  }

  return (
    <Box>
      {/* 曜日ヘッダー */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: { xs: 0.5, sm: 0.75, md: 1 },
          mb: { xs: 0.5, sm: 0.75 },
        }}
      >
        {WEEKDAY_LABELS.map((label) => (
          <Typography
            key={label}
            variant="caption"
            align="center"
            sx={{
              fontWeight: 'bold',
              color: 'text.secondary',
              fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
            }}
          >
            {label}
          </Typography>
        ))}
      </Box>

      {/* 週ごとのセクション */}
      {displayWeeks.map((week, weekIndex) => {
        // 週合計を計算（前月・次月の日付も含む）
        let weekTotal = 0;
        for (const date of week.days) {
          const dateStr = toDateString(date);
          weekTotal += dailyTotals.get(dateStr) ?? 0;
        }

        return (
          <WeekSection
            key={weekIndex}
            week={week}
            weekTotal={weekTotal}
            today={today}
            year={year}
            month={month}
            dailyTotals={dailyTotals}
            onDateClick={onDateClick}
            onWeekBudgetClick={onWeekBudgetClick}
            showSummary={viewMode !== 'simple'}
          />
        );
      })}
    </Box>
  );
}

// 週セクションコンポーネント（週予算を取得するためにフックを使用）
interface WeekSectionProps {
  week: WeekData;
  weekTotal: number;
  today: Date;
  year: number;
  month: number;
  dailyTotals: Map<string, number>;
  onDateClick: (dateString: string) => void;
  onWeekBudgetClick: (weekStart: string) => void;
  showSummary: boolean; // 週集計行を表示するか
}

function WeekSection({
  week,
  weekTotal,
  today,
  year,
  month,
  dailyTotals,
  onDateClick,
  onWeekBudgetClick,
  showSummary,
}: WeekSectionProps) {
  const weekBudget = useWeekBudget(week.weekStart);

  return (
    <Box sx={{ mb: { xs: 1, sm: 1.5 } }}>
      {/* 日付グリッド（7マス） */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: { xs: 0.5, sm: 0.75, md: 1 },
        }}
      >
        {week.days.map((date, dayIndex) => {
          const dateStr = toDateString(date);
          const amount = dailyTotals.get(dateStr) ?? 0;
          const isToday = isSameDay(date, today);
          const otherMonth = !isInMonth(date, year, month);

          return (
            <DayCell
              key={dayIndex}
              date={date}
              amount={amount}
              isToday={isToday}
              otherMonth={otherMonth}
              onClick={() => onDateClick(dateStr)}
            />
          );
        })}
      </Box>

      {/* 週集計行（シンプルモード以外で表示） */}
      {showSummary && (
        <WeekSummaryRow
          weekStart={week.weekStart}
          weekTotal={weekTotal}
          weekBudget={weekBudget}
          onBudgetClick={() => onWeekBudgetClick(week.weekStart)}
        />
      )}
    </Box>
  );
}
