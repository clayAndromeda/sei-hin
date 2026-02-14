import { IconButton, ListItem, ListItemText, Chip, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Expense } from '../../types';
import { formatCurrency } from '../../utils/format';
import { getCategoryById } from '../../constants/categories';

interface ExpenseItemProps {
  expense: Expense;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export function ExpenseItem({ expense, onDelete, onEdit }: ExpenseItemProps) {
  const cat = getCategoryById(expense.category);

  return (
    <ListItem
      disablePadding
      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
      secondaryAction={
        <IconButton
          edge="end"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(expense.id);
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      }
      onClick={() => onEdit(expense)}
    >
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={cat.label}
              size="small"
              sx={{
                backgroundColor: cat.color,
                color: '#fff',
                fontSize: '0.7rem',
                height: 20,
              }}
            />
            {expense.isSpecial && (
              <Chip
                label="★"
                size="small"
                color="warning"
                sx={{
                  fontSize: '0.8rem',
                  height: 20,
                  minWidth: 24,
                }}
              />
            )}
            {formatCurrency(expense.amount)}
          </Box>
        }
        secondary={expense.memo || undefined}
        sx={{ pl: 2, py: 0.5 }}
      />
    </ListItem>
  );
}
