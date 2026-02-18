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
// すべてのマスに実際のDateオブジェクトを返す（月をまたぐ週の合計計算に必要）
export function getMonthDays(year: number, month: number): Date[] {
  // month は 0-indexed (0=1月)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 月曜始まりの曜日インデックス (月=0, 火=1, ... 日=6)
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;

  const days: Date[] = [];

  // 前月のパディング（実際の日付を返す）
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // 当月の日付
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // 次月のパディング（6行=42マスになるまで）
  let nextDay = 1;
  while (days.length < 42) {
    days.push(new Date(year, month + 1, nextDay++));
  }

  return days;
}

// 日付が指定月に属するかどうかを判定
export function isInMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
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

// 指定の週開始日（月曜YYYY-MM-DD）から、今日を含む残り日数を返す
// 過去の週 → 0、未来の週 → 7
export function getRemainingDaysInWeek(weekStart: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // 日曜日

  if (today > end) return 0; // 過去の週
  if (today < start) return 7; // 未来の週

  // 今日から日曜日までの日数（今日を含む）
  return Math.floor((end.getTime() - today.getTime()) / 86400000) + 1;
}
