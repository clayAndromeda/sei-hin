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

## データ形式・規約

- **日付**: `"YYYY-MM-DD"` 文字列統一（例: `"2026-02-14"`）
- **金額**: 整数（円）
- **カレンダー**: 月曜始まり、日本語ロケール
- **カテゴリ**: `'food' | 'transport' | 'entertainment' | 'books' | 'other'`
- **特別な支出**: `isSpecial: true`で予算外としてマーク（予算計算から除外）

## デプロイ設定

- **URL**: `https://<user>.github.io/sei-hin/`
- **vite.config.ts**: `base: '/sei-hin/'`
- **PWA manifest**: `scope: '/sei-hin/'`, `start_url: '/sei-hin/'`, `theme_color: '#2E7D32'`

## 開発時の注意点

- **命名**: 英語、コメントは日本語
- **日付処理**: 必ず`utils/date.ts`の関数を使用（月曜始まり対応）
- **金額表示**: `utils/format.ts`の`formatCurrency()`使用
- **リアクティブクエリ**: DB変更時は自動でUIが更新される（`useLiveQuery`）
- **同期タイミング**: 起動時 + CRUD操作後30秒デバウンス
- **予算計算**: `isSpecial: true`の支出は予算から除外される
- **テスト**: テストファイルはソースと同じディレクトリに `*.test.ts` で配置。`npm test` で全テスト実行

## 詳細ドキュメント

- [アーキテクチャ詳細](docs/architecture.md) - データフロー、同期フロー、DB設計、UI構成
- [APIリファレンス](docs/api-reference.md) - 主要Hooks・関数の一覧
- [ディレクトリ構造](docs/directory-structure.md) - ファイル構成の詳細
