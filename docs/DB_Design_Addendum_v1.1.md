# DB追加設計書 v1.4 — テーブル定義

**作成日: 2026-02-13 / 最終更新: 2026-02-18**
**対象: 追加要件8件 + 顧客管理(CRM) + 不正検知条件ビルダー + 操作ログ + AI管理 に対応するDB設計**

> 本ドキュメントはDB_Design_ERD_v1.0.md（35テーブル / 24 ENUM）への差分追記。
> v1.0と合わせて「全64テーブル / 46 ENUM型」となる（v1.5現在）。

---

## 新規テーブル一覧

| # | グループ | テーブル名 | 用途 | 関連要件 |
|---|---------|----------|------|---------|
| 0a | 顧客CRM | customers | 顧客プロファイル（名寄せ済み） | v1.2 顧客管理 |
| 0b | 顧客CRM | customer_cards | 顧客のカード情報（トークン） | v1.2 顧客管理 |
| 0c | 顧客CRM | customer_notes | 運営/加盟店メモ | v1.2 顧客管理 |
| 1 | コア | sites | サイト情報（加盟店配下） | #7 マルチサイト |
| 2 | 決済リンク | payment_links | URL決済の設定 | #1 URL決済 |
| 3 | 継続決済 | subscription_plans | 継続/分割決済の商品設定 | #2 リカーリング |
| 4 | 継続決済 | subscription_users | 継続/分割決済のユーザー | #2 リカーリング |
| 5 | 共通 | announcements | 運営→加盟店のお知らせ | #4 お知らせ |
| 6 | 共通 | error_codes | エラーコードマスター | #3 エラーコード |
| 7 | 代理店 | agents | 代理店情報 | #6 代理店 |
| 8 | 代理店 | agent_users | 代理店ユーザー | #6 代理店 |
| 9 | 代理店 | agent_merchants | 代理店×加盟店紐付け | #6 代理店 |
| 10 | 代理店 | agent_commissions | 代理店報酬 | #6 代理店 |

---

## テーブル定義

### 0. customers（顧客プロファイル）🆕 v1.2

決済を行ったエンドユーザーの名寄せ済みプロファイル。簡易CRM機能の中核テーブル。

```sql
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID NOT NULL REFERENCES sites(id),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    customer_code   VARCHAR(20) UNIQUE NOT NULL,       -- CUS-XXXXXXXX（自動採番）
    -- 名寄せキー
    user_identifier VARCHAR(255),                      -- 加盟店側ユーザーID（最優先キー）
    email           VARCHAR(255),                      -- メールアドレス
    phone           VARCHAR(20),                       -- 電話番号
    name            VARCHAR(255),                      -- カード名義 or 氏名
    -- 統計（バッチ更新）
    total_transactions INTEGER NOT NULL DEFAULT 0,     -- 総取引回数
    total_amount    BIGINT NOT NULL DEFAULT 0,         -- LTV（累計決済額）
    successful_transactions INTEGER NOT NULL DEFAULT 0,-- 成功取引回数
    first_transaction_at TIMESTAMPTZ,                  -- 初回取引日
    last_transaction_at  TIMESTAMPTZ,                  -- 最終取引日
    average_amount  INTEGER NOT NULL DEFAULT 0,        -- 平均単価
    -- CRM
    risk_level      customer_risk_level NOT NULL DEFAULT 'low',
    tags            JSONB DEFAULT '[]',                -- タグ（VIP / リピーター 等）
    segment         customer_segment NOT NULL DEFAULT 'new', -- セグメント（自動判定）
    -- ステータス
    is_blocked      BOOLEAN NOT NULL DEFAULT false,    -- ブロック済みか
    blocked_at      TIMESTAMPTZ,
    blocked_reason  TEXT,
    -- タイムスタンプ
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_customers_site_user ON customers(site_id, user_identifier)
    WHERE user_identifier IS NOT NULL;
CREATE INDEX idx_customers_site_email ON customers(site_id, email)
    WHERE email IS NOT NULL;
CREATE INDEX idx_customers_merchant ON customers(merchant_id);
CREATE INDEX idx_customers_segment ON customers(segment);
CREATE INDEX idx_customers_last_txn ON customers(last_transaction_at DESC);
```

### 0-b. customer_cards（顧客カード情報）🆕 v1.2

```sql
CREATE TABLE customer_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customers(id),
    card_token      VARCHAR(255) NOT NULL,             -- CDE側トークン
    card_last4      VARCHAR(4) NOT NULL,               -- カード下4桁
    card_bin6       VARCHAR(6),                        -- BIN6桁（発行元特定用）
    card_brand      VARCHAR(20) NOT NULL,              -- VISA / MC / JCB / AMEX
    card_exp_month  INTEGER,                           -- 有効期限（月）
    card_exp_year   INTEGER,                           -- 有効期限（年）
    first_used_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_cards_customer ON customer_cards(customer_id);
CREATE INDEX idx_customer_cards_last4 ON customer_cards(card_last4);
```

