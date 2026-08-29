import { Box, Typography, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { formatCurrency } from '../../utils/format';
import { getRemainingDaysInWeek } from '../../utils/date';

interface WeekSummaryRowProps {
  weekStart: string; // 週開始日（YYYY-MM-DD）
  weekTotal: number; // 週合計金額（表示中のフィルタ適用後）
  weekTotalWithSpecial: number; // 特別な支出を含む週合計（予算超過判定用）
  weekTotalWithoutSpecial: number; // 特別な支出を除いた週合計（予算超過判定用）
  weekBudget: number | null; // 週予算（null = 未設定）
  weekPlanned: number; // この週にこれから使う予定の合計（今日以降の未消化分）
  todaySpent: number; // 今日の支出合計
  isCurrentWeek: boolean; // 今週かどうか
  onBudgetClick: () => void; // 予算設定ボタンクリック時のハンドラー
}

export function WeekSummaryRow({
  weekStart,
  weekTotal,
  weekTotalWithSpecial,
  weekTotalWithoutSpecial,
  weekBudget,
  weekPlanned,
  todaySpent,
  isCurrentWeek,
  onBudgetClick,
}: WeekSummaryRowProps) {
  // 予算との差分計算と背景色の判定
  let budgetText = '';
  let budgetColor = 'text.secondary';
  let backgroundColor = 'action.hover'; // デフォルト背景色

  // 1日あたり使える金額の計算
  let dailyBudgetText = '';
  let todayRemainingText = '';
  let todayRemainingColor = 'success.main';
  const remainingDays = getRemainingDaysInWeek(weekStart);

  // 予定を差し引いた「自由に使えるお金」
  let freeText = '';
  let freeColor = 'success.main';

  if (weekBudget !== null) {
    const remaining = weekBudget - weekTotal;
    // 超過判定は表示フィルタと独立に行う:
    // - 特別な支出を除いても超過 → 赤（本当に使いすぎ）
    // - 特別な支出を含めた場合のみ超過 → オレンジ（特別な支出による超過）
    const isOverWithoutSpecial = weekTotalWithoutSpecial > weekBudget;
    const isOverWithSpecial = weekTotalWithSpecial > weekBudget;

    if (isOverWithoutSpecial) {
      budgetText = ` | 予算超過: ${formatCurrency(Math.abs(remaining))}`;
      budgetColor = 'error.main';
      backgroundColor = 'error.light'; // 予算超過時は薄い赤背景
    } else if (isOverWithSpecial) {
      budgetText = ` | 特別込みで超過: ${formatCurrency(weekTotalWithSpecial - weekBudget)}`;
      budgetColor = 'warning.dark';
      backgroundColor = 'warning.light'; // 特別な支出による超過はオレンジ背景
    } else if (remaining >= 0) {
      budgetText = ` | 予算まであと${formatCurrency(remaining)}`;
    }

    // 予定を入れている週は、予定を除いて自由に使える額を出す
    if (weekPlanned > 0) {
      const free = remaining - weekPlanned;
      freeText = `予定 ${formatCurrency(weekPlanned)} を除くと: ${formatCurrency(free)}`;
      if (free < 0) {
        freeColor = 'error.main';
      }
    }

    // 表示中の合計が予算内なら1日あたりの目安を表示（オレンジ表示時も計画は立てられる）
    if (!isOverWithoutSpecial && remaining >= 0 && remainingDays > 0) {
      const dailyAmount = Math.floor(remaining / remainingDays);
      dailyBudgetText = `1日あたり: ${formatCurrency(dailyAmount)}（残り${remainingDays}日）`;

      // 今週の場合、今日の残り予算を表示
      if (isCurrentWeek) {
        const spentBeforeToday = weekTotal - todaySpent;
        const dailyAllocation = Math.floor((weekBudget - spentBeforeToday) / remainingDays);
        const todayRemaining = dailyAllocation - todaySpent;
        todayRemainingText = `今日の残り: ${formatCurrency(todayRemaining)}`;
        if (todayRemaining < 0) {
          todayRemainingColor = 'error.main';
        }
      }
    }
  }

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 1.5 },
        py: { xs: 0.5, sm: 0.75 },
        backgroundColor: backgroundColor,
        borderRadius: 1,
        mt: { xs: 0.5, sm: 0.75 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          variant="caption"
          sx={{
            fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
            color: 'text.primary',
          }}
        >
          週合計: {formatCurrency(weekTotal)}
          {budgetText && (
            <span style={{ color: budgetColor }}>{budgetText}</span>
          )}
        </Typography>
        <IconButton size="small" onClick={onBudgetClick} sx={{ p: { xs: 0.5, sm: 0.75 } }}>
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Box>
      {dailyBudgetText && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'bold',
            color: 'primary.main',
            fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' },
            mt: 0.25,
          }}
        >
          {dailyBudgetText}
        </Typography>
      )}
      {freeText && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'bold',
            color: freeColor,
            fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' },
            mt: 0.25,
          }}
        >
          {freeText}
        </Typography>
      )}
      {todayRemainingText && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'bold',
            color: todayRemainingColor,
            fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' },
            mt: 0.25,
          }}
        >
          {todayRemainingText}
        </Typography>
      )}
    </Box>
  );
}
