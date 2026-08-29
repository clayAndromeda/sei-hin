import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { shiftMonth } from '../utils/date';
import { ViewedMonthContext, type ViewedMonthValue } from './viewedMonth';

// 表示中の年月をアプリ全体で共有する。
// タブを切り替えても（カレンダー ⇔ サマリー月次）見ていた月が維持される。
// 起動時は常に今月から始める（古い月を復元してしまうため永続化はしない）
export function ViewedMonthProvider({ children }: { children: ReactNode }) {
  const [{ year, month }, setState] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const setViewedMonth = useCallback((nextYear: number, nextMonth: number) => {
    setState({ year: nextYear, month: nextMonth });
  }, []);

  const goToPrevMonth = useCallback(() => {
    setState((prev) => shiftMonth(prev.year, prev.month, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setState((prev) => shiftMonth(prev.year, prev.month, 1));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    const now = new Date();
    setState({ year: now.getFullYear(), month: now.getMonth() });
  }, []);

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const value = useMemo<ViewedMonthValue>(
    () => ({
      year,
      month,
      setViewedMonth,
      goToPrevMonth,
      goToNextMonth,
      goToCurrentMonth,
      isCurrentMonth,
    }),
    [
      year,
      month,
      isCurrentMonth,
      setViewedMonth,
      goToPrevMonth,
      goToNextMonth,
      goToCurrentMonth,
    ],
  );

  return (
    <ViewedMonthContext.Provider value={value}>
      {children}
    </ViewedMonthContext.Provider>
  );
}