### 0-c. customer_notes（顧客メモ）🆕 v1.2

```sql
CREATE TABLE customer_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customers(id),
    note_text       TEXT NOT NULL,
    created_by_type VARCHAR(20) NOT NULL,              -- 'admin' or 'merchant'
    created_by_id   UUID NOT NULL,                     -- admin_users.id or merchant_users.id
    created_by_name VARCHAR(100),                      -- 表示用の名前
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
```

### 1. sites（サイト情報）

加盟店配下のサイト/サービスを管理。全ての取引・設定はサイト単位で紐づく。

```sql
CREATE TABLE sites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    site_code       VARCHAR(20) UNIQUE NOT NULL,       -- サイトコード（自動採番）
    site_name       VARCHAR(255) NOT NULL,             -- サイト名
    site_url        VARCHAR(500) NOT NULL,             -- サイトURL
    industry        industry_type NOT NULL,            -- 業種（既存ENUM）
    business_model  business_model_type NOT NULL,      -- ビジネスモデル（既存ENUM）
    description     TEXT,                              -- サービス説明
    status          site_status NOT NULL DEFAULT 'pending', -- ステータス
    payment_methods JSONB NOT NULL DEFAULT '[]',       -- 利用決済手段
    fee_rate        JSONB,                             -- サイト別手数料率（ブランド別）
    settlement_cycle VARCHAR(50),                      -- 入金サイクル
    test_mode       BOOLEAN NOT NULL DEFAULT true,     -- テストモード
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ                        -- 論理削除
);

CREATE INDEX idx_sites_merchant ON sites(merchant_id);
CREATE INDEX idx_sites_status ON sites(status);
```

### 2. payment_links（決済リンク設定）

加盟店がURL決済（スイフトパス）を生成するための設定テーブル。

```sql
CREATE TABLE payment_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID NOT NULL REFERENCES sites(id),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    link_code       VARCHAR(64) UNIQUE NOT NULL,       -- URLに含まれるユニークコード
    link_type       payment_link_type NOT NULL,        -- 一括/金額入力型/金額選択型
    product_name    VARCHAR(255) NOT NULL,             -- 商品名
    amount          INTEGER,                           -- 決済額（金額入力型はNULL）
    amount_options  JSONB,                             -- 金額選択肢（金額選択型用）
    currency        VARCHAR(3) NOT NULL DEFAULT 'JPY',
    order_id_prefix VARCHAR(100),                      -- 注文IDプレフィックス
    user_id_field   BOOLEAN NOT NULL DEFAULT false,    -- ユーザー識別ID入力の要否
    custom_fields   JSONB DEFAULT '[]',                -- フリー項目設定
    expires_at      TIMESTAMPTZ,                       -- 有効期限（NULLで無制限）
    max_uses        INTEGER,                           -- 利用可能回数（NULLで無制限）
    current_uses    INTEGER NOT NULL DEFAULT 0,        -- 現在の利用回数
    status          link_status NOT NULL DEFAULT 'active',
    created_by      UUID REFERENCES merchant_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_links_site ON payment_links(site_id);
CREATE INDEX idx_payment_links_merchant ON payment_links(merchant_id);
CREATE INDEX idx_payment_links_code ON payment_links(link_code);
CREATE INDEX idx_payment_links_status ON payment_links(status);
```

### 3. subscription_plans（継続/分割決済の商品設定）

```sql
CREATE TABLE subscription_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id             UUID NOT NULL REFERENCES sites(id),
    merchant_id         UUID NOT NULL REFERENCES merchants(id),
    plan_type           subscription_type NOT NULL,    -- 'recurring' or 'installment'
    plan_name           VARCHAR(255) NOT NULL,         -- 商品名
    -- 継続決済用
    initial_amount      INTEGER,                       -- 初回決済金額
    recurring_amount    INTEGER,                       -- 自動決済金額
    billing_cycle_type  billing_cycle_type,            -- 指定間隔 / 月額
    cycle_days          INTEGER,                       -- サイクル日数（指定間隔の場合）
    billing_day         INTEGER,                       -- 毎月の決済日（月額の場合、1-28）
    -- 分割決済用
    total_amount        INTEGER,                       -- 商品総額
    installment_count   INTEGER,                       -- 分割回数
    -- 共通
    currency            VARCHAR(3) NOT NULL DEFAULT 'JPY',
    max_uses            INTEGER,                       -- 利用可能回数（NULLで無制限）
    expires_at          TIMESTAMPTZ,                   -- 有効期限
    status              plan_status NOT NULL DEFAULT 'active',
    payment_link_id     UUID REFERENCES payment_links(id), -- URL決済と紐づく場合
    created_by          UUID REFERENCES merchant_users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_plans_site ON subscription_plans(site_id);
CREATE INDEX idx_sub_plans_merchant ON subscription_plans(merchant_id);
CREATE INDEX idx_sub_plans_status ON subscription_plans(status);
```

