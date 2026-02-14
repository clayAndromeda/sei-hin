// 日付を "YYYY-MM-DD" 形式に変換
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 日付を "2026年2月14日" 形式に変換
export function formatDateJP(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 月のカレンダーグリッド用日付配列を返す（月曜始まり）
// 前月・次月のパディング含む6週分（42日）の配列
export function getMonthDays(year: number, month: number): (Date | null)[] {
  // month は 0-indexed (0=1月)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 月曜始まりの曜日インデックス (月=0, 火=1, ... 日=6)
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;

  const days: (Date | null)[] = [];

  // 前月のパディング
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }

  // 当月の日付
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // 次月のパディング（6行=42マスになるまで）
  while (days.length < 42) {
    days.push(null);
  }

  return days;
}

// 指定日を含む月曜始まりの週の開始日（月曜）と終了日（日曜）を返す
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const mondayOffset = (day + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

// 指定日を含む週の開始日（月曜日）を "YYYY-MM-DD" 形式で返す
export function getWeekStartString(date: Date): string {
  const { start } = getWeekRange(date);
  return toDateString(start);
}

// 曜日ラベル（月曜始まり）
export const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'] as const;

// 2つの日付が同じ日かどうかを判定
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 日付が今日より未来かどうか
export function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target > today;
}
