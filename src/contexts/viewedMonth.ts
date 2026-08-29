import { createContext, useContext } from 'react';

// カレンダーとサマリー（月次）で共有する「表示中の年月」
export interface ViewedMonthValue {
  year: number;
  /** 0-indexed（0=1月） */
  month: number;
  setViewedMonth: (year: number, month: number) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  /** 今月に戻す */
  goToCurrentMonth: () => void;
  /** 表示中の年月が今月かどうか */
  isCurrentMonth: boolean;
}

export const ViewedMonthContext = createContext<ViewedMonthValue | null>(null);

// 表示中の年月を取得する。Provider配下でのみ使える
export function useViewedMonth(): ViewedMonthValue {
  const value = useContext(ViewedMonthContext);
  if (value === null) {
    throw new Error('useViewedMonth must be used within ViewedMonthProvider');
  }
  return value;
}
