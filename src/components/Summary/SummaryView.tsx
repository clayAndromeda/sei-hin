import { Box, Tabs, Tab } from '@mui/material';
import { WeeklySummary } from './WeeklySummary';
import { MonthlySummary } from './MonthlySummary';
import { usePersistedState } from '../../hooks/usePersistedState';

export function SummaryView() {
  // 最後に見ていたタブ（月次/週次）を記憶する
  const [tab, setTab] = usePersistedState('summary.tab', 0);

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        maxWidth: { md: 900 },
        mx: 'auto',
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
        centered
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        <Tab label="月次" />
        <Tab label="週次" />
      </Tabs>

      {tab === 0 && <MonthlySummary />}
      {tab === 1 && <WeeklySummary />}
    </Box>
  );
}
