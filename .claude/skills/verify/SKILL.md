---
name: verify
description: sei-hinの変更をdevサーバー+ブラウザで実際に動かして検証する手順
---

# sei-hin 動作検証手順

## 起動

- `.claude/launch.json` の `dev` 設定で `preview_start`（`npm run dev`、port 5173）
- URLは `http://localhost:5173/sei-hin/`（`base: '/sei-hin/'` のためパス必須）

## 検証の勘所

- Dropbox未接続（dev環境ではOAuthトークンなし）なので `connected=false`。
  同期API呼び出し自体は検証できない。同期スケジューリングは
  `localStorage.getItem('seihin-pending-sync')` で未同期フラグを観測する
- データはdev origin（localhost）のIndexedDBに入る。本番PWA（github.io）とは
  別originなので汚しても安全。検証後は追加したレコードを削除しておく
- 支出入力: FAB（今日の支出を追加）またはカレンダーの日セルクリックでダイアログ
- 削除確認は `window.confirm` を使うため、自動操作時は
  `window.confirm = () => true` をJSで先にスタブする

## 既知のハマりどころ

- **devでは支出ダイアログが開いた直後に勝手に閉じることがある**。
  StrictModeのエフェクト二重実行と `useDialogHistory` の
  `history.back()` の相互作用による dev限定の挙動（本番ビルドでは発生しない）。
  閉じたらリロードして再試行するか、JSで `.MuiFab-root` をクリックして
  すぐ操作する
- `npm install` すると package-lock.json に不要な差分（yamlエントリ削除）が
  出ることがある。コミット前に `git checkout -- package-lock.json` で戻す
- `npm run lint` は既存コードの `react-hooks/set-state-in-effect` エラーで
  元々失敗する（`.claude/worktrees/` の残骸もlint対象に入る）
