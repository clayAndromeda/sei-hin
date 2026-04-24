import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  Divider,
  Typography,
  Box,
  Chip,
  FormControlLabel,
  Checkbox,
  Autocomplete,
} from '@mui/material';
import { ExpenseItem } from './ExpenseItem';
import {
  useExpensesByDate,
  addExpense,
  updateExpense,
  deleteExpense,
} from '../../hooks/useExpenses';
import { formatCurrency } from '../../utils/format';
import { CATEGORIES, DEFAULT_CATEGORY } from '../../constants/categories';
import { useMemoSuggestions } from '../../hooks/useMemoSuggestions';
import type { Expense } from '../../types';

interface ExpenseDialogProps {
  open: boolean;
  date: string; // "YYYY-MM-DD"
  onClose: () => void;
  initialEditExpense?: Expense; // ダイアログを開いた直後に指定支出を編集モードにする
}

export function ExpenseDialog({ open, date, onClose, initialEditExpense }: ExpenseDialogProps) {
  const expenses = useExpensesByDate(date);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [isSpecial, setIsSpecial] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const parsedAmountForSuggestion = parseInt(amount, 10) || 0;
  const suggestions = useMemoSuggestions(open, parsedAmountForSuggestion);
  const suggestionOptions = suggestions.map((s) => s.memo);

  // ダイアログを閉じたらフォームをリセット
  useEffect(() => {
    if (!open) {
      setAmount('');
      setMemo('');
      setCategory(DEFAULT_CATEGORY);
      setIsSpecial(false);
      setEditingId(null);
    }
  }, [open]);

  // ダイアログを開いたときに編集対象が指定されていればプリセット
  useEffect(() => {
    if (open && initialEditExpense) {
      setEditingId(initialEditExpense.id);
      setAmount(String(initialEditExpense.amount));
      setMemo(initialEditExpense.memo);
      setCategory(initialEditExpense.category);
      setIsSpecial(initialEditExpense.isSpecial ?? false);
    }
  }, [open, initialEditExpense]);

  const dayTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async () => {
    const parsedAmount = parseInt(amount, 10);
    if (!parsedAmount || parsedAmount <= 0) return;

    if (editingId) {
      await updateExpense(editingId, parsedAmount, memo, category, isSpecial);
      setEditingId(null);
    } else {
      await addExpense(date, parsedAmount, memo, category, isSpecial);
    }

    setAmount('');
    setMemo('');
    setCategory(DEFAULT_CATEGORY);
    setIsSpecial(false);
  };

  const handleEdit = (expense: { id: string; amount: number; memo: string; category: string; isSpecial?: boolean }) => {
    setEditingId(expense.id);
    setAmount(String(expense.amount));
    setMemo(expense.memo);
    setCategory(expense.category);
    setIsSpecial(expense.isSpecial ?? false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('このレコードを削除しますか？')) {
      await deleteExpense(id);
      if (editingId === id) {
        setEditingId(null);
        setAmount('');
        setMemo('');
        setCategory(DEFAULT_CATEGORY);
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setAmount('');
    setMemo('');
    setCategory(DEFAULT_CATEGORY);
    setIsSpecial(false);
  };

  // 日付表示用: "YYYY-MM-DD" → "YYYY年M月D日"
  const displayDate = date
    ? (() => {
        const [y, m, d] = date.split('-');
        return `${y}年${parseInt(m)}月${parseInt(d)}日`;
      })()
    : '';

  const parsedAmount = parseInt(amount, 10);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && memo.trim().length > 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{displayDate}の記録</DialogTitle>
      <DialogContent>
        {/* カテゴリ選択（チップで1タップ選択） */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, mt: 1, mb: 1 }}>
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.label}
              size="small"
              onClick={() => setCategory(cat.id)}
              sx={{
                backgroundColor: category === cat.id ? cat.color : 'transparent',
                color: category === cat.id ? '#fff' : 'text.primary',
                border: `1.5px solid ${cat.color}`,
                fontWeight: category === cat.id ? 'bold' : 'normal',
                cursor: 'pointer',
                width: '100%',
              }}
            />
          ))}
        </Box>

        {/* 特別な支出フラグ */}
        <FormControlLabel
          control={
            <Checkbox
              checked={isSpecial}
              onChange={(e) => setIsSpecial(e.target.checked)}
              size="small"
            />
          }
          label="特別な支出として登録する（予算から除外できる）"
          sx={{ mb: 1 }}
        />

        {/* 入力フォーム */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            label="金額"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric', min: 0 } }}
            size="small"
            sx={{ flex: 1 }}
          />
          <Autocomplete
            freeSolo
            options={suggestionOptions}
            inputValue={memo}
            onInputChange={(_e, value) => setMemo(value)}
            onChange={(_e, value) => {
              if (typeof value === 'string') {
                setMemo(value);
                // 選択されたメモに対応するカテゴリを自動設定
                const matched = suggestions.find((s) => s.memo === value);
                if (matched) setCategory(matched.topCategory);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="メモ"
                required
                error={memo.length > 0 && memo.trim().length === 0}
                size="small"
              />
            )}
            size="small"
            sx={{ flex: 2 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!isValid}
            size="small"
          >
            {editingId ? '更新' : '追加'}
          </Button>
          {editingId && (
            <Button variant="outlined" onClick={handleCancel} size="small">
              キャンセル
            </Button>
          )}
        </Box>

        {/* 既存レコード一覧 */}
        {expenses.length > 0 && (
          <>
            <Divider>
              <Typography variant="caption">この日の記録</Typography>
            </Divider>
            <List dense>
              {expenses.map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </List>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2" fontWeight="bold" align="right">
              合計: {formatCurrency(dayTotal)}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
