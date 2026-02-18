# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

sei-hin（清貧）は、食費記録・可視化のためのPWAアプリケーション。個人利用（1人用）。
ローカルDB（IndexedDB）にデータを保存し、Dropbox経由で暗号化同期する。

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動（Vite）
npm run build      # TypeScriptチェック + プロダクションビルド（tsc -b && vite build）
npm run lint       # ESLint実行
npm run preview    # ビルド結果のプレビュー
npm test           # テスト実行（Vitest）
npm run test:watch # テストをウォッチモードで実行
```

## 開発ワークフロー

### Issue駆動開発

このプロジェクトはGitHub Issueを使った開発ワークフローを採用しています。

**基本フロー:**

1. **作業開始前**: `gh issue list` でオープンなIssueを確認する
2. **Issue詳細の確認**: `gh issue view <番号>` で内容を読み込む
3. **優先度判断**: 複数のIssueがある場合、関連性や依存関係を考慮して優先順位を決める
4. **実装計画**: 複雑な機能の場合、実装計画を立ててユーザーに確認を求める
5. **実装・テスト**: 機能を実装し、動作確認を行う
6. **コミット前の確認**: コミットを実行する前に、必ずユーザーに以下を提示して承認を得ること
   - 変更したファイルの一覧
   - 変更内容の要約
   - 予定するコミットメッセージ
   - ユーザーの承認を得てからコミットを実行する（勝手にコミットしない）
7. **コミット**: コミットメッセージにIssue番号を含める（例: `feat: 今日の支出追加ボタンを実装 (#3)`）
8. **Issue更新**:
   - 完了した場合: `gh issue close <番号> -c "実装完了しました"`
   - 追加情報が必要な場合: `gh issue comment <番号> -b "コメント内容"`

**コミットメッセージ規約:**

- フォーマット: `<type>: <概要> (#<issue番号>)`
- 例:
  - `feat: 今日の支出追加ボタンを実装 (#3)`
  - `fix: 週次・月次切替時の状態維持を修正 (#2)`
  - `docs: CLAUDE.mdに開発ワークフローを追加 (#1)`

**注意点:**

- スマホなどから報告された不具合や機能要望はGitHub Issueで管理される
- Issue本文だけでなく、コメントも確認すること
- 関連するIssueがある場合は、Issue内で相互参照すること

## 技術スタック

- **テスト**: Vitest（ユニットテスト）
- **フロントエンド**: React 19 + TypeScript 5.9 + Vite 7.3
- **UI**: MUI v7（Material-UI）+ Recharts（グラフ描画）
- **DB**: Dexie.js 4（IndexedDBラッパー）+ dexie-react-hooks（リアクティブクエリ）
- **同期**: Dropbox SDK（OAuth PKCE、データ同期）
- **暗号化**: Web Crypto API（AES-256-GCM + PBKDF2）
- **PWA**: vite-plugin-pwa（Service Worker、オフライン対応）
- **デプロイ**: GitHub Pages（`base: '/sei-hin/'`）

## ディレクトリ構造

```
src/
├── types/index.ts          # 型定義（Expense, WeekBudget, DefaultWeekBudgetSync, SeihinData）
├── constants/
│   ├── categories.ts      # カテゴリ定義（食費/交通費/娯楽費/書籍代/その他）
│   └── categories.test.ts # categories.tsのテスト
├── services/
│   ├── db.ts              # Dexie DB定義（expenses, metadata, weekBudgets）
│   ├── dropbox.ts         # Dropbox OAuth PKCE + アップロード/ダウンロード
│   ├── sync.ts            # 同期マージロジック（expenses + weekBudgets + defaultWeekBudget）
│   ├── sync.test.ts       # sync.tsのテスト（mergeExpenses, mergeWeekBudgets, mergeDefaultWeekBudget）
│   └── crypto.ts          # AES-256-GCM暗号化（※未実装想定）
├── hooks/
│   ├── useExpenses.ts     # 食費CRUD + リアクティブクエリ（useLiveQuery）
│   ├── useSync.ts         # 同期状態管理（起動時自動同期、30秒デバウンス）
│   └── useWeekBudget.ts   # 週予算CRUD（論理削除対応、updatedAt付与）
├── utils/
│   ├── date.ts            # 日付ユーティリティ（月曜始まり、YYYY-MM-DD形式）
│   ├── date.test.ts       # date.tsのテスト
│   ├── format.ts          # 金額フォーマット（¥1,350形式）
│   ├── format.test.ts     # format.tsのテスト
│   ├── chart.ts           # グラフ用データ変換
│   └── chart.test.ts      # chart.tsのテスト
├── components/
│   ├── Calendar/
│   │   ├── CalendarView.tsx      # カレンダー画面メイン
│   │   ├── CalendarGrid.tsx      # 月表示グリッド
│   │   ├── DayCell.tsx           # 日付セル（金額表示、予算超過判定）
│   │   ├── WeekSummaryRow.tsx    # 週別サマリー行
│   │   └── WeekBudgetDialog.tsx  # 週予算設定ダイアログ
│   ├── Summary/
│   │   ├── SummaryView.tsx       # サマリー画面メイン
│   │   ├── WeeklySummary.tsx     # 週別集計表示
│   │   ├── MonthlySummary.tsx    # 月別集計表示
│   │   └── CategoryDonutChart.tsx # カテゴリ別ドーナツチャート
│   ├── Settings/
│   │   └── SettingsView.tsx      # 設定画面（Dropbox連携、同期状態）
│   └── ExpenseDialog/
│       ├── ExpenseDialog.tsx     # 支出入力ダイアログ
│       └── ExpenseItem.tsx       # 支出項目リスト表示
├── App.tsx                # メインアプリ（タブナビゲーション、同期UI）
└── main.tsx              # エントリーポイント
```

## アーキテクチャ

### データフロー

**Single Source of Truth: IndexedDB（Dexie）**

- UIは`useLiveQuery`でリアクティブに更新
- Dropbox同期はバックグラウンドで実行
- マージ戦略: 同一ID/weekStartは`updatedAt`が新しい方を採用
- 削除: 論理削除（`deleted: true`）→同期後に物理削除
- 同期対象: expenses, weekBudgets, defaultWeekBudget

### 同期フロー（sync.ts）

1. ローカルの全データ取得（expenses, weekBudgets, defaultWeekBudget、削除済み含む）
2. Dropboxから`/data.json`をダウンロード
3. マージ（updatedAt比較、カテゴリデフォルト補完、weekBudgets後方互換）
4. ローカルに一括保存（expenses + weekBudgets を同一トランザクションで`clear` → `bulkAdd`）
5. Dropboxにアップロード（`rev`で楽観的ロック、SeihinData version: 3）
6. 競合時（409エラー）は再マージして再試行
7. 削除済みレコードを物理削除（expenses + weekBudgets）
8. 最終同期日時を`metadata`テーブルに保存

### DB設計（Dexie）

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

### UI構成

- **3画面**: Calendar / Summary / Settings
- **ナビゲーション**:
  - モバイル: `BottomNavigation`（画面下部）
  - PC: `AppBar`内の`Tabs`（画面上部）
- **レスポンシブ**: `useMediaQuery(theme.breakpoints.up('md'))`でPC/モバイル切替

## 主要Hooks・関数API

### hooks/useExpenses.ts

- `useExpensesByMonth(year, month)`: 月単位でリアクティブ取得
- `useExpensesByDate(dateString)`: 日単位でリアクティブ取得
- `useExpensesByDateRange(start, end)`: 範囲指定でリアクティブ取得
- `addExpense(date, amount, memo, category, isSpecial)`: 新規追加
- `updateExpense(id, amount, memo, category, isSpecial)`: 更新
- `deleteExpense(id)`: 論理削除

### hooks/useSync.ts

- `triggerSync()`: 手動同期実行
- `scheduleDebouncedSync()`: 30秒デバウンス後に自動同期
- 起動時に自動同期を実行

### services/dropbox.ts

- `getAuthUrl()`: OAuth認証URL取得（PKCE）
- `handleAuthCallback(code)`: OAuthコールバック処理、トークン保存
- `downloadFile()`: Dropboxから`/data.json`ダウンロード
- `uploadFile(data, rev?)`: Dropboxへアップロード（楽観的ロック）
- `isConnected()`: refreshToken存在確認
- `disconnect()`: トークン削除

### hooks/useWeekBudget.ts

- `useDefaultWeekBudget()`: デフォルト週予算をリアクティブ取得
- `useWeekBudget(weekStartDate)`: 特定週の予算を取得（個別設定 or デフォルト、deleted除外）
- `setDefaultWeekBudget(budget)`: デフォルト週予算を設定（updatedAt保存）
- `setWeekBudget(weekStartDate, budget)`: 週予算を個別設定（updatedAt付与）
- `deleteWeekBudget(weekStartDate)`: 論理削除（デフォルトに戻す）

### services/sync.ts

- `performSync()`: 同期実行（expenses + weekBudgets + defaultWeekBudget、排他制御あり）
- `mergeExpenses(local, remote)`: expensesマージロジック（ID基準、updatedAt比較）
- `mergeWeekBudgets(local, remote)`: weekBudgetsマージロジック（weekStart基準、updatedAt比較）
- `mergeDefaultWeekBudget(local, remote)`: defaultWeekBudgetマージ（updatedAt比較）

## データ形式・規約

### 基本規約

- **日付**: `"YYYY-MM-DD"` 文字列統一（例: `"2026-02-14"`）
- **金額**: 整数（円）
- **カレンダー**: 月曜始まり、日本語ロケール
- **カテゴリ**: `'food' | 'transport' | 'entertainment' | 'books' | 'other'`
- **特別な支出**: `isSpecial: true`で予算外としてマーク（予算計算から除外）

### カテゴリ定義（constants/categories.ts）

```typescript
{ id: 'food', label: '食費', color: '#4CAF50' }
{ id: 'transport', label: '交通費', color: '#2196F3' }
{ id: 'entertainment', label: '娯楽費', color: '#FF9800' }
{ id: 'books', label: '書籍代', color: '#9C27B0' }
{ id: 'other', label: 'その他', color: '#607D8B' }
```

### セキュリティ

- マスターパスワードは永続化せず、セッション中のみメモリ保持
- Dropboxトークンは`IndexedDB`の`metadata`テーブルに保存
- OAuth PKCE フロー（codeVerifier使用）
- 環境変数: `VITE_DROPBOX_APP_KEY`（`.env`で管理）

## デプロイ設定

- **URL**: `https://<user>.github.io/sei-hin/`
- **vite.config.ts**: `base: '/sei-hin/'`
- **PWA manifest**:
  - `scope: '/sei-hin/'`
  - `start_url: '/sei-hin/'`
  - `theme_color: '#2E7D32'`

## 開発時の注意点

- **命名**: 英語、コメントは日本語
- **日付処理**: 必ず`utils/date.ts`の関数を使用（月曜始まり対応）
- **金額表示**: `utils/format.ts`の`formatCurrency()`使用
- **リアクティブクエリ**: DB変更時は自動でUIが更新される（`useLiveQuery`）
- **同期タイミング**: 起動時 + CRUD操作後30秒デバウンス
- **予算計算**: `isSpecial: true`の支出は予算から除外される
- **テスト**: テストファイルはソースと同じディレクトリに `*.test.ts` で配置。`npm test` で全テスト実行