### 4. subscription_users（継続/分割決済のユーザー）

```sql
CREATE TABLE subscription_users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id             UUID NOT NULL REFERENCES subscription_plans(id),
    site_id             UUID NOT NULL REFERENCES sites(id),
    merchant_id         UUID NOT NULL REFERENCES merchants(id),
    -- ユーザー情報
    email               VARCHAR(255),
    user_identifier     VARCHAR(255),                  -- 加盟店側のユーザーID
    card_token          VARCHAR(255),                  -- CDE側トークン（カード情報はCDE内）
    card_last4          VARCHAR(4),                    -- カード下4桁（表示用）
    card_brand          VARCHAR(20),                   -- カードブランド
    -- 決済状態
    status              subscription_user_status NOT NULL DEFAULT 'active',
    first_payment_date  DATE NOT NULL,                 -- 初回決済日
    next_payment_date   DATE,                          -- 次回決済日
    last_payment_date   DATE,                          -- 最終決済日
    -- 分割決済用
    paid_count          INTEGER NOT NULL DEFAULT 0,    -- 支払済み回数
    total_count         INTEGER,                       -- 分割総回数
    -- リトライ管理
    consecutive_failures INTEGER NOT NULL DEFAULT 0,   -- 連続失敗回数
    last_retry_date     DATE,                          -- 最終リトライ日
    -- カード変更URL
    card_change_token   VARCHAR(255),                  -- カード変更URL用トークン
    card_change_expires TIMESTAMPTZ,                   -- カード変更URLの有効期限
    -- タイムスタンプ
    stopped_at          TIMESTAMPTZ,                   -- 停止日時
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_users_plan ON subscription_users(plan_id);
CREATE INDEX idx_sub_users_site ON subscription_users(site_id);
CREATE INDEX idx_sub_users_merchant ON subscription_users(merchant_id);
CREATE INDEX idx_sub_users_status ON subscription_users(status);
CREATE INDEX idx_sub_users_next_payment ON subscription_users(next_payment_date)
    WHERE status = 'active';
-- ↑ リカーリングエンジンが毎日参照するため重要
```

### 5. announcements（お知らせ）

```sql
CREATE TABLE announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    announcement_type announcement_type NOT NULL,      -- 障害/メンテ/リリース/お知らせ
    priority        announcement_priority NOT NULL DEFAULT 'normal',
    target_type     VARCHAR(20) NOT NULL DEFAULT 'all', -- 'all' or 'specific'
    target_merchants JSONB DEFAULT '[]',               -- 特定加盟店向けの場合
    published_at    TIMESTAMPTZ,                       -- 公開日時（NULLで下書き）
    expires_at      TIMESTAMPTZ,                       -- 有効期限
    created_by      UUID REFERENCES admin_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_published ON announcements(published_at)
    WHERE published_at IS NOT NULL;
```

### 6. error_codes（エラーコードマスター）

```sql
CREATE TABLE error_codes (
    id              SERIAL PRIMARY KEY,
    error_code      VARCHAR(20) UNIQUE NOT NULL,       -- エラーコード
    category        error_category NOT NULL,            -- カテゴリ
    message_ja      TEXT NOT NULL,                      -- 日本語エラー文言
    message_en      TEXT,                               -- 英語エラー文言
    description     TEXT,                               -- 詳細説明
    resolution      TEXT,                               -- 対処法
    api_applicable  BOOLEAN NOT NULL DEFAULT true,      -- API決済対応
    link_applicable BOOLEAN NOT NULL DEFAULT true,      -- リンク決済対応
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7. agents（代理店情報）

```sql
CREATE TABLE agents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code      VARCHAR(20) UNIQUE NOT NULL,       -- 代理店コード
    agent_name      VARCHAR(255) NOT NULL,             -- 代理店名
    representative  VARCHAR(100),                      -- 代表者名
    phone           VARCHAR(20),
    email           VARCHAR(255) NOT NULL,
    address         TEXT,
    commission_rate DECIMAL(5,2),                      -- 基本紹介料率（%）
    contract_terms  JSONB,                             -- 契約条件（個別設定）
    status          agent_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);
```

### 8. agent_users（代理店ユーザー）

```sql
CREATE TABLE agent_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    username        VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    role            agent_role NOT NULL DEFAULT 'agent_viewer',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_users_agent ON agent_users(agent_id);
```

### 9. agent_merchants（代理店×加盟店紐付け）

```sql
CREATE TABLE agent_merchants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    referred_at     DATE NOT NULL,                     -- 紹介日
    commission_rate DECIMAL(5,2),                      -- 個別紹介料率（NULLで代理店デフォルト）
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agent_id, merchant_id)
);

