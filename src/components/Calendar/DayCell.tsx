import { ButtonBase, Typography } from '@mui/material';
import { formatCurrency } from '../../utils/format';
import { isFutureDate } from '../../utils/date';

interface DayCellProps {
  date: Date;
  amount: number;
  isToday: boolean;
  otherMonth?: boolean; // 表示中の月以外の日付
  onClick: () => void;
}

export function DayCell({ date, amount, isToday, otherMonth = false, onClick }: DayCellProps) {
  const future = isFutureDate(date);

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
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
      <Typography
        variant="body2"
        fontWeight={isToday ? 'bold' : 'normal'}
        sx={{ fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' } }}
      >
        {date.getDate()}
      </Typography>
      {!future && (
        <Typography
          variant="caption"
          sx={{
            fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
            lineHeight: 1.2,
            color: isToday ? 'inherit' : 'text.secondary',
          }}
        >
          {formatCurrency(amount)}
        </Typography>
      )}
    </ButtonBase>
  );
}
