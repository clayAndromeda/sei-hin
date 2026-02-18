# 主要Hooks・関数API

## hooks/useExpenses.ts

- `useExpensesByMonth(year, month)`: 月単位でリアクティブ取得
- `useExpensesByDate(dateString)`: 日単位でリアクティブ取得
- `useExpensesByDateRange(start, end)`: 範囲指定でリアクティブ取得
- `addExpense(date, amount, memo, category, isSpecial)`: 新規追加
- `updateExpense(id, amount, memo, category, isSpecial)`: 更新
- `deleteExpense(id)`: 論理削除

## hooks/useSync.ts

- `triggerSync()`: 手動同期実行
- `scheduleDebouncedSync()`: 30秒デバウンス後に自動同期
- 起動時に自動同期を実行

## services/dropbox.ts

- `getAuthUrl()`: OAuth認証URL取得（PKCE）
- `handleAuthCallback(code)`: OAuthコールバック処理、トークン保存
- `downloadFile()`: Dropboxから`/data.json`ダウンロード
- `uploadFile(data, rev?)`: Dropboxへアップロード（楽観的ロック）
- `isConnected()`: refreshToken存在確認
- `disconnect()`: トークン削除

## hooks/useWeekBudget.ts

- `useDefaultWeekBudget()`: デフォルト週予算をリアクティブ取得
- `useWeekBudget(weekStartDate)`: 特定週の予算を取得（個別設定 or デフォルト、deleted除外）
- `setDefaultWeekBudget(budget)`: デフォルト週予算を設定（updatedAt保存）
- `setWeekBudget(weekStartDate, budget)`: 週予算を個別設定（updatedAt付与）
- `deleteWeekBudget(weekStartDate)`: 論理削除（デフォルトに戻す）

## services/sync.ts

- `performSync()`: 同期実行（expenses + weekBudgets + defaultWeekBudget、排他制御あり）
- `mergeExpenses(local, remote)`: expensesマージロジック（ID基準、updatedAt比較）
- `mergeWeekBudgets(local, remote)`: weekBudgetsマージロジック（weekStart基準、updatedAt比較）
- `mergeDefaultWeekBudget(local, remote)`: defaultWeekBudgetマージ（updatedAt比較）
