import { Box, Typography } from '@mui/material';
import { DayCell } from './DayCell';
import { WeekSummaryRow } from './WeekSummaryRow';
import { getMonthDays, isSameDay, WEEKDAY_LABELS, toDateString, getWeekStartString, isInMonth } from '../../utils/date';
import { useWeekBudget } from '../../hooks/useWeekBudget';
import { sumUpcomingPlans } from '../../utils/budget';
import type { DayPlan, Expense } from '../../types';

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  expenses: Expense[];
  allExpenses: Expense[]; // フィルタ前の全支出（特別な支出込みの予算超過判定用）
  specialDates: Set<string>; // 特別な支出がある日付（除外モードでもマーカー表示するためフィルタ前の全支出から算出）
  memoDates: Set<string>; // その日のメモがある日付（マーカー表示用）
  dayPlans: DayPlan[]; // 各日に使う予定（カレンダー表示範囲分）
  onDateClick: (dateString: string) => void;
  onWeekBudgetClick: (weekStart: string) => void; // 週予算設定ボタンクリック時
}

// 週ごとのデータ構造
interface WeekData {
  days: Date[]; // 7日分（前月・次月の日付も含む）
  weekStart: string; // 週開始日（月曜）のYYYY-MM-DD
}

export function CalendarGrid({ year, month, expenses, allExpenses, specialDates, memoDates, dayPlans, onDateClick, onWeekBudgetClick }: CalendarGridProps) {
  const days = getMonthDays(year, month);
  const today = new Date();

  // 日付ごとの合計金額をMapで計算
  const dailyTotals = new Map<string, number>();
  for (const expense of expenses) {
    const current = dailyTotals.get(expense.date) ?? 0;
    dailyTotals.set(expense.date, current + expense.amount);
  }

  // 予算超過判定用: 特別な支出を含む/除いた日別合計（表示フィルタとは独立）
  const dailyTotalsWithSpecial = new Map<string, number>();
  const dailyTotalsWithoutSpecial = new Map<string, number>();
  for (const expense of allExpenses) {
    dailyTotalsWithSpecial.set(
      expense.date,
      (dailyTotalsWithSpecial.get(expense.date) ?? 0) + expense.amount,
    );
    if (!expense.isSpecial) {
      dailyTotalsWithoutSpecial.set(
        expense.date,
        (dailyTotalsWithoutSpecial.get(expense.date) ?? 0) + expense.amount,
      );
    }
  }

  // 日付ごとの予定金額
  const plannedAmounts = new Map<string, number>();
  for (const plan of dayPlans) {
    plannedAmounts.set(plan.date, plan.amount);
  }

  // 42マスを7日ずつ6週に分割
  const weeks: WeekData[] = [];
  for (let i = 0; i < 6; i++) {
    const weekDays = days.slice(i * 7, i * 7 + 7);
    const weekStart = getWeekStartString(weekDays[0]);
    weeks.push({ days: weekDays, weekStart });
  }

  // 当月に属する日付が1つもない週を除外
  const displayWeeks = weeks.filter(w => w.days.some(d => isInMonth(d, year, month)));

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
        let weekTotalWithSpecial = 0;
        let weekTotalWithoutSpecial = 0;
        for (const date of week.days) {
          const dateStr = toDateString(date);
          weekTotal += dailyTotals.get(dateStr) ?? 0;
          weekTotalWithSpecial += dailyTotalsWithSpecial.get(dateStr) ?? 0;
          weekTotalWithoutSpecial += dailyTotalsWithoutSpecial.get(dateStr) ?? 0;
        }

        return (
          <WeekSection
            key={weekIndex}
            week={week}
            weekTotal={weekTotal}
            weekTotalWithSpecial={weekTotalWithSpecial}
            weekTotalWithoutSpecial={weekTotalWithoutSpecial}
            today={today}
            year={year}
            month={month}
            dailyTotals={dailyTotals}
            dailyTotalsWithSpecial={dailyTotalsWithSpecial}
            plannedAmounts={plannedAmounts}
            specialDates={specialDates}
            memoDates={memoDates}
            onDateClick={onDateClick}
            onWeekBudgetClick={onWeekBudgetClick}
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
  weekTotalWithSpecial: number; // 特別な支出を含む週合計（予算超過判定用）
  weekTotalWithoutSpecial: number; // 特別な支出を除いた週合計（予算超過判定用）
  today: Date;
  year: number;
  month: number;
  dailyTotals: Map<string, number>;
  dailyTotalsWithSpecial: Map<string, number>; // 予定の消化判定に使う実績（フィルタと独立）
  plannedAmounts: Map<string, number>; // 日別の使う予定金額
  specialDates: Set<string>;
  memoDates: Set<string>;
  onDateClick: (dateString: string) => void;
  onWeekBudgetClick: (weekStart: string) => void;
}

function WeekSection({
  week,
  weekTotal,
  weekTotalWithSpecial,
  weekTotalWithoutSpecial,
  today,
  year,
  month,
  dailyTotals,
  dailyTotalsWithSpecial,
  plannedAmounts,
  specialDates,
  memoDates,
  onDateClick,
  onWeekBudgetClick,
}: WeekSectionProps) {
  const weekBudget = useWeekBudget(week.weekStart);
  const todayStr = toDateString(today);
  const todaySpent = dailyTotals.get(todayStr) ?? 0;
  const isCurrentWeek = getWeekStartString(today) === week.weekStart;

  // この週にこれから使う予定の合計（今日の分は使った額を差し引く）
  const weekPlanned = sumUpcomingPlans({
    plans: Array.from(plannedAmounts, ([date, amount]) => ({ date, amount })),
    spentByDate: dailyTotalsWithSpecial,
    todayString: todayStr,
    startDate: week.weekStart,
    endDate: toDateString(week.days[6]),
  });

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
              hasSpecial={specialDates.has(dateStr)}
              hasMemo={memoDates.has(dateStr)}
              plannedAmount={plannedAmounts.get(dateStr) ?? 0}
              onClick={() => onDateClick(dateStr)}
            />
          );
        })}
      </Box>

      {/* 週集計行 */}
      <WeekSummaryRow
          weekStart={week.weekStart}
          weekTotal={weekTotal}
          weekTotalWithSpecial={weekTotalWithSpecial}
          weekTotalWithoutSpecial={weekTotalWithoutSpecial}
          weekBudget={weekBudget}
          weekPlanned={weekPlanned}
          todaySpent={todaySpent}
          isCurrentWeek={isCurrentWeek}
          onBudgetClick={() => onWeekBudgetClick(week.weekStart)}
        />
    </Box>
  );
}
