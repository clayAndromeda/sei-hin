import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SyncIcon from '@mui/icons-material/Sync';
import DownloadIcon from '@mui/icons-material/Download';
import { getAuthUrl, disconnect } from '../../services/dropbox';
import { db } from '../../services/db';
import { useDefaultWeekBudget, setDefaultWeekBudget } from '../../hooks/useWeekBudget';
import { formatCurrency } from '../../utils/format';

interface SettingsViewProps {
  onSync: () => void;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: string | null;
  syncError: string | null;
  connected: boolean;
  onConnectionChange: (connected: boolean) => void;
  onDataChanged?: () => void;
}

export function SettingsView({
  onSync,
  syncStatus,
  lastSyncTime,
  syncError,
  connected,
  onConnectionChange,
  onDataChanged,
}: SettingsViewProps) {
  const [dropboxError, setDropboxError] = useState<string | null>(null);
  const defaultWeekBudget = useDefaultWeekBudget();
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const handleDropboxConnect = async () => {
    try {
      setDropboxError(null);
      const url = await getAuthUrl();
      window.location.href = url;
    } catch (error) {
      setDropboxError(
        error instanceof Error ? error.message : 'Dropbox連携エラー',
      );
    }
  };

  const handleDropboxDisconnect = async () => {
    if (window.confirm('Dropbox連携を解除しますか？')) {
      await disconnect();
      onConnectionChange(false);
    }
  };

  const handleSaveWeekBudget = async () => {
    const value = parseInt(budgetInput, 10);
    if (isNaN(value) || value < 0) {
      setBudgetError('正の整数を入力してください');
      return;
    }
    try {
      setBudgetError(null);
      await setDefaultWeekBudget(value);
      onDataChanged?.();
      setBudgetInput('');
    } catch (error) {
      setBudgetError(
        error instanceof Error ? error.message : '保存に失敗しました',
      );
    }
  };

  const handleExport = async () => {
    const expenses = await db.expenses.filter((e) => !e.deleted).toArray();
    const data = {
      version: 2,
      updatedAt: new Date().toISOString(),
      expenses,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seihin-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return '未同期';
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 600, mx: 'auto' }}>
      {/* Dropbox連携 */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Dropbox連携
      </Typography>
      <List dense>
        <ListItem>
          <ListItemIcon>
            {connected ? <CloudIcon color="primary" /> : <CloudOffIcon color="disabled" />}
          </ListItemIcon>
          <ListItemText
            primary={connected ? '連携済み' : '未連携'}
          />
        </ListItem>
      </List>
      {connected ? (
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={handleDropboxDisconnect}
          sx={{ mb: 2 }}
        >
          連携解除
        </Button>
      ) : (
        <Button
          variant="contained"
          size="small"
          onClick={handleDropboxConnect}
          sx={{ mb: 2 }}
        >
          Dropboxと連携する
        </Button>
      )}
      {dropboxError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {dropboxError}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* 同期 */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        同期
      </Typography>
      <List dense>
        <ListItem>
          <ListItemIcon>
            <SyncIcon color={syncStatus === 'syncing' ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText
            primary={`最終同期: ${formatLastSync(lastSyncTime)}`}
          />
        </ListItem>
      </List>
      <Button
        variant="outlined"
        size="small"
        onClick={onSync}
        disabled={!connected || syncStatus === 'syncing'}
        startIcon={
          syncStatus === 'syncing' ? <CircularProgress size={16} /> : <SyncIcon />
        }
        sx={{ mb: 1 }}
      >
        手動同期
      </Button>
      {syncStatus === 'success' && (
        <Alert severity="success" sx={{ mt: 1 }}>
          同期完了
        </Alert>
      )}
      {syncStatus === 'error' && syncError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {syncError}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* 週予算設定 */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        週予算設定
      </Typography>
      <List dense>
        <ListItem>
          <ListItemText
            primary={`デフォルト週予算: ${defaultWeekBudget !== null ? formatCurrency(defaultWeekBudget) : '未設定'}`}
          />
        </ListItem>
      </List>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          size="small"
          label="週予算（円）"
          type="number"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          inputProps={{ min: 0, step: 1 }}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleSaveWeekBudget}
          sx={{ mt: 0.5 }}
        >
          保存
        </Button>
      </Box>
      {budgetError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {budgetError}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* データエクスポート */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        データエクスポート
      </Typography>
      <Button
        variant="outlined"
        size="small"
        onClick={handleExport}
        startIcon={<DownloadIcon />}
      >
        JSONエクスポート
      </Button>
    </Box>
  );
}