CREATE INDEX idx_agent_merchants_agent ON agent_merchants(agent_id);
CREATE INDEX idx_agent_merchants_merchant ON agent_merchants(merchant_id);
```

### 10. agent_commissions（代理店報酬）

```sql
CREATE TABLE agent_commissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    period_start    DATE NOT NULL,                     -- 対象期間（開始）
    period_end      DATE NOT NULL,                     -- 対象期間（終了）
    total_volume    BIGINT NOT NULL DEFAULT 0,         -- 期間内取引総額
    commission_rate DECIMAL(5,2) NOT NULL,             -- 適用紹介料率
    commission_amount BIGINT NOT NULL DEFAULT 0,       -- 報酬額
    status          commission_status NOT NULL DEFAULT 'pending',
    paid_at         TIMESTAMPTZ,                       -- 支払日
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_commissions_agent ON agent_commissions(agent_id);
CREATE INDEX idx_agent_commissions_period ON agent_commissions(period_start, period_end);
```

---

## 既存テーブルの変更

### merchants テーブル

```sql
ALTER TABLE merchants ADD COLUMN agent_id UUID REFERENCES agents(id);
CREATE INDEX idx_merchants_agent ON merchants(agent_id);
-- 代理店経由の加盟店を紐付け。NULLの場合は直販。
```

### transactions テーブル

```sql
ALTER TABLE transactions ADD COLUMN site_id UUID REFERENCES sites(id);
ALTER TABLE transactions ADD COLUMN subscription_user_id UUID REFERENCES subscription_users(id);
ALTER TABLE transactions ADD COLUMN payment_link_id UUID REFERENCES payment_links(id);
ALTER TABLE transactions ADD COLUMN customer_id UUID REFERENCES customers(id);
CREATE INDEX idx_transactions_site ON transactions(site_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
-- 全取引がサイト単位で紐づく。既存データはマイグレーション時にデフォルトサイトを作成して紐付け。
-- customer_id は決済実行時に名寄せロジックで自動付与。
```

### merchant_processors テーブル

```sql
ALTER TABLE merchant_processors ADD COLUMN site_id UUID REFERENCES sites(id);
CREATE INDEX idx_merchant_processors_site ON merchant_processors(site_id);
-- 接続先はサイト単位で管理。加盟店全体に適用する場合はsite_id = NULL。
```

### routing_rules テーブル

```sql
ALTER TABLE routing_rules ADD COLUMN site_id UUID REFERENCES sites(id);
CREATE INDEX idx_routing_rules_site ON routing_rules(site_id);
-- ルーティングルールもサイト単位で設定可能。site_id = NULLの場合は加盟店全体に適用。
```

### routing_logs テーブル

```sql
ALTER TABLE routing_logs ADD COLUMN site_id UUID REFERENCES sites(id);
-- ルーティングログにもサイトIDを記録。
```

---

## 追加ENUM型（11型）

```sql
-- 顧客リスクレベル 🆕 v1.2
CREATE TYPE customer_risk_level AS ENUM (
    'low', 'medium', 'high', 'blocked'
);

-- 顧客セグメント 🆕 v1.2
CREATE TYPE customer_segment AS ENUM (
    'new',          -- 初回（1回のみ）
    'returning',    -- リピーター（2-10回）
    'loyal',        -- ロイヤル（11回以上 or LTV ¥100,000以上）
    'dormant',      -- 休眠（90日以上取引なし）
    'churned'       -- 離脱（180日以上取引なし）
);

-- サイトステータス
CREATE TYPE site_status AS ENUM (
    'pending',      -- 審査中
    'active',       -- 有効
    'suspended',    -- 一時停止
    'terminated'    -- 解約
);

-- 決済リンクタイプ
CREATE TYPE payment_link_type AS ENUM (
    'fixed',            -- 一括決済（固定金額）
    'amount_input',     -- 金額入力型
    'amount_select'     -- 金額選択型
);

-- 決済リンクステータス
CREATE TYPE link_status AS ENUM (
    'active',       -- 有効
    'inactive',     -- 無効
    'expired'       -- 期限切れ
);

-- サブスクリプションタイプ
CREATE TYPE subscription_type AS ENUM (
    'recurring',    -- 継続決済（月額課金等）
    'installment'   -- 分割決済
);

-- 課金サイクルタイプ
CREATE TYPE billing_cycle_type AS ENUM (
    'interval',     -- 指定間隔（N日ごと）
    'monthly'       -- 月額（毎月N日）
);

-- サブスクリプションプランステータス
CREATE TYPE plan_status AS ENUM (
    'active', 'paused', 'archived'
);

-- サブスクリプションユーザーステータス
CREATE TYPE subscription_user_status AS ENUM (
    'active',           -- 課金中
    'paused',           -- 一時停止
    'stopped',          -- 停止（再開不可）
    'completed',        -- 分割完了
    'failed_stopped'    -- 3回失敗で自動停止
);

-- お知らせタイプ
CREATE TYPE announcement_type AS ENUM (
    'incident',     -- 障害情報
    'maintenance',  -- メンテナンス
    'release',      -- 機能リリース
    'info'          -- お知らせ
);

-- お知らせ優先度
CREATE TYPE announcement_priority AS ENUM (
    'critical', 'high', 'normal', 'low'
);

-- エラーカテゴリ
CREATE TYPE error_category AS ENUM (
    'card_error',       -- カード理由
    'system_error',     -- システムエラー
    'validation_error', -- 入力エラー
    'auth_error',       -- 認証エラー
    'network_error',    -- 通信エラー
    'processor_error'   -- 接続先エラー
);

-- 代理店ステータス
CREATE TYPE agent_status AS ENUM (
    'active', 'suspended', 'terminated'
);

-- 代理店ロール
CREATE TYPE agent_role AS ENUM (
    'agent_admin',  -- 代理店管理者
    'agent_viewer'  -- 代理店閲覧者
);

-- 報酬ステータス
CREATE TYPE commission_status AS ENUM (
    'pending', 'confirmed', 'paid'
);
```

---

## リカーリングエンジン — リトライロジック

```
毎日AM 2:00 に実行するバッチジョブ:

1. subscription_users WHERE status = 'active' AND next_payment_date = TODAY を取得
2. 各ユーザーに対して決済APIを実行
3. 成功 → consecutive_failures = 0, next_payment_date を次サイクルに更新
4. 失敗 →
   a. consecutive_failures += 1
   b. consecutive_failures < 3 → next_payment_date = TODAY + 10日（リトライ）
   c. consecutive_failures >= 3 → status = 'failed_stopped'（自動停止。Phase 1では再開不可。質問票 B-1 方向性: Phase 2以降で再開機能を検討）
   d. 停止時は加盟店にメール通知

※分割決済の場合:
  paid_count >= total_count → status = 'completed'
```

---

## マイグレーション方針

### 既存データの対応（マルチサイト導入時）

```
1. 既存の全merchants に対して、デフォルトの sites レコードを1件ずつ自動生成
   - site_name = merchant.name + " デフォルトサイト"
   - site_url = merchant.url
   - status = merchant.status に連動
2. 既存の transactions.site_id にデフォルトサイトのIDを設定
3. 既存の merchant_processors.site_id にデフォルトサイトのIDを設定
4. 既存の routing_rules.site_id はNULL（加盟店全体に適用）のまま
```

---

## テーブル数サマリー

| 区分 | v1.0 | v1.1追加 | v1.2追加 | 合計（v1.2時点） |
|------|------|---------|---------|------|
| テーブル | 35 | 10 | 5 | **50** |
| ENUM | 24 | 8 | 4 | **36** |

> ※ v1.3〜v1.5の追加を含めた最終合計は下部「テーブル数サマリー（v1.5更新）」を参照。

---

## v1.3追加: ローリングリザーブ管理テーブル

### rolling_reserve_settings（リザーブ設定）

加盟店×接続先ごとのリザーブ条件を管理。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| merchant_id | UUID | FK → merchants |
| processor_id | UUID | FK → processors |
| reserve_rate | DECIMAL(5,2) | リザーブ率（%）。例: 10.00 |
| reserve_period_days | INT | リザーブ期間（日数）。例: 180 |
| is_active | BOOLEAN | 有効/無効 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |
| updated_by | UUID | FK → users（変更者） |

UNIQUE制約: (merchant_id, processor_id)

### rolling_reserve_transactions（リザーブ留保/解放履歴）

個別の留保・解放トランザクションを記録。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| setting_id | UUID | FK → rolling_reserve_settings |
| merchant_id | UUID | FK → merchants |
| processor_id | UUID | FK → processors |
| type | ENUM reserve_tx_type | 'hold'（留保）/ 'release'（解放） |
| amount | DECIMAL(12,0) | 金額（正数） |
| balance_after | DECIMAL(12,0) | この取引後のリザーブ残高 |
| settlement_id | UUID | FK → settlements（NULLable: 期間解放の場合） |
| source_period | VARCHAR(50) | 対象精算期間 or 留保元期間 |
| executed_at | TIMESTAMP | 実行日時 |
| created_at | TIMESTAMP | 作成日時 |

### ENUM: reserve_tx_type

| 値 | 説明 |
|-----|------|
| hold | 留保（精算時に売上の一定割合を留保） |
| release | 解放（リザーブ期間経過後に加盟店へ返還） |

---

## v1.4追加: 不正検知・AI・操作ログ・通知 関連テーブル（2026-02-18追加）

ワイヤーフレーム v3 最新版の全画面精査に基づき、不足テーブルを追加。

### 追加テーブル一覧

| # | グループ | テーブル名（仮） | 用途 | 関連画面 |
|---|---------|----------------|------|---------|
| 1 | 不正検知 | fraud_rules | 不正検知ルール定義 | M07 |
| 2 | 不正検知 | fraud_rule_conditions | ルールの条件グループ・条件行 | M07 |
| 3 | 不正検知 | fraud_blocklist | BIN/IP/メール/デバイスのブロック・ホワイトリスト | M07 |
| 4 | 不正検知 | fraud_detection_logs | 検知ログ（ルール発火履歴） | M07 |
| 5 | 不正検知 | fraud_merchant_overrides | 加盟店別ルール閾値オーバーライド | M07 |
| 6 | AI | ai_models | AIモデルバージョン管理 | M05, M07 |
| 7 | AI | ai_model_metrics | AIモデル精度メトリクス履歴 | M05, M07 |
| 8 | AI | ai_prompts | AIプロンプト設定（6種） | M13 API設定タブ |
| 9 | AI | ai_chat_sessions | AIチャット会話セッション | M01, S12 |
| 10 | AI | ai_chat_messages | AIチャットメッセージ | M01, S12 |
| 11 | 通知 | notification_channels | 通知チャネル設定（Slack/Email/SMS） | M13 通知タブ |
| 12 | 通知 | notification_rules | イベント別通知ルール | M13 通知タブ |
| 13 | 監査 | audit_logs | 管理画面操作ログ（PCI DSS準拠） | M13 操作ログタブ |
| 14 | 接続先審査 | processor_applications | 接続先審査申込 | M06, M09b |

### fraud_rules（不正検知ルール）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| rule_code | VARCHAR(20) | ルールコード（FR-001等） |
| name | VARCHAR(255) | ルール名 |
| type | fraud_rule_type | 種別（金額閾値/速度チェック/地域制限/時間帯+金額/AI判定/パターン/リスト照合） |
| action | fraud_action | 検知時アクション（自動ブロック/例外キュー送り/例外キュー送り（確認）/フラグのみ） |
| priority | INT | 優先順位（小さいほど先に評価） |
| is_enabled | BOOLEAN | 有効/無効 |
| is_test_mode | BOOLEAN | テストモード（検知のみ、ブロックしない） |
| scope | VARCHAR(20) | 適用スコープ（global/merchant_specific） |
| scope_merchant_ids | JSONB | 加盟店指定時のID配列 |
| hits_30d | INT | 30日間の検知数（バッチ集計） |
| created_by | UUID | 作成者 |
| approved_by | UUID | 承認者（admin→super_admin承認フロー） |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

### fraud_rule_conditions（ルール条件）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| rule_id | UUID | FK → fraud_rules |
| group_index | INT | グループ番号（グループ間はAND） |
| group_logic | VARCHAR(3) | グループ内の論理（AND/OR） |
| field | VARCHAR(50) | 条件フィールド（amount/card_country/ai_score等35種） |
| operator | VARCHAR(20) | 演算子（>/>=/</<=/==/!=/between/in/not_in/contains/blocklist/cidr/new等） |
| value | TEXT | 比較値 |
| value2 | TEXT | 範囲上限値（between演算子用） |
| time_window | VARCHAR(20) | 時間窓（速度系: 1分/5分/1時間/24時間/30日等） |
| sort_order | INT | グループ内の表示順 |

### fraud_blocklist（ブロック/ホワイトリスト）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| list_type | VARCHAR(10) | block / white / ng_list |
| entry_type | VARCHAR(20) | BIN/IP/メール/デバイスID/カスタム |
| value | TEXT | エントリ値 |
| reason | TEXT | 登録理由 |
| expires_at | TIMESTAMPTZ | 有効期限（NULLで永久） |
| added_by | UUID | 登録者 |
| created_at | TIMESTAMPTZ | 登録日時 |

### fraud_detection_logs（検知ログ）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| transaction_id | UUID | FK → transactions |
| rule_id | UUID | FK → fraud_rules |
| action_taken | fraud_action | 実際に取られたアクション |
| score | DECIMAL(5,4) | AI不正スコア（該当する場合） |
| matched_conditions | JSONB | マッチした条件の詳細 |
| is_false_positive | BOOLEAN | 誤検知フラグ（事後判定） |
| reviewed_by | UUID | 確認者 |
| reviewed_at | TIMESTAMPTZ | 確認日時 |
| created_at | TIMESTAMPTZ | 検知日時 |

### fraud_merchant_overrides（加盟店別閾値オーバーライド）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| merchant_id | UUID | FK → merchants |
| rule_id | UUID | FK → fraud_rules |
| override_conditions | JSONB | オーバーライドする条件（元条件を上書き） |
| is_enabled | BOOLEAN | 有効/無効 |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

UNIQUE制約: (merchant_id, rule_id)

### ai_models（AIモデル管理）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| module | ai_module_type | モジュール種別（fraud/review/routing/chat/prediction） |
| version | VARCHAR(20) | バージョン（v2.1等） |
| status | ai_model_status | ステータス（training/shadow/active/retired） |
| accuracy | DECIMAL(5,2) | 精度 |
| precision_score | DECIMAL(5,2) | 適合率 |
| recall | DECIMAL(5,2) | 再現率 |
| f1_score | DECIMAL(5,2) | F1スコア |
| false_positive_rate | DECIMAL(5,4) | 誤検知率 |
| training_data_count | INT | 学習データ件数 |
| trained_at | TIMESTAMPTZ | 学習完了日時 |
| activated_at | TIMESTAMPTZ | 本番投入日時 |
| created_at | TIMESTAMPTZ | 作成日時 |

### ai_prompts（AIプロンプト設定）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| function_name | VARCHAR(50) | 機能名（fraud_detection/review/chat_support/report/url_patrol/routing） |
| display_name | VARCHAR(100) | 表示名 |
| model | VARCHAR(50) | 使用モデル（claude-4-opus等） |
| max_tokens | INT | 最大トークン数 |
| temperature | DECIMAL(3,2) | Temperature |
| system_prompt | TEXT | システムプロンプト |
| is_active | BOOLEAN | 有効フラグ |
| updated_by | UUID | 更新者 |
| updated_at | TIMESTAMPTZ | 更新日時 |

### audit_logs（操作ログ）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | BIGSERIAL | PK |
| user_id | UUID | 操作者 |
| user_type | VARCHAR(20) | admin/merchant/agent |
| user_name | VARCHAR(100) | 表示名 |
| action_type | VARCHAR(50) | 操作種別（画面操作/データ変更/メール送信/ログイン/ログアウト） |
| target_page | VARCHAR(100) | 対象ページ |
| target_url | TEXT | URL/詳細 |
| ip_address | INET | IPアドレス |
| user_agent | TEXT | User-Agent |
| details | JSONB | 変更内容の詳細 |
| created_at | TIMESTAMPTZ | 操作日時 |

パーティション: created_at で月次パーティション
保持ポリシー（PCI DSS v4.0 Req 10.5.1準拠）:
  - 直近3ヶ月: RDS PostgreSQL（即時検索可能、月次パーティション）
  - 3〜12ヶ月: S3 Standard（アーカイブだが即日アクセス可能、Parquet形式）
  - 12ヶ月以降: S3 Glacier Deep Archive（コンプライアンス保管、復元に12-48時間）
  ※ 合計12ヶ月以上のログを即時〜アーカイブで保持
  ※ SIEM（CloudWatch Logs Insights / Security Hub）で自動日次レビュー実施

### processor_applications（接続先審査）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| application_id | UUID | FK → merchant_applications |
| site_id | UUID | FK → sites |
| processor_id | UUID | FK → processors |
| status | proc_app_status | ステータス（pending/api_review/merchant_registration/test_transaction/approved/rejected） |
| api_review_status | VARCHAR(20) | API審査ステータス |
| merchant_reg_status | VARCHAR(20) | 加盟店登録ステータス |
| test_txn_status | VARCHAR(20) | テスト決済ステータス |
| external_merchant_id | VARCHAR(100) | 接続先側の加盟店ID |
| notes | TEXT | メモ |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

### 追加ENUM型（v1.4）

```sql
CREATE TYPE fraud_rule_type AS ENUM (
    'amount_threshold', 'velocity', 'geo_restriction',
    'time_amount', 'ai_score', 'pattern', 'list_match', 'custom'
);

CREATE TYPE fraud_action AS ENUM (
    'auto_block', 'queue_review', 'queue_review_confirm', 'flag_only'
);

CREATE TYPE ai_module_type AS ENUM (
    'fraud', 'review', 'routing', 'chat', 'prediction', 'url_patrol'
);

CREATE TYPE ai_model_status AS ENUM (
    'training', 'shadow', 'active', 'retired'
);

CREATE TYPE proc_app_status AS ENUM (
    'pending', 'api_review', 'merchant_registration',
    'test_transaction', 'approved', 'rejected'
);
```

---

## v1.5追加: チャージバック・決済制限候補 関連テーブル（2026-02-21追加）

要件の詰め（デポジット管理・チャージバック未収リスク検知・決済制限候補）に基づき追加。

### 追加テーブル一覧

| # | グループ | テーブル名 | 用途 | 関連画面 |
|---|---------|----------|------|---------|
| 1 | 精算 | chargebacks | チャージバック案件管理 | M08 |
| 2 | 不正検知 | fraud_candidates | 決済制限候補（AI/ルール自動検知） | M07 |

### chargebacks（チャージバック案件管理）

チャージバック発生から解決までの案件を管理。未収リスク検知時はM02例外キューに自動エスカレーション。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| transaction_id | UUID | FK → transactions（対象取引） |
| merchant_id | UUID | FK → merchants |
| site_id | UUID | FK → sites（NULLable） |
| case_number | VARCHAR(50) | アクワイアラ/ブランド発番のケース番号 |
| reason_code | VARCHAR(20) | チャージバック理由コード（ブランド別） |
| reason_description | TEXT | 理由の説明 |
| amount | DECIMAL(12,0) | チャージバック金額 |
| currency | VARCHAR(3) | 通貨コード |
| original_amount | DECIMAL(12,0) | 元取引金額 |
| status | ENUM chargeback_status | ステータス |
| received_at | TIMESTAMP | CB受領日時 |
| deadline_at | TIMESTAMP | 反論期限（ブランド規定） |
| responded_at | TIMESTAMP | 反論提出日時（NULLable） |
| resolved_at | TIMESTAMP | 解決日時（NULLable） |
| resolution | ENUM chargeback_resolution | 解決種別（NULLable） |
| reserve_deducted | DECIMAL(12,0) | リザーブから充当した金額（0の場合あり） |
| is_uncollectible_risk | BOOLEAN | 未収リスクフラグ（取扱高不足時にtrue） |
| merchant_balance_at_cb | DECIMAL(12,0) | CB発生時の加盟店取扱高残高 |
| exception_queue_id | UUID | FK → exception_queue（エスカレーション先、NULLable） |
| evidence_files | JSONB | 証拠資料メタデータ（ファイルパス・種類・アップロード日） |
| admin_adjusted_amount | DECIMAL(12,0) | 管理者による金額手動編集後の金額（NULLable） |
| admin_adjust_reason | TEXT | 金額編集理由（NULLable） |
| admin_adjusted_by | UUID | FK → users（編集者、NULLable） |
| admin_adjusted_at | TIMESTAMP | 編集日時（NULLable） |
| notes | TEXT | 内部メモ |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

INDEX: (merchant_id, status), (transaction_id), (received_at), (is_uncollectible_risk, status)

### ENUM: chargeback_status

| 値 | 説明 |
|-----|------|
| received | 受領（アクワイアラから通知受信） |
| investigating | 調査中（証拠収集） |
| rebuttal_submitted | 反論提出済 |
| won | 勝訴（CB取消） |
| lost | 敗訴（CB確定） |
| withdrawn | 取下げ（顧客側取消） |
| expired | 期限切れ（反論なし→自動敗訴） |

### ENUM: chargeback_resolution

| 値 | 説明 |
|-----|------|
| merchant_won | 加盟店勝訴（CBを覆した） |
| merchant_lost | 加盟店敗訴（CB確定） |
| merchant_accepted | 加盟店受入（反論せず） |
| withdrawn_by_cardholder | カード会員取下げ |
| expired_no_response | 期限切れ（未対応） |

### fraud_candidates（決済制限候補）

AI/ルールベースで自動検知された制限候補。運営スタッフが採用/不採用を判断。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| type | ENUM fraud_candidate_type | 候補種別 |
| value | VARCHAR(255) | 対象の値（BIN/IP/メール等） |
| reason | TEXT | 検出理由 |
| risk_score | INTEGER | リスクスコア（0-100） |
| status | ENUM fraud_candidate_status | ステータス |
| detected_by | VARCHAR(50) | 検出元（'ai_model' / 'rule_engine' / ルールID等） |
| related_txn_count | INTEGER | 関連取引数 |
| related_merchant_count | INTEGER | 関連加盟店数 |
| detected_at | TIMESTAMP | 検出日時 |
| expires_at | TIMESTAMP | 自動期限切れ日時（検出から30日） |
| reviewed_by | UUID | FK → users（レビュー担当者、NULLable） |
| reviewed_at | TIMESTAMP | レビュー日時（NULLable） |
| review_note | TEXT | レビューメモ（不採用理由等、NULLable） |
| blocklist_id | UUID | FK → fraud_blocklist（採用時に追加されたブロックリストID、NULLable） |
| created_at | TIMESTAMP | 作成日時 |

INDEX: (status, detected_at), (type, value), (expires_at)

### ENUM: fraud_candidate_type

| 値 | 説明 |
|-----|------|
| card_bin | カードBIN（先頭6-8桁） |
| ip_address | IPアドレス |
| email | メールアドレス |
| email_domain | メールドメイン |
| device_fingerprint | デバイスフィンガープリント |

### ENUM: fraud_candidate_status

| 値 | 説明 |
|-----|------|
| pending | 未処理（レビュー待ち） |
| approved | 採用（ブロックリストに追加済み） |
| rejected | 不採用（除外） |
| expired | 期限切れ（30日超過で自動失効） |

---

## テーブル数サマリー（v1.5更新）

| 区分 | v1.0 | v1.1追加 | v1.2追加 | v1.3追加 | v1.4追加 | v1.5追加 | 合計 |
|------|------|---------|---------|---------|---------|---------|------|
| テーブル | 35 | 10 | 5 | 2 | 10 | 2 | **64** |
| ENUM | 24 | 8 | 4 | 1 | 5 | 4 | **46** |
