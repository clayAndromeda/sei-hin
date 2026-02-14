# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

sei-hin（清貧）は、食費記録・可視化のためのPWAアプリケーション。個人利用（1人用）。
ローカルDB（IndexedDB）にデータを保存し、Dropbox経由で暗号化同期する。

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動（Vite）
npm run build    # TypeScriptチェック + プロダクションビルド（tsc -b && vite build）
npm run lint     # ESLint実行
npm run preview  # ビルド結果のプレビュー
```

## 技術スタック

- React 19 + TypeScript 5.9 + Vite 7.3
- MUI v7（UIライブラリ）
- Dexie.js 4（IndexedDBラッパー）+ dexie-react-hooks（リアクティブクエリ）
- Dropbox SDK（OAuth PKCE、データ同期）
- Web Crypto API（AES-256-GCM + PBKDF2で暗号化）
- vite-plugin-pwa（Service Worker、オフライン対応）
- GitHub Pages にデプロイ（`base: '/sei-hin/'`）

## アーキテクチャ

### データフロー

ローカルDB（IndexedDB/Dexie）をSingle Source of Truthとし、UIはDexieの`useLiveQuery`でリアクティブに更新される。Dropboxとの同期はバックグラウンドで行い、マージ戦略は「同一IDのレコードは`updatedAt`が新しい方を採用」。削除は論理削除（`deleted: true`）で、同期完了後に物理削除する。

### レイヤー構成

- **services/**: DB定義（`db.ts`）、Dropbox API連携（`dropbox.ts`）、暗号化（`crypto.ts`）、同期マージロジック（`sync.ts`）
- **hooks/**: `useExpenses`（食費CRUD + リアクティブクエリ）、`useSync`（同期状態管理）
- **components/**: 3画面構成（Calendar / Summary / Settings）+ ExpenseDialog。BottomNavigationでタブ切替
- **utils/**: 日付ユーティリティ（月曜始まり）、金額フォーマット（`¥1,350`形式）

### 環境変数

- `VITE_DROPBOX_APP_KEY`: Dropbox App Key（`.env`ファイルで管理）

### 規約

- 日付は `"YYYY-MM-DD"` 文字列で統一
- 金額は整数（円）
- カレンダーは月曜始まり、日本語ロケール
- マスターパスワードはどこにも永続化せず、セッション中のみメモリ保持
