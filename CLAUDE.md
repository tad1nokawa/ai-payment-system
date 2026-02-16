# AI Payment System - ワイヤーフレーム

## プロジェクト概要
決済代行システム（PSP）の管理画面ワイヤーフレーム。React + Tailwind CSSの単一ファイル構成。

## 技術スタック
- React 19 + Vite
- Tailwind CSS v4
- 単一ファイル: `src/wireframes_v3.jsx`（6,467行）

## 画面構成（34画面）

### マスター管理（16画面）M01-M16
- M01: ダッシュボード / M02: 例外キュー / M03: 加盟店管理
- M04: 申込・登録管理 / M05: AI監視 / M06: トランザクション監視
- M07: 不正検知設定 / M08: 精算管理 / M09: 接続先管理
- M10: ルーティング設定 / M11: レポート / M12: ユーザー管理
- M13: システム設定 / M14: リカーリング管理 / M15: 代理店管理
- M16: 顧客管理

### 加盟店管理（11画面）S01-S11
- S01: ダッシュボード / S02: 取引一覧 / S03: 売上レポート
- S04: 入金管理 / S05: API設定 / S06: AIチャット
- S07: ユーザー管理 / S08: アカウント設定 / S09: 決済リンク管理
- S10: 継続・分割決済 / S11: 顧客管理

### 代理店管理（5画面）D01-D05
- D01: ダッシュボード / D02: 加盟店一覧 / D03: レポート
- D04: 紹介管理 / D05: アカウント設定

### 公開画面（2画面）P01-P02
- P01: 加盟店申込フォーム / P02: 決済ページ

## コード構造
- 共通UI: Sidebar, KPICard, TableHeader, Badge, MiniChart
- データ: merchantData, processorList, reviewFlowData, approvedHistory
- メニュー: masterMenuItems, merchantMenuItems, agentMenuItems
- メインApp: `export default function Wireframes()`

## 開発ルール
- セクションコメント形式: `// ─── [SCREEN_ID]: [日本語名] ───`
- コンポーネントは全てトップレベル（depth=0）で定義
- モーダルはコンポーネントのルートdiv内に配置
- hooksを使うコンポーネントは `() => {` 構文、使わないものは `() => (` 構文

## 関連ドキュメント
- `docs/Screen_Specification_v1.0.md` - 画面仕様書（34画面）
- `docs/DB_Design_Addendum_v1.1.md` - DB設計（50テーブル、36 ENUM）
- `docs/AQUAGATES_Gap_Analysis.md` - ギャップ分析
