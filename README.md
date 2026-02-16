# AI Payment System - ワイヤーフレーム

決済代行システム（PSP）管理画面のインタラクティブワイヤーフレーム

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開く

## デプロイ

```bash
npm run build
```

`dist/` フォルダが生成される → Vercel等にデプロイ可能

## ファイル構成

```
├── src/
│   ├── wireframes_v3.jsx   # ワイヤーフレーム本体（34画面）
│   ├── App.jsx             # エントリーポイント
│   ├── main.jsx            # React マウント
│   └── index.css           # Tailwind CSS
├── docs/
│   ├── Screen_Specification_v1.0.md  # 画面仕様書
│   ├── DB_Design_Addendum_v1.1.md    # DB設計書
│   └── AQUAGATES_Gap_Analysis.md     # ギャップ分析
├── CLAUDE.md               # AI開発ガイド
├── index.html
├── package.json
└── vite.config.js
```
# ai-payment-system
