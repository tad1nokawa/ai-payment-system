# AI Payment System

決済代行システム（PSP）管理画面のインタラクティブワイヤーフレーム

## デモ

**Vercel**: https://aipayment-system.vercel.app/

## 技術スタック

- **React 19** + **Vite 6**
- **Tailwind CSS v4** （`@theme` ブロックによるデザイントークン定義）
- **Lucide React** — 94アイコン（tree-shakeable）
- **Google Fonts** — Inter + Noto Sans JP
- デプロイ: Vercel（GitHub mainブランチ自動デプロイ）

## デザインシステム: Stripe風クリーン

- ブランドカラー: `#635BFF`（インディゴ/パープル）— brand-50〜brand-900
- セマンティックカラー: success / warning / danger / info
- 白ベース + 微細なボーダー + エレガントなシャドウ
- Lucide Reactアイコン（絵文字不使用）
- ライトサイドバー（`bg-white + border-r`）
- アニメーション: fade-in / scale-in / slide-in-right

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

`dist/` フォルダが生成される → Vercel自動デプロイ

## ファイル構成

```
├── src/
│   ├── wireframes_v3.jsx   # ワイヤーフレーム本体（37画面、約14,500行）
│   ├── App.jsx             # エントリーポイント
│   ├── main.jsx            # React マウント
│   └── index.css           # デザイントークン（@theme）+ ベーススタイル
├── docs/
│   ├── Screen_Specification_v1.0.md    # 画面仕様書（36画面）
│   ├── Feature_List_v2.0.md            # 機能一覧 v2.0
│   ├── DB_Design_ERD_v1.0.md           # ベースDB設計書（35テーブル）
│   ├── DB_Design_Addendum_v1.1.md      # DB追加設計（+29テーブル）
│   ├── System_Architecture_v1.0.md     # システム全体構成書
│   ├── Core_System_Integration_v2.0.md # API一覧（143件）
│   ├── Internal_API_Specification_v1.0.md # 内部API仕様（15件）
│   ├── Screen_Logic_Gaps_v2.0.md       # 画面ロジック定義（39項目）
│   ├── Requirements_Priority.md        # 要件優先度マトリクス
│   ├── Requirements_Questionnaire_v1.0.md # 現場確認質問票（48問）
│   ├── AQUAGATES_Gap_Analysis.md       # ギャップ分析
│   ├── AQUAGATES_Screen_Mapping.md     # 画面マッピング（54画面）
│   ├── PCI_DSS_Compliance_Report.html  # PCI DSS v4.0準拠レポート
│   └── system_architecture_visual.html # システム構成図ビジュアル
├── CLAUDE.md               # AI開発ガイド
├── index.html              # HTMLエントリ（Google Fonts読み込み含む）
├── package.json            # 依存: react, tailwindcss, lucide-react
└── vite.config.js
```

## 画面構成（37画面）

| カテゴリ | 画面数 | 概要 |
|---------|--------|------|
| マスター管理 | 17画面 | PSP運用: ダッシュボード、例外キュー、加盟店、審査、精算、接続先、不正検知、AI監視等 |
| 加盟店管理 | 12画面 | 加盟店向け: ダッシュボード、取引、売上、入金、API設定、決済リンク、継続課金等 |
| 代理店管理 | 5画面 | 代理店向け: ダッシュボード、紹介先、報酬、アカウント設定 |
| 公開画面 | 3画面 | 加盟店申込、決済ページ、代理店申込 |

## 共有コンポーネント

| コンポーネント | 概要 |
|--------------|------|
| **Sidebar** | ライトテーマ、カテゴリセパレーター、Lucideアイコン、brand-500アクティブ |
| **KPICard** | トレンドアイコン付き数値カード、hover shadow |
| **Badge** | ステータスバッジ（rounded-md、セマンティックカラー） |
| **TableHeader** | ソート可能テーブルヘッダー、border-b区切り |
| **MiniChart** | SVGスパークライン（brand-500ストローク） |
| **ToastProvider** | Lucideアイコン付き通知トースト |
| **ConfirmDialog** | animate-scale-in確認ダイアログ |
| **AIChat** | グローバルAIチャット（全画面フローティング、コンテキスト対応） |
