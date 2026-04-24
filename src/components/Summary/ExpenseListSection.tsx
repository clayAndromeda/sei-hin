import { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  Collapse,
  ListItemButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { Expense } from '../../types';
import { formatCurrency } from '../../utils/format';
import { CATEGORIES, getCategoryById, type CategoryId } from '../../constants/categories';

interface ExpenseListSectionProps {
  expenses: Expense[];
  onEditExpense?: (expense: Expense) => void;
}

type CategoryFilter = 'all' | CategoryId;

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

export function ExpenseListSection({ expenses, onEditExpense }: ExpenseListSectionProps) {
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  if (expenses.length === 0) return null;

  // カテゴリフィルタ適用
  const visibleExpenses =
    categoryFilter === 'all'
      ? expenses
      : expenses.filter((e) => e.category === categoryFilter);

  // メモ付きの支出数（ヘッダー表示はフィルタ前の全件ベースで揃える）
  const withMemo = expenses.filter((e) => e.memo && e.memo !== '（なし）').length;
  const filteredTotal = visibleExpenses.reduce((sum, e) => sum + e.amount, 0);
  const grouped = groupByDate(visibleExpenses);

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
        {/* カテゴリフィルタ */}
        <Box sx={{ px: 2, py: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
          <Chip
            label="すべて"
            size="small"
            variant={categoryFilter === 'all' ? 'filled' : 'outlined'}
            color={categoryFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setCategoryFilter('all')}
            sx={{ fontSize: '0.7rem', height: 22 }}
          />
          {CATEGORIES.map((cat) => {
            const isSelected = categoryFilter === cat.id;
            return (
              <Chip
                key={cat.id}
                label={cat.label}
                size="small"
                variant={isSelected ? 'filled' : 'outlined'}
                onClick={() => setCategoryFilter(cat.id)}
                sx={{
                  fontSize: '0.7rem',
                  height: 22,
                  backgroundColor: isSelected ? cat.color : 'transparent',
                  color: isSelected ? '#fff' : 'text.primary',
                  borderColor: cat.color,
                  '&:hover': {
                    backgroundColor: isSelected ? cat.color : `${cat.color}22`,
                  },
                }}
              />
            );
          })}
          {categoryFilter !== 'all' && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {visibleExpenses.length}件・{formatCurrency(filteredTotal)}
            </Typography>
          )}
        </Box>
        {visibleExpenses.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 2 }}
          >
            該当する支出はありません
          </Typography>
        ) : (
          <TableContainer sx={{ px: 1, pb: 1 }}>
            <Table size="small" sx={{ '& td, & th': { py: 0.5, px: 0.75 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: 'text.secondary' }}>
                    日付
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: 'text.secondary' }}>
                    カテゴリ
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: 'text.secondary' }}>
                    金額
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: 'text.secondary' }}>
                    メモ
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...grouped.entries()].map(([date, items]) => {
                  const dayTotal = items.reduce((sum, e) => sum + e.amount, 0);
                  return items.map((expense, idx) => {
                    const cat = getCategoryById(expense.category);
                    const isLastInGroup = idx === items.length - 1;
                    return (
                      <TableRow
                        key={expense.id}
                        onClick={onEditExpense ? () => onEditExpense(expense) : undefined}
                        sx={{
                          // ストライプ背景（日付グループ単位で交互）
                          backgroundColor: [...grouped.keys()].indexOf(date) % 2 === 0
                            ? 'transparent'
                            : 'action.hover',
                          // グループ最終行の下に区切り線
                          ...(isLastInGroup && {
                            '& td': { borderBottom: '2px solid', borderBottomColor: 'divider' },
                          }),
                          // 編集可能ならクリック可能な見た目に
                          ...(onEditExpense && {
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'action.selected',
                            },
                          }),
                        }}
                      >
                        {/* 日付セル: グループの最初の行だけ表示 */}
                        <TableCell
                          sx={{
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'top',
                            ...(idx > 0 && { borderBottom: 'none' }),
                          }}
                        >
                          {idx === 0 ? formatDateLabel(date) : ''}
                        </TableCell>
                        <TableCell>
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
                                label="⭐️"
                                size="small"
                                color="warning"
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: '0.7rem',
                            color: expense.memo && expense.memo !== '（なし）' ? 'text.primary' : 'text.disabled',
                            maxWidth: 120,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {expense.memo || ''}
                        </TableCell>
                      </TableRow>
                    );
                  }).concat(
                    // 日ごとの小計行
                    items.length > 1 ? [(
                      <TableRow
                        key={`subtotal-${date}`}
                        sx={{
                          backgroundColor: [...grouped.keys()].indexOf(date) % 2 === 0
                            ? 'transparent'
                            : 'action.hover',
                          '& td': { borderBottom: '2px solid', borderBottomColor: 'divider' },
                        }}
                      >
                        <TableCell />
                        <TableCell align="right" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                          小計
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {formatCurrency(dayTotal)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )] : [],
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Collapse>
    </>
  );
}
