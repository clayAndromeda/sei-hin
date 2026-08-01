# 主要Hooks・関数API

## hooks/useExpenses.ts

- `useExpensesByMonth(year, month)`: 月単位でリアクティブ取得
- `useExpensesByDate(dateString)`: 日単位でリアクティブ取得
- `useExpensesByDateRange(start, end)`: 範囲指定でリアクティブ取得
- `addExpense(date, amount, memo, category, isSpecial, subcategory?)`: 新規追加（subcategoryは食費のサブカテゴリ）
- `updateExpense(id, amount, memo, category, isSpecial, subcategory?)`: 更新
- `deleteExpense(id)`: 論理削除

## hooks/useSync.ts

- `triggerSync()`: 手動同期実行
- 起動時に自動同期を実行（前回セッションの未同期分もアップロードされる）
- `syncScheduler`のデータ変更通知を購読し、30秒デバウンスで自動同期
- タブ非表示（切替・最小化・クローズ）時に未同期分を即時同期

## services/syncScheduler.ts

- `markDataChanged()`: データ変更を記録して購読者に通知（変更系関数から呼ぶ）
- `hasPendingChanges()`: 未同期の変更が残っているか（localStorageに永続化）
- `clearPendingChanges()`: 同期成功後にフラグをクリア
- `subscribeDataChanged(listener)`: 変更通知を購読（戻り値で解除）

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

## hooks/useMonthBudget.ts

- `useDefaultMonthBudget()`: デフォルト月予算（固定費+変動費）をリアクティブ取得
- `useMonthBudget(yearMonth)`: 特定月の予算を取得（個別設定 or デフォルト、deleted除外）
- `setDefaultMonthBudget(budget)`: デフォルト月予算を設定（updatedAt保存）
- `setMonthBudget(yearMonth, budget)`: 月予算を個別設定（updatedAt付与）
- `deleteMonthBudget(yearMonth)`: 論理削除（デフォルトに戻す）

## utils/budget.ts

- `calcMonthBudgetStatus(input)`: 月予算の消化状況を計算（残額・消化率・超過判定・月末ペース予測・1日あたり使える金額）

## services/sync.ts

- `performSync()`: 同期実行（expenses + weekBudgets + monthBudgets + defaultWeekBudget + defaultMonthBudget + 固定費、排他制御あり）
- `mergeExpenses(local, remote)`: expensesマージロジック（ID基準、updatedAt比較）
- `mergeWeekBudgets(local, remote)`: weekBudgetsマージロジック（weekStart基準、updatedAt比較）
- `mergeMonthBudgets(local, remote)`: monthBudgetsマージロジック（yearMonth基準、updatedAt比較）
- `mergeDefaultWeekBudget(local, remote)`: defaultWeekBudgetマージ（updatedAt比較）
- `mergeDefaultMonthBudget(local, remote)`: defaultMonthBudgetマージ（updatedAt比較）
