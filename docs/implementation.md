# sei-hin ver.1 実装ドキュメント

## 技術スタック（実際に使用したバージョン）

| レイヤー | 技術 | バージョン |
|---|---|---|
| フレームワーク | React + TypeScript | React 19, TS 5.9 |
| ビルドツール | Vite + vite-plugin-pwa | Vite 7.3, PWA 1.2 |
| UIライブラリ | MUI (Material UI) | v7.3 |
| ローカルDB | IndexedDB（Dexie.js + dexie-react-hooks） | Dexie 4.3 |
| データ同期 | Dropbox JavaScript SDK | 10.34 |
| 暗号化 | Web Crypto API（AES-GCM + PBKDF2） | ブラウザ標準 |
| ホスティング | GitHub Pages（GitHub Actions） | - |
| パッケージ管理 | npm | - |

---

## ディレクトリ構成

```
sei-hin/
├── .github/workflows/
│   └── deploy.yml              # GitHub Pages 自動デプロイ
├── docs/
│   ├── ver1_plan.md            # 仕様書
│   └── implementation.md       # 本ドキュメント
├── public/
│   └── icons/
│       ├── icon.svg            # アイコン原本（SVG）
│       ├── icon-192.png        # PWAアイコン 192x192（要差し替え）
│       └── icon-512.png        # PWAアイコン 512x512（要差し替え）
├── src/
│   ├── main.tsx                # エントリーポイント（ThemeProvider）
│   ├── App.tsx                 # ルートコンポーネント
│   ├── vite-env.d.ts           # Vite 型定義
│   ├── types/
│   │   └── index.ts            # 型定義（FoodExpense, SeihinData, EncryptedFile）
│   ├── services/
│   │   ├── db.ts               # Dexie.js DB定義
│   │   ├── crypto.ts           # 暗号化/復号ユーティリティ
│   │   ├── dropbox.ts          # Dropbox API ラッパー
│   │   └── sync.ts             # 同期・マージロジック
│   ├── hooks/
│   │   ├── useExpenses.ts      # 食費データ CRUD hook
│   │   └── useSync.ts          # Dropbox同期 hook
│   ├── components/
│   │   ├── Calendar/
│   │   │   ├── CalendarView.tsx    # カレンダー画面全体
│   │   │   ├── CalendarGrid.tsx    # 7列グリッド
│   │   │   └── DayCell.tsx         # 日付セル
│   │   ├── ExpenseDialog/
│   │   │   ├── ExpenseDialog.tsx   # 入力/編集ダイアログ
│   │   │   └── ExpenseItem.tsx     # レコード1件の表示
│   │   ├── Summary/
│   │   │   ├── SummaryView.tsx     # サマリー画面（タブ切替）
│   │   │   ├── WeeklySummary.tsx   # 週次集計
│   │   │   └── MonthlySummary.tsx  # 月次集計
│   │   └── Settings/
│   │       └── SettingsView.tsx    # 設定画面
│   └── utils/
│       ├── date.ts             # 日付ユーティリティ
│       └── format.ts           # 金額フォーマット
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
└── package.json
```

---

## 各モジュールの詳細

### types/index.ts

アプリ全体で使用する型定義。

```typescript
FoodExpense   // 1件の食費記録（id, date, amount, memo, createdAt, updatedAt, deleted?）
SeihinData    // Dropboxに保存するデータ全体（version, updatedAt, expenses[]）
EncryptedFile // 暗号化ファイルフォーマット（version, salt, iv, data）
Metadata      // IndexedDB メタデータ（key-value）
```

### services/db.ts

Dexie.js によるローカルDB。DB名は `seihin`。

| テーブル | インデックス | 用途 |
|---|---|---|
| `expenses` | `id, date, createdAt, updatedAt` | 食費レコード |
| `metadata` | `key` | アプリ設定・トークン等のkey-valueストア |

### hooks/useExpenses.ts

食費データの CRUD 操作を提供する hook / 関数群。Dexie の `useLiveQuery` によりデータ変更時に自動でUIが更新される。

| 関数 | 用途 |
|---|---|
| `useExpensesByMonth(year, month)` | 月内の全レコード取得（リアクティブ） |
| `useExpensesByDate(dateString)` | 特定日のレコード一覧取得（リアクティブ） |
| `useExpensesByDateRange(start, end)` | 日付範囲指定でレコード取得（リアクティブ） |
| `addExpense(date, amount, memo)` | 新規追加（UUID自動生成） |
| `updateExpense(id, amount, memo)` | 更新（updatedAt自動更新） |
| `deleteExpense(id)` | 論理削除（deleted: true） |

### services/crypto.ts

Web Crypto API による暗号化/復号。

- **鍵導出**: PBKDF2（SHA-256, 100,000 iterations）でマスターパスワードから AES-256-GCM 鍵を導出
- **暗号化**: ランダム salt（16byte）+ IV（12byte）を生成し AES-GCM で暗号化。結果を Base64 エンコードして `EncryptedFile` として返す
- **復号**: Base64 デコード → 鍵導出 → AES-GCM 復号。パスワード不正時はエラーをスロー

### services/dropbox.ts

Dropbox API との連携。PKCE OAuth フロー対応。

| 関数 | 用途 |
|---|---|
| `getAuthUrl()` | OAuth認証URLを生成（PKCE code_verifier をIndexedDBに保存） |
| `handleAuthCallback(code)` | OAuthコールバック処理（トークン取得・保存） |
| `isConnected()` | Dropbox連携状態の確認 |
| `disconnect()` | 連携解除（トークン削除） |
| `downloadFile()` | `/data.json.enc` をダウンロード（rev付き）。ファイルなしなら null |
| `uploadFile(data, rev?)` | `/data.json.enc` をアップロード。rev指定で競合検出 |
| `getLastSyncTime()` | 最終同期日時を取得 |

