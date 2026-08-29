# アーキテクチャ詳細

## データフロー

**Single Source of Truth: IndexedDB（Dexie）**

- UIは`useLiveQuery`でリアクティブに更新
- Dropbox同期はバックグラウンドで実行
- マージ戦略: 同一ID/weekStartは`updatedAt`が新しい方を採用
- 削除: 論理削除（`deleted: true`）→同期後に物理削除
- 同期対象: expenses, weekBudgets, defaultWeekBudget, dayMemos

## 同期フロー（sync.ts）

**トリガー（syncScheduler.ts + useSync.ts）:**
- データ層の変更系関数（useExpenses / useWeekBudget / useFixedCosts）が`markDataChanged()`を呼ぶと、未同期フラグ（localStorage永続化）が立ち、30秒デバウンスの自動同期がスケジュールされる
- タブ非表示（切替・最小化・クローズ）時、未同期分があればデバウンスを待たずに即時同期
- 起動時の自動同期で、前回セッションで同期しきれなかった変更もアップロードされる
- 同期成功時に未同期フラグをクリア

**同期処理:**

1. ローカルの全データ取得（expenses, weekBudgets, defaultWeekBudget、削除済み含む）
2. Dropboxから`/data.json`をダウンロード
3. マージ（updatedAt比較、カテゴリデフォルト補完、weekBudgets後方互換）
4. ローカルに一括保存（expenses + weekBudgets を同一トランザクションで`clear` → `bulkAdd`）
5. Dropboxにアップロード（`rev`で楽観的ロック、SeihinData version: 7）
6. 競合時（409エラー）は再マージして再試行
7. 削除済みレコードを物理削除（expenses + weekBudgets）
8. 最終同期日時を`metadata`テーブルに保存

## DB設計（Dexie）

**テーブル:**
- `expenses`: 支出記録（id, date, category, createdAt, updatedAt）
- `metadata`: KVストア（Dropboxトークン、最終同期日時）
- `weekBudgets`: 週予算（weekStart=月曜日のYYYY-MM-DD、budget、updatedAt、deleted）
- `monthBudgets`: 月予算の個別設定（yearMonth=YYYY-MM、budget、updatedAt、deleted。未設定月はデフォルト月予算を適用）
- `dayMemos`: 日別メモ（date=YYYY-MM-DD、text、updatedAt、deleted。1日1件。支出とは独立した自由記入）

**スキーマバージョン履歴:**
- **v1**: 初期（expenses, metadata）
- **v2**: categoryフィールド追加
- **v3**: weekBudgetsテーブル追加
- **v4**: isSpecialフィールド追加（特別な支出フラグ）
- **v5**: WeekBudgetにupdatedAt, deletedフィールド追加（Dropbox同期対応）
- **v10**: monthBudgetsテーブル追加（月ごとの個別予算設定）
- **v11**: dayMemosテーブル追加（日別の自由記入メモ）

## UI構成

- **3画面**: Calendar / Summary / Settings
- **ナビゲーション**:
  - モバイル: `BottomNavigation`（画面下部）
  - PC: `AppBar`内の`Tabs`（画面上部）
- **レスポンシブ**: `useMediaQuery(theme.breakpoints.up('md'))`でPC/モバイル切替
- **表示中の年月**: `contexts/ViewedMonthProvider`でアプリ全体に共有。カレンダーとサマリー（月次）が同じ年月を参照するため、タブを切り替えても見ていた月が維持される（起動時は常に今月。永続化はしない）

## セキュリティ

- マスターパスワードは永続化せず、セッション中のみメモリ保持
- Dropboxトークンは`IndexedDB`の`metadata`テーブルに保存
- OAuth PKCE フロー（codeVerifier使用）
- 環境変数: `VITE_DROPBOX_APP_KEY`（`.env`で管理）
