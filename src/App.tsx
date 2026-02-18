import { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Paper,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  Fab,
  Tooltip,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import { CalendarView } from './components/Calendar/CalendarView';
import { SummaryView } from './components/Summary/SummaryView';
import { SettingsView } from './components/Settings/SettingsView';
import { ExpenseDialog } from './components/ExpenseDialog/ExpenseDialog';
import { useSync } from './hooks/useSync';
import { handleAuthCallback } from './services/dropbox';
import { toDateString } from './utils/date';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [todayExpenseDialogOpen, setTodayExpenseDialogOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const {
    syncStatus,
    lastSyncTime,
    errorMessage,
    connected,
    setConnected,
    triggerSync,
    scheduleDebouncedSync,
  } = useSync();

  // 今日の日付を取得
  const todayDateStr = toDateString(new Date());

  // OAuthコールバック処理
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleAuthCallback(code)
        .then(() => {
          setConnected(true);
          // URLをクリーンアップ
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch((err) => {
          console.error('OAuth callback error:', err);
        });
    }
  }, [setConnected]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* AppBar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
            component="h1"
            sx={{
              flexGrow: isDesktop ? 0 : 1,
              fontWeight: 500,
              letterSpacing: '0.02em',
              mr: isDesktop ? 4 : 0,
            }}
          >
            sei-hin
          </Typography>

          {/* PC版: タブナビゲーション */}
          {isDesktop && (
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              textColor="inherit"
              indicatorColor="secondary"
              sx={{ flexGrow: 1 }}
            >
              <Tab label="カレンダー" icon={<CalendarMonthIcon />} iconPosition="start" />
              <Tab label="サマリー" icon={<BarChartIcon />} iconPosition="start" />
              <Tab label="設定" icon={<SettingsIcon />} iconPosition="start" />
            </Tabs>
          )}

          {/* 同期ボタン */}
          {connected && (
            <IconButton
              color="inherit"
              onClick={triggerSync}
              disabled={syncStatus === 'syncing'}
              size="small"
              sx={{ ml: 'auto' }}
            >
              {syncStatus === 'syncing' ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SyncIcon />
              )}
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Box
        sx={{
          flexGrow: 1,
          pb: { xs: '56px', md: 0 },
          overflow: 'auto',
        }}
      >
        {activeTab === 0 && <CalendarView onDataChanged={scheduleDebouncedSync} />}
        {activeTab === 1 && <SummaryView />}
        {activeTab === 2 && (
          <SettingsView
            onSync={triggerSync}
            syncStatus={syncStatus}
            lastSyncTime={lastSyncTime}
            syncError={errorMessage}
            connected={connected}
            onConnectionChange={setConnected}
            onDataChanged={scheduleDebouncedSync}
          />
        )}
      </Box>

      {/* 今日の支出を追加するFAB */}
      <Tooltip title="今日の支出を追加" placement="top">
        <Fab
          color="primary"
          onClick={() => setTodayExpenseDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: { xs: 72, md: 24 }, // モバイルはBottomNavigationの上
            left: { xs: 24, md: 'auto' }, // モバイルは左下
            right: { xs: 'auto', md: 24 }, // PCは右下
            zIndex: (theme) => theme.zIndex.speedDial,
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      {/* 今日の支出入力ダイアログ */}
      <ExpenseDialog
        open={todayExpenseDialogOpen}
        date={todayDateStr}
        onClose={() => setTodayExpenseDialogOpen(false)}
      />

      {/* モバイル版: 下部ナビゲーション */}
      {!isDesktop && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.appBar,
          }}
          elevation={8}
        >
          <BottomNavigation
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            showLabels
            sx={{ height: 56 }}
          >
            <BottomNavigationAction label="カレンダー" icon={<CalendarMonthIcon />} />
            <BottomNavigationAction label="サマリー" icon={<BarChartIcon />} />
            <BottomNavigationAction label="設定" icon={<SettingsIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}

export default App;