Dropbox App Key は環境変数 `VITE_DROPBOX_APP_KEY` で管理。

### services/sync.ts

同期・マージロジック。

**マージ戦略** (`mergeExpenses`):
- 両方のリストを `id` でマッピング
- 同一IDのレコードは `updatedAt` が新しい方を採用
- 片方にしか存在しないレコードはそのまま追加

**同期フロー** (`performSync`):
1. ローカルDBの全レコードを取得
2. Dropboxからダウンロード（ファイルなければスキップ）
3. マスターパスワードで復号
4. ローカルとリモートをマージ
5. マージ結果をローカルに保存（全置換）
6. 暗号化してDropboxにアップロード（rev付き）
7. 競合発生時: 再ダウンロード → 再マージ → 再アップロード
8. 同期完了後、`deleted: true` のレコードを物理削除
9. 最終同期日時を保存

排他制御: フラグベース（`isSyncing`）で並行実行を防止。

### hooks/useSync.ts

同期の状態管理 hook。

- `syncStatus`: `'idle' | 'syncing' | 'success' | 'error'`
- 起動時にDropbox連携済み＆パスワード設定済みなら自動同期
- データ変更後30秒のデバウンスで自動同期スケジュール

### utils/date.ts

| 関数 | 用途 |
|---|---|
| `toDateString(date)` | Date → `"YYYY-MM-DD"` |
| `formatDateJP(date)` | Date → `"2026年2月14日"` |
| `getMonthDays(year, month)` | 月曜始まりカレンダーグリッド用の日付配列（42要素、null padding含む） |
| `getWeekRange(date)` | 指定日を含む月曜〜日曜の範囲 |
| `isSameDay(a, b)` | 同日判定 |
| `isFutureDate(date)` | 未来日判定 |
| `WEEKDAY_LABELS` | `['月', '火', '水', '木', '金', '土', '日']` |

### utils/format.ts

| 関数 | 用途 |
|---|---|
| `formatCurrency(amount)` | `1350` → `"¥1,350"` |

---

## 画面構成

### App.tsx

- `AppBar`: アプリタイトル + 同期ボタン（Dropbox連携＆パスワード設定済みの場合のみ表示）
- `BottomNavigation`: カレンダー / サマリー / 設定 の3タブ
- OAuthコールバック処理: URL の `?code=` パラメータを検出してトークン取得
- パスワード: `useState` でセッション中のみメモリ保持
- レイアウト: `maxWidth: 480px` で中央寄せ（PC対応）

### カレンダー画面 (CalendarView)

- 月切り替え（◀ ▶）
- 月合計金額表示
- `CalendarGrid`: CSS Grid 7列（月曜始まり）
- `DayCell`: 日付番号 + 金額表示。今日はハイライト、未来日は金額非表示
- 日付タップ → `ExpenseDialog` を表示

### 入力/編集ダイアログ (ExpenseDialog)

- 金額入力（type=number, inputMode=numeric）
- メモ入力
- 「追加」ボタン（金額0/空なら disabled）
- 既存レコード一覧（`ExpenseItem`）
- レコードタップで編集モード（「追加」→「更新」に変化）
- 削除ボタン（確認ダイアログ付き）
- 日の合計金額表示

### サマリー画面 (SummaryView)

MUI Tabs で「週次」「月次」を切り替え。

**週次 (WeeklySummary)**:
- 週ナビゲーション（◀ ▶）
- 月〜日の7行リスト（曜日 + 日付 + 金額）
- 週合計 + 1日平均
- 1日平均の分母: 今週は今日までの日数、過去週は7

**月次 (MonthlySummary)**:
- 月ナビゲーション（◀ ▶）
- 月合計 + 1日平均
- 週ごとの内訳（月曜始まりで週分割）
- 1日平均の分母: 当月は今日までの日数、過去月は月の日数

### 設定画面 (SettingsView)

- Dropbox連携: 連携/解除ボタン、ステータス表示
- マスターパスワード: セッション内で設定
- 同期: 手動同期ボタン、最終同期日時、同期状態表示
- データエクスポート: JSON形式でダウンロード

---

## PWA設定

`vite-plugin-pwa` により自動生成。

- `registerType: 'autoUpdate'`: バックグラウンドで自動更新
- Service Worker: Workbox によるプリキャッシュ（JS, CSS, HTML, 画像）
- manifest: `display: standalone`, `theme_color: #2E7D32`
- アイコン: 192x192, 512x512（現在はプレースホルダー、要差し替え）

---

## デプロイ

GitHub Actions (`.github/workflows/deploy.yml`) により、`main` ブランチへの push で自動デプロイ。

1. `npm ci` → `npm run build`
2. `dist/` を GitHub Pages にアップロード

### 初回セットアップ

1. GitHub リポジトリの Settings > Pages > Source を「GitHub Actions」に設定
2. Dropbox App Console でアプリ作成（Scoped access, App folder）
3. `.env` に `VITE_DROPBOX_APP_KEY=<App Key>` を設定
4. Dropbox App Console の OAuth 2 Redirect URI に以下を登録:
   - 開発: `http://localhost:5173/sei-hin/`
   - 本番: `https://<username>.github.io/sei-hin/`
5. PWAアイコン（`public/icons/icon-192.png`, `icon-512.png`）を適切な画像に差し替え

---

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # TypeScriptチェック + プロダクションビルド
npm run preview  # ビルド結果のプレビュー
npm run lint     # ESLint実行
```
