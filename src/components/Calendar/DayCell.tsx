import { ButtonBase, Typography } from '@mui/material';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import { formatCurrency } from '../../utils/format';
import { isFutureDate } from '../../utils/date';

interface DayCellProps {
  date: Date;
  amount: number;
  plannedAmount?: number; // その日に使う予定の金額（0なら予定なし）
  isToday: boolean;
  otherMonth?: boolean; // 表示中の月以外の日付
  hasSpecial?: boolean; // 特別な支出がある日（除外モードでも表示する）
  hasMemo?: boolean; // その日のメモがある日
  onClick: () => void;
}

export function DayCell({
  date,
  amount,
  plannedAmount = 0,
  isToday,
  otherMonth = false,
  hasSpecial = false,
  hasMemo = false,
  onClick,
}: DayCellProps) {
  const future = isFutureDate(date);
  // 予定は「これから使う分」なので、今日以降の日にだけ表示する
  const showPlan = plannedAmount > 0 && (future || isToday);

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        position: 'relative',
        aspectRatio: '1',
        minHeight: { xs: 48, sm: 56, md: 64 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        backgroundColor: isToday ? 'primary.light' : 'transparent',
        color: isToday ? 'primary.contrastText' : otherMonth ? 'text.disabled' : 'text.primary',
        opacity: otherMonth ? 0.4 : 1,
        border: isToday ? 2 : 0,
        borderColor: isToday ? 'primary.main' : 'transparent',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: isToday ? 'primary.main' : 'action.hover',
          transform: 'scale(1.02)',
        },
      }}
    >
      {hasMemo && (
        <StickyNote2Icon
          aria-label="メモあり"
          sx={{
            position: 'absolute',
            top: 2,
            left: 3,
            fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
            color: isToday ? 'inherit' : 'info.main',
          }}
        />
      )}
      {hasSpecial && (
        <Typography
          component="span"
          aria-label="特別な支出あり"
          sx={{
            position: 'absolute',
            top: 2,
            right: 4,
            fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
            lineHeight: 1,
            color: 'warning.main',
          }}
        >
          ★
        </Typography>
      )}
      <Typography
        variant="body2"
        fontWeight={isToday ? 'bold' : 'normal'}
        sx={{ fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' } }}
      >
        {date.getDate()}
      </Typography>
      {(!future || amount > 0) && (
        <Typography
          variant="caption"
          sx={{
            fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
            lineHeight: 1.2,
            color: isToday ? 'inherit' : future ? 'text.disabled' : 'text.secondary',
          }}
        >
          {formatCurrency(amount)}
        </Typography>
      )}
      {showPlan && (
        <Typography
          variant="caption"
          aria-label="使う予定"
          sx={{
            fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' },
            lineHeight: 1.2,
            color: isToday ? 'inherit' : 'info.main',
          }}
        >
          予{formatCurrency(plannedAmount)}
        </Typography>
      )}
    </ButtonBase>
  );
}
