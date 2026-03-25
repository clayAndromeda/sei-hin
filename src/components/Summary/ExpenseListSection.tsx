import { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Collapse,
  ListItemButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { Expense } from '../../types';
import { formatCurrency } from '../../utils/format';
import { getCategoryById } from '../../constants/categories';

interface ExpenseListSectionProps {
  expenses: Expense[];
}

// 日付でグループ化して降順に並べる
function groupByDate(expenses: Expense[]): Map<string, Expense[]> {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  // 日付降順にソート
  return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`;
}

export function ExpenseListSection({ expenses }: ExpenseListSectionProps) {
  const [open, setOpen] = useState(false);

  if (expenses.length === 0) return null;

  // メモ付きの支出数
  const withMemo = expenses.filter((e) => e.memo).length;
  const grouped = groupByDate(expenses);

  return (
    <>
      <Divider sx={{ mt: 1 }} />
      <ListItemButton
        onClick={() => setOpen(!open)}
        sx={{ py: 1, px: 2, justifyContent: 'space-between' }}
      >
        <Typography variant="body2" color="text.secondary">
          支出一覧（{expenses.length}件{withMemo > 0 ? `・メモ${withMemo}件` : ''}）
        </Typography>
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>
      <Collapse in={open}>
        <Box sx={{ px: 1, pb: 1 }}>
          {[...grouped.entries()].map(([date, items]) => (
            <Box key={date} sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ pl: 1, fontWeight: 'bold' }}
              >
                {formatDateLabel(date)}
              </Typography>
              <List dense disablePadding>
                {items.map((expense) => {
                  const cat = getCategoryById(expense.category);
                  return (
                    <ListItem key={expense.id} disablePadding sx={{ pl: 1 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={cat.label}
                              size="small"
                              sx={{
                                backgroundColor: cat.color,
                                color: '#fff',
                                fontSize: '0.65rem',
                                height: 18,
                              }}
                            />
                            {expense.isSpecial && (
                              <Chip
                                label="★"
                                size="small"
                                color="warning"
                                sx={{ fontSize: '0.7rem', height: 18, minWidth: 22 }}
                              />
                            )}
                            <Typography variant="body2">
                              {formatCurrency(expense.amount)}
                            </Typography>
                          </Box>
                        }
                        secondary={expense.memo || undefined}
                        secondaryTypographyProps={{ variant: 'caption' }}
                        sx={{ py: 0.25 }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>
      </Collapse>
    </>
  );
}
