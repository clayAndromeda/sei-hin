# アーキテクチャ詳細

## データフロー

**Single Source of Truth: IndexedDB（Dexie）**

- UIは`useLiveQuery`でリアクティブに更新
- Dropbox同期はバックグラウンドで実行
- マージ戦略: 同一ID/weekStartは`updatedAt`が新しい方を採用
- 削除: 論理削除（`deleted: true`）→同期後に物理削除
- 同期対象: expenses, weekBudgets, defaultWeekBudget

## 同期フロー（sync.ts）

1. ローカルの全データ取得（expenses, weekBudgets, defaultWeekBudget、削除済み含む）
2. Dropboxから`/data.json`をダウンロード
3. マージ（updatedAt比較、カテゴリデフォルト補完、weekBudgets後方互換）
4. ローカルに一括保存（expenses + weekBudgets を同一トランザクションで`clear` → `bulkAdd`）
5. Dropboxにアップロード（`rev`で楽観的ロック、SeihinData version: 3）
6. 競合時（409エラー）は再マージして再試行
7. 削除済みレコードを物理削除（expenses + weekBudgets）
8. 最終同期日時を`metadata`テーブルに保存

## DB設計（Dexie）

**テーブル:**
- `expenses`: 支出記録（id, date, category, createdAt, updatedAt）
- `metadata`: KVストア（Dropboxトークン、最終同期日時）
- `weekBudgets`: 週予算（weekStart=月曜日のYYYY-MM-DD、budget、updatedAt、deleted）

**スキーマバージョン履歴:**
- **v1**: 初期（expenses, metadata）
- **v2**: categoryフィールド追加
- **v3**: weekBudgetsテーブル追加
- **v4**: isSpecialフィールド追加（予算外支出フラグ）
- **v5**: WeekBudgetにupdatedAt, deletedフィールド追加（Dropbox同期対応）

## UI構成

- **3画面**: Calendar / Summary / Settings
- **ナビゲーション**:
  - モバイル: `BottomNavigation`（画面下部）
  - PC: `AppBar`内の`Tabs`（画面上部）
- **レスポンシブ**: `useMediaQuery(theme.breakpoints.up('md'))`でPC/モバイル切替

## セキュリティ

- マスターパスワードは永続化せず、セッション中のみメモリ保持
- Dropboxトークンは`IndexedDB`の`metadata`テーブルに保存
- OAuth PKCE フロー（codeVerifier使用）
- 環境変数: `VITE_DROPBOX_APP_KEY`（`.env`で管理）
