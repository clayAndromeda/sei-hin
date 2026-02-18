# ディレクトリ構造

```
src/
├── types/        # 型定義
├── constants/    # 定数（カテゴリなど）
├── services/     # DB、Dropbox、同期、暗号化
├── hooks/        # カスタムHooks（支出CRUD、同期、週予算）
├── utils/        # ユーティリティ（日付、金額フォーマット、グラフ変換）
├── components/   # UIコンポーネント
│   ├── Calendar/       # カレンダー画面
│   ├── Summary/        # サマリー画面
│   ├── Settings/       # 設定画面
│   └── ExpenseDialog/  # 支出入力ダイアログ
├── App.tsx       # メインアプリ（タブナビゲーション、同期UI）
└── main.tsx      # エントリーポイント
```
