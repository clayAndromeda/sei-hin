import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  toDateString,
  formatDateJP,
  getMonthDays,
  isInMonth,
  getWeekRange,
  getWeekStartString,
  isSameDay,
  isFutureDate,
  WEEKDAY_LABELS,
} from './date';

describe('toDateString', () => {
  it('日付をYYYY-MM-DD形式に変換する', () => {
    expect(toDateString(new Date(2026, 1, 14))).toBe('2026-02-14');
  });

  it('月・日が1桁の場合ゼロパディングする', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('12月31日を正しく変換する', () => {
    expect(toDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('1月1日を正しく変換する', () => {
    expect(toDateString(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('formatDateJP', () => {
  it('日付を日本語形式に変換する', () => {
    expect(formatDateJP(new Date(2026, 1, 14))).toBe('2026年2月14日');
  });

  it('1月1日を正しくフォーマットする', () => {
    expect(formatDateJP(new Date(2026, 0, 1))).toBe('2026年1月1日');
  });

  it('12月31日を正しくフォーマットする', () => {
    expect(formatDateJP(new Date(2026, 11, 31))).toBe('2026年12月31日');
  });
});

describe('getMonthDays', () => {
  it('42日分の配列を返す', () => {
    const days = getMonthDays(2026, 1); // 2026年2月
    expect(days).toHaveLength(42);
  });

  it('全要素がDateオブジェクトである', () => {
    const days = getMonthDays(2026, 1);
    days.forEach((d) => expect(d).toBeInstanceOf(Date));
  });

  it('最初の日が月曜日である（月曜始まり）', () => {
    const days = getMonthDays(2026, 1); // 2026年2月
    // getDay(): 0=日, 1=月, ..., 6=土
    expect(days[0].getDay()).toBe(1); // 月曜日
  });

  it('各週の最初の日が月曜日である', () => {
    const days = getMonthDays(2026, 5); // 2026年6月
    for (let week = 0; week < 6; week++) {
      expect(days[week * 7].getDay()).toBe(1); // 月曜日
    }
  });

  it('当月の1日が含まれる', () => {
    const days = getMonthDays(2026, 1);
    const hasFirst = days.some(
      (d) => d.getFullYear() === 2026 && d.getMonth() === 1 && d.getDate() === 1,
    );
    expect(hasFirst).toBe(true);
  });

  it('当月の最終日が含まれる', () => {
    const days = getMonthDays(2026, 1); // 2026年2月 → 28日
    const hasLast = days.some(
      (d) => d.getFullYear() === 2026 && d.getMonth() === 1 && d.getDate() === 28,
    );
    expect(hasLast).toBe(true);
  });

  it('月曜始まりの月（2026年6月は月曜日始まり）で前月パディングがない', () => {
    // 2026年6月1日 = 月曜日
    const days = getMonthDays(2026, 5);
    expect(days[0].getFullYear()).toBe(2026);
    expect(days[0].getMonth()).toBe(5);
    expect(days[0].getDate()).toBe(1);
  });
});

describe('isInMonth', () => {
  it('同じ月に属する場合trueを返す', () => {
    expect(isInMonth(new Date(2026, 1, 14), 2026, 1)).toBe(true);
  });

  it('異なる月の場合falseを返す', () => {
    expect(isInMonth(new Date(2026, 0, 31), 2026, 1)).toBe(false);
  });

  it('異なる年の場合falseを返す', () => {
    expect(isInMonth(new Date(2025, 1, 14), 2026, 1)).toBe(false);
  });

  it('月初の日付を正しく判定する', () => {
    expect(isInMonth(new Date(2026, 1, 1), 2026, 1)).toBe(true);
  });

  it('月末の日付を正しく判定する', () => {
    expect(isInMonth(new Date(2026, 1, 28), 2026, 1)).toBe(true);
  });
});

describe('getWeekRange', () => {
  it('水曜日を渡すとその週の月曜〜日曜を返す', () => {
    // 2026-02-11 は水曜日
    const { start, end } = getWeekRange(new Date(2026, 1, 11));
    expect(start.getDay()).toBe(1); // 月曜日
    expect(end.getDay()).toBe(0); // 日曜日
    expect(toDateString(start)).toBe('2026-02-09');
    expect(toDateString(end)).toBe('2026-02-15');
  });

  it('月曜日を渡すと同じ月曜日が開始日になる', () => {
    // 2026-02-09 は月曜日
    const { start } = getWeekRange(new Date(2026, 1, 9));
    expect(toDateString(start)).toBe('2026-02-09');
  });

  it('日曜日を渡すとその週の月曜日が開始日になる', () => {
    // 2026-02-15 は日曜日
    const { start, end } = getWeekRange(new Date(2026, 1, 15));
    expect(toDateString(start)).toBe('2026-02-09');
    expect(toDateString(end)).toBe('2026-02-15');
  });

  it('月をまたぐ週を正しく処理する', () => {
    // 2026-03-01 は日曜日
    const { start, end } = getWeekRange(new Date(2026, 2, 1));
    expect(start.getMonth()).toBe(1); // 2月
    expect(end.getMonth()).toBe(2); // 3月
  });
});

describe('getWeekStartString', () => {
  it('週の開始日をYYYY-MM-DD形式で返す', () => {
    // 2026-02-11（水曜日）→ 2026-02-09（月曜日）
    expect(getWeekStartString(new Date(2026, 1, 11))).toBe('2026-02-09');
  });

  it('月曜日を渡すとその日を返す', () => {
    expect(getWeekStartString(new Date(2026, 1, 9))).toBe('2026-02-09');
  });
});

describe('WEEKDAY_LABELS', () => {
  it('月曜始まりの7つの曜日ラベルを持つ', () => {
    expect(WEEKDAY_LABELS).toEqual(['月', '火', '水', '木', '金', '土', '日']);
    expect(WEEKDAY_LABELS).toHaveLength(7);
  });
});

describe('isSameDay', () => {
  it('同じ日付の場合trueを返す', () => {
    expect(isSameDay(new Date(2026, 1, 14), new Date(2026, 1, 14))).toBe(true);
  });

  it('時刻が異なっても同じ日ならtrueを返す', () => {
    const a = new Date(2026, 1, 14, 0, 0, 0);
    const b = new Date(2026, 1, 14, 23, 59, 59);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('異なる日付の場合falseを返す', () => {
    expect(isSameDay(new Date(2026, 1, 14), new Date(2026, 1, 15))).toBe(false);
  });

  it('異なる月の場合falseを返す', () => {
    expect(isSameDay(new Date(2026, 0, 14), new Date(2026, 1, 14))).toBe(false);
  });

  it('異なる年の場合falseを返す', () => {
    expect(isSameDay(new Date(2025, 1, 14), new Date(2026, 1, 14))).toBe(false);
  });
});

describe('isFutureDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('未来の日付の場合trueを返す', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 14));
    expect(isFutureDate(new Date(2026, 1, 15))).toBe(true);
  });

  it('過去の日付の場合falseを返す', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 14));
    expect(isFutureDate(new Date(2026, 1, 13))).toBe(false);
  });

  it('今日の日付の場合falseを返す', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 14, 12, 0, 0));
    expect(isFutureDate(new Date(2026, 1, 14))).toBe(false);
  });
});
