import { Box, Typography, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { formatCurrency } from '../../utils/format';
import { getRemainingDaysInWeek } from '../../utils/date';

interface WeekSummaryRowProps {
  weekStart: string; // 週開始日（YYYY-MM-DD）
  weekTotal: number; // 週合計金額
  weekBudget: number | null; // 週予算（null = 未設定）
  todaySpent: number; // 今日の支出合計
  isCurrentWeek: boolean; // 今週かどうか
  onBudgetClick: () => void; // 予算設定ボタンクリック時のハンドラー
}

export function WeekSummaryRow({
  weekStart,
  weekTotal,
  weekBudget,
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

  if (weekBudget !== null) {
    const remaining = weekBudget - weekTotal;
    if (remaining >= 0) {
      budgetText = ` | 予算まであと${formatCurrency(remaining)}`;
      // 残り予算があり、残り日数がある場合のみ1日あたりを表示
      if (remainingDays > 0) {
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
    } else {
      budgetText = ` | 予算超過: ${formatCurrency(Math.abs(remaining))}`;
      budgetColor = 'error.main';
      backgroundColor = 'error.light'; // 予算超過時は薄い赤背景
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
