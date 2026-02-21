# DB設計書 v1.0 — ベーステーブル定義

**作成日: 2026-02-11 / 最終更新: 2026-02-21**
**対象: PSP管理システム基盤テーブル — 35テーブル / 24 ENUM型**

> 本ドキュメントはPSPシステムの基盤DB設計。追加要件（CRM・代理店・マルチサイト・リカーリング・不正検知AI等）は `DB_Design_Addendum_v1.1.md` を参照。
> v1.0 + Addendum で「全64テーブル / 46 ENUM型」（v1.5現在）。

---

## スキーマ概要

| 項目 | 値 |
|------|-----|
| RDBMS | PostgreSQL 15+ |
| スキーマバージョン | v1.0 |
| テーブル数 | 35 |
| ENUM型数 | 24 |
| マルチテナント方式 | merchant_id によるデータ分離 |
| PCI DSS | カード番号なし（CDE側トークン参照のみ） |
| パーティション | transactions（月次）, admin_logs（月次） |

---

## テーブル一覧

| # | グループ | テーブル名 | 用途 |
|---|---------|----------|------|
| 1 | 取引コア | transactions | 決済トランザクション |
| 2 | 取引コア | transaction_logs | トランザクション状態変更ログ |
| 3 | 取引コア | refunds | 返金レコード |
| 4 | 精算 | settlements | 精算バッチ |
| 5 | 精算 | settlement_details | 加盟店別精算明細 |
| 6 | 精算 | payouts | 入金レコード |
| 7 | 例外処理 | exception_queue | 例外キュー（手動対応待ち） |
| 8 | 接続先 | processors | 決済プロセッサー |
| 9 | 接続先 | processor_brands | ブランド×プロセッサー対応 |
| 10 | 接続先 | processor_fees | プロセッサー手数料設定 |
| 11 | 接続先 | processor_health | プロセッサーヘルスモニター |
| 12 | 接続先 | processor_responses | プロセッサーAPIレスポンス |
| 13 | ルーティング | routing_rules | ルーティングルール |
| 14 | ルーティング | routing_logs | ルーティング決定ログ |
| 15 | 加盟店 | merchants | 加盟店情報 |
| 16 | 加盟店 | merchant_users | 加盟店ユーザー |
| 17 | 加盟店 | merchant_processors | 加盟店×プロセッサー接続 |
| 18 | 加盟店 | merchant_applications | 加盟店申込・審査 |
| 19 | 加盟店 | merchant_settings | 加盟店設定 |
| 20 | 手数料 | fee_structures | 手数料マスター |
| 21 | 手数料 | chargeback_fees | CB手数料設定 |
| 22 | 手数料 | deposit_schedules | デポジットスケジュール |
| 23 | 管理者 | admin_users | 管理者ユーザー |
| 24 | 管理者 | admin_sessions | 管理者セッション |
| 25 | 管理者 | admin_logs | 管理者操作ログ |
| 26 | API | api_keys | 加盟店APIキー |
| 27 | 3DS | three_ds_auth | 3DS認証レコード |
| 28 | トークン | card_tokens | カードトークン |
| 29 | トークン | token_mappings | トークン×加盟店マッピング |
| 30 | レポート | report_templates | レポートテンプレート |
| 31 | レポート | report_runs | レポート実行履歴 |
| 32 | Webhook | webhooks | Webhookエンドポイント |
| 33 | Webhook | webhook_logs | Webhook配信ログ |
| 34 | システム | system_settings | グローバル設定 |
| 35 | システム | currency_exchange | 為替レート |

---

## テーブル定義

### 1. transactions（決済トランザクション）

全決済の中心テーブル。月次パーティション。

```sql
CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id         UUID NOT NULL REFERENCES merchants(id),
    transaction_code    VARCHAR(30) UNIQUE NOT NULL,     -- TXN-XXXXXXXXXX（自動採番）
    order_id            VARCHAR(100),                    -- 加盟店側注文ID
    -- 金額
    amount              BIGINT NOT NULL,                 -- 決済金額
    currency            VARCHAR(3) NOT NULL DEFAULT 'JPY',
    -- 決済手段
    payment_method      payment_method NOT NULL,         -- VISA/MC/JCB/AMEX等
    card_type           card_type,                       -- credit/debit/prepaid
    card_token          VARCHAR(255),                    -- CDE側トークン
    card_last4          VARCHAR(4),                      -- カード下4桁
    card_bin6           VARCHAR(6),                      -- BIN6桁
    card_brand          VARCHAR(20),                     -- カードブランド
    -- プロセッサー
    processor_id        UUID REFERENCES processors(id),
    processor_txn_id    VARCHAR(100),                    -- プロセッサー側取引ID
    -- 3DS
    three_ds_status     three_ds_status,
    three_ds_version    three_ds_version,
    -- ステータス
    status              transaction_status NOT NULL DEFAULT 'pending',
    error_code          VARCHAR(20),                     -- エラーコード
    error_message       TEXT,                            -- エラー詳細
    -- 手数料
    fee_rate            DECIMAL(5,3),                    -- 適用手数料率（%）
    fee_amount          BIGINT DEFAULT 0,                -- 手数料額
    net_amount          BIGINT DEFAULT 0,                -- 純額（amount - fee_amount）
    -- メタデータ
    ip_address          INET,                            -- 購入者IP
    user_agent          TEXT,                            -- 購入者UA
    metadata            JSONB DEFAULT '{}',              -- 自由メタデータ
    is_test             BOOLEAN NOT NULL DEFAULT false,  -- テスト決済フラグ
    -- タイムスタンプ
    authorized_at       TIMESTAMPTZ,                     -- オーソリ日時
    captured_at         TIMESTAMPTZ,                     -- 売上確定日時
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_txn_merchant_date ON transactions(merchant_id, created_at DESC);
CREATE INDEX idx_txn_status ON transactions(status);
CREATE INDEX idx_txn_processor ON transactions(processor_id, created_at DESC);
CREATE INDEX idx_txn_order ON transactions(merchant_id, order_id);
CREATE INDEX idx_txn_card ON transactions(card_last4, card_bin6);
```

### 2. transaction_logs（トランザクション状態変更ログ）

```sql
CREATE TABLE transaction_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id),
    from_status     transaction_status,
    to_status       transaction_status NOT NULL,
    changed_by      VARCHAR(50),                         -- system / user_id
    reason          TEXT,
    details         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_txn_logs_txn ON transaction_logs(transaction_id, created_at);
```

### 3. refunds（返金レコード）

```sql
CREATE TABLE refunds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    refund_code     VARCHAR(30) UNIQUE NOT NULL,         -- RFN-XXXXXXXXXX
    amount          BIGINT NOT NULL,                     -- 返金額
    reason          TEXT,
    status          refund_status NOT NULL DEFAULT 'pending',
    processor_refund_id VARCHAR(100),                    -- プロセッサー側返金ID
    refunded_by     UUID,                                -- 実行者
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_txn ON refunds(transaction_id);
CREATE INDEX idx_refunds_merchant ON refunds(merchant_id, created_at DESC);
```

### 4. settlements（精算バッチ）

```sql
CREATE TABLE settlements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    settlement_code VARCHAR(30) UNIQUE NOT NULL,         -- STL-XXXXXXXXXX
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    -- 金額集計
    gross_amount    BIGINT NOT NULL DEFAULT 0,           -- 総決済高
    fee_amount      BIGINT NOT NULL DEFAULT 0,           -- 手数料合計
    refund_amount   BIGINT NOT NULL DEFAULT 0,           -- 返金合計
    chargeback_amount BIGINT NOT NULL DEFAULT 0,         -- CB差引
    reserve_hold    BIGINT NOT NULL DEFAULT 0,           -- リザーブ留保
    reserve_release BIGINT NOT NULL DEFAULT 0,           -- リザーブ解放
    net_amount      BIGINT NOT NULL DEFAULT 0,           -- 入金額
    -- ステータス
    status          settlement_status NOT NULL DEFAULT 'pending',
    approved_by     UUID,
    approved_at     TIMESTAMPTZ,
    -- タイムスタンプ
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlements_merchant ON settlements(merchant_id, period_start DESC);
CREATE INDEX idx_settlements_status ON settlements(status);
```

### 5. settlement_details（加盟店別精算明細）

```sql
CREATE TABLE settlement_details (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id   UUID NOT NULL REFERENCES settlements(id),
    transaction_id  UUID NOT NULL REFERENCES transactions(id),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    processor_id    UUID REFERENCES processors(id),
    payment_method  payment_method NOT NULL,
    gross_amount    BIGINT NOT NULL,
    fee_rate        DECIMAL(5,3),
    fee_amount      BIGINT NOT NULL DEFAULT 0,
    net_amount      BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stl_details_settlement ON settlement_details(settlement_id);
CREATE INDEX idx_stl_details_merchant ON settlement_details(merchant_id);
```

### 6. payouts（入金レコード）

```sql
CREATE TABLE payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id   UUID NOT NULL REFERENCES settlements(id),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    payout_code     VARCHAR(30) UNIQUE NOT NULL,         -- PAY-XXXXXXXXXX
    amount          BIGINT NOT NULL,                     -- 入金額
    currency        VARCHAR(3) NOT NULL DEFAULT 'JPY',
    bank_name       VARCHAR(100),                        -- 振込先銀行
    branch_name     VARCHAR(100),                        -- 支店
    account_type    VARCHAR(10),                         -- 普通/当座
    account_number  VARCHAR(20),                         -- 口座番号（マスク済み）
    account_holder  VARCHAR(100),                        -- 口座名義
    scheduled_date  DATE,                                -- 入金予定日
    actual_date     DATE,                                -- 実入金日
    status          payout_status NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_merchant ON payouts(merchant_id, scheduled_date DESC);
CREATE INDEX idx_payouts_status ON payouts(status);
```

### 7. exception_queue（例外キュー）

```sql
CREATE TABLE exception_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID REFERENCES transactions(id),
    merchant_id     UUID REFERENCES merchants(id),
    queue_code      VARCHAR(30) UNIQUE NOT NULL,         -- EXQ-XXXXXXXXXX
    type            exception_type NOT NULL,
    priority        INTEGER NOT NULL DEFAULT 3,          -- 1(最高)-5(最低)
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          exception_status NOT NULL DEFAULT 'pending',
    assigned_to     UUID REFERENCES admin_users(id),
    locked_by       UUID REFERENCES admin_users(id),     -- 排他ロック（Redis TTL 900s）
    locked_at       TIMESTAMPTZ,
    sla_deadline    TIMESTAMPTZ,                         -- SLA期限
    resolved_by     UUID REFERENCES admin_users(id),
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exception_status ON exception_queue(status, priority, created_at);
CREATE INDEX idx_exception_merchant ON exception_queue(merchant_id);
CREATE INDEX idx_exception_assigned ON exception_queue(assigned_to) WHERE status = 'pending';
```

### 8. processors（決済プロセッサー）

```sql
CREATE TABLE processors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processor_code  VARCHAR(20) UNIQUE NOT NULL,         -- UNIVA / WORLDPAY 等
    processor_name  VARCHAR(255) NOT NULL,
    processor_type  processor_type NOT NULL,
    api_endpoint    VARCHAR(500),                        -- API接続先URL
    api_version     VARCHAR(20),                         -- APIバージョン
    status          processor_status NOT NULL DEFAULT 'active',
    supported_brands JSONB DEFAULT '[]',                 -- 対応ブランド
    supported_currencies JSONB DEFAULT '["JPY"]',        -- 対応通貨
    settlement_cycle settlement_cycle,                   -- 精算サイクル
    contact_info    JSONB,                               -- 担当者連絡先
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 9. processor_brands（ブランド×プロセッサー対応）

```sql
CREATE TABLE processor_brands (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processor_id    UUID NOT NULL REFERENCES processors(id),
    brand           brand_category NOT NULL,
    is_enabled      BOOLEAN NOT NULL DEFAULT true,
    priority        INTEGER NOT NULL DEFAULT 1,          -- ルーティング優先度
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(processor_id, brand)
);

CREATE INDEX idx_proc_brands_brand ON processor_brands(brand, is_enabled);
```

### 10. processor_fees（プロセッサー手数料設定）

```sql
CREATE TABLE processor_fees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processor_id    UUID NOT NULL REFERENCES processors(id),
    brand           brand_category NOT NULL,
    transaction_fee_rate DECIMAL(5,3),                   -- トランザクション手数料率（%）
    transaction_fee_fixed BIGINT DEFAULT 0,              -- 固定手数料（円）
    chargeback_fee  BIGINT DEFAULT 0,                    -- CB手数料（1件あたり）
    refund_fee      BIGINT DEFAULT 0,                    -- 返金手数料
    three_ds_fee    BIGINT DEFAULT 0,                    -- 3DS手数料
    currency        VARCHAR(3) NOT NULL DEFAULT 'JPY',
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(processor_id, brand, effective_from)
);

CREATE INDEX idx_proc_fees_proc ON processor_fees(processor_id);
```

### 11. processor_health（プロセッサーヘルスモニター）

```sql
CREATE TABLE processor_health (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processor_id    UUID NOT NULL REFERENCES processors(id),
    check_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          processor_status NOT NULL,
    latency_ms      INTEGER,                             -- レイテンシ（ms）
    success_rate    DECIMAL(5,2),                        -- 成功率（%）
    error_rate      DECIMAL(5,2),                        -- エラー率（%）
    txn_count_1h    INTEGER DEFAULT 0,                   -- 直近1時間の取引数
    details         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proc_health_proc ON processor_health(processor_id, check_time DESC);
```

### 12. processor_responses（プロセッサーAPIレスポンス）

```sql
CREATE TABLE processor_responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id),
    processor_id    UUID NOT NULL REFERENCES processors(id),
    request_type    VARCHAR(20) NOT NULL,                -- auth / capture / refund / void
    request_payload JSONB,                               -- リクエスト（機密情報除去済み）
    response_code   VARCHAR(20),                         -- レスポンスコード
    response_payload JSONB,                              -- レスポンス
    latency_ms      INTEGER,                             -- 応答時間
    is_success      BOOLEAN NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proc_resp_txn ON processor_responses(transaction_id);
CREATE INDEX idx_proc_resp_proc ON processor_responses(processor_id, created_at DESC);
```

### 13. routing_rules（ルーティングルール）

```sql
CREATE TABLE routing_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID REFERENCES merchants(id),       -- NULLの場合はグローバルルール
    rule_name       VARCHAR(255) NOT NULL,
    priority        INTEGER NOT NULL DEFAULT 100,        -- 数値小=高優先
    -- 条件
    condition_type  routing_condition_type NOT NULL,
    condition_value JSONB NOT NULL,                      -- 条件パラメータ
    -- アクション
    target_processor_id UUID NOT NULL REFERENCES processors(id),
    fallback_processor_id UUID REFERENCES processors(id),-- フォールバック先
    -- 設定
    is_enabled      BOOLEAN NOT NULL DEFAULT true,
    weight          INTEGER DEFAULT 100,                 -- 重み付き分散（%）
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routing_merchant ON routing_rules(merchant_id, priority);
CREATE INDEX idx_routing_enabled ON routing_rules(is_enabled) WHERE is_enabled = true;
```

### 14. routing_logs（ルーティング決定ログ）

```sql
CREATE TABLE routing_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id),
    rule_id         UUID REFERENCES routing_rules(id),
    selected_processor_id UUID NOT NULL REFERENCES processors(id),
    reason          TEXT,                                -- 選択理由
    candidates      JSONB DEFAULT '[]',                  -- 候補プロセッサー一覧
    latency_ms      INTEGER,                             -- ルーティング判定時間
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routing_logs_txn ON routing_logs(transaction_id);
```

### 15. merchants（加盟店情報）

```sql
CREATE TABLE merchants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_code   VARCHAR(20) UNIQUE NOT NULL,         -- MER-XXXXXXXX（自動採番）
    company_name    VARCHAR(255) NOT NULL,               -- 会社名
    representative  VARCHAR(100),                        -- 代表者名
    phone           VARCHAR(20),
    email           VARCHAR(255) NOT NULL,
    website_url     VARCHAR(500),
    address         TEXT,
    industry        industry_type NOT NULL,
    business_model  business_model_type NOT NULL,
    -- 契約情報
    contract_start  DATE,
    contract_end    DATE,
    -- ステータス
    status          merchant_status NOT NULL DEFAULT 'pending_review',
    -- タイムスタンプ
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchants_status ON merchants(status);
```

### 16. merchant_users（加盟店ユーザー）

```sql
CREATE TABLE merchant_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    username        VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    role            merchant_role NOT NULL DEFAULT 'viewer',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,                     -- PCI DSS: 90日パスワード有効期限
    failed_login_count INTEGER NOT NULL DEFAULT 0,       -- PCI DSS: 5回でロック
    locked_until    TIMESTAMPTZ,                         -- ロック解除日時
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchant_users_merchant ON merchant_users(merchant_id);
```

### 17. merchant_processors（加盟店×プロセッサー接続）

```sql
CREATE TABLE merchant_processors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    processor_id    UUID NOT NULL REFERENCES processors(id),
    external_merchant_id VARCHAR(100),                   -- プロセッサー側加盟店ID
    credentials     JSONB,                               -- 接続認証情報（暗号化済み）
    fee_override    JSONB,                               -- 個別手数料設定
    is_active       BOOLEAN NOT NULL DEFAULT true,
    activated_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(merchant_id, processor_id)
);

CREATE INDEX idx_mp_merchant ON merchant_processors(merchant_id);
CREATE INDEX idx_mp_processor ON merchant_processors(processor_id);
```

### 18. merchant_applications（加盟店申込・審査）

```sql
CREATE TABLE merchant_applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_code VARCHAR(30) UNIQUE NOT NULL,        -- APP-XXXXXXXXXX
    -- 申込情報
    company_name    VARCHAR(255) NOT NULL,
    representative  VARCHAR(100) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    website_url     VARCHAR(500),
    industry        industry_type NOT NULL,
    business_model  business_model_type NOT NULL,
    monthly_volume  BIGINT,                              -- 月間想定取扱高
    description     TEXT,                                -- 事業内容
    -- 審査
    status          merchant_status NOT NULL DEFAULT 'pending_review',
    reviewer_id     UUID REFERENCES admin_users(id),
    reviewer_category reviewer_category,
    ai_review_score DECIMAL(5,2),                        -- AI審査スコア
    ai_review_result JSONB,                              -- AI審査詳細
    review_notes    TEXT,
    reviewed_at     TIMESTAMPTZ,
    -- 承認後
    merchant_id     UUID REFERENCES merchants(id),       -- 承認後に紐付け
    -- タイムスタンプ
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_status ON merchant_applications(status);
CREATE INDEX idx_app_reviewer ON merchant_applications(reviewer_id);
```

### 19. merchant_settings（加盟店設定）

```sql
CREATE TABLE merchant_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL UNIQUE REFERENCES merchants(id),
    -- 3DS設定
    three_ds_enabled BOOLEAN NOT NULL DEFAULT true,
    three_ds_threshold BIGINT DEFAULT 10000,             -- 3DS適用閾値（円）
    -- Webhook
    webhook_url     VARCHAR(500),
    webhook_secret  VARCHAR(255),                        -- HMAC署名用シークレット
    webhook_events  JSONB DEFAULT '[]',                  -- 通知対象イベント
    -- セキュリティ
    ip_whitelist    JSONB DEFAULT '[]',                  -- IP制限
    rate_limit      INTEGER DEFAULT 100,                 -- レート制限（req/min）
    -- テストモード
    test_mode       BOOLEAN NOT NULL DEFAULT true,
    -- 通知
    notification_email VARCHAR(255),
    -- タイムスタンプ
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 20. fee_structures（手数料マスター）

```sql
CREATE TABLE fee_structures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    payment_method  payment_method NOT NULL,
    -- 手数料設定
    merchant_rate   DECIMAL(5,3) NOT NULL,               -- 加盟店手数料率（%）
    processor_cost  DECIMAL(5,3),                        -- プロセッサー原価率（%）
    margin          DECIMAL(5,3),                        -- マージン（%）
    fixed_fee       BIGINT DEFAULT 0,                    -- 固定手数料（円/件）
    -- 有効期間
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(merchant_id, payment_method, effective_from)
);

CREATE INDEX idx_fees_merchant ON fee_structures(merchant_id);
```

### 21. chargeback_fees（CB手数料設定）

```sql
CREATE TABLE chargeback_fees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processor_id    UUID NOT NULL REFERENCES processors(id),
    brand           brand_category NOT NULL,
    fee_amount      BIGINT NOT NULL,                     -- CB手数料（1件あたり）
    currency        VARCHAR(3) NOT NULL DEFAULT 'JPY',
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(processor_id, brand, effective_from)
);
```

### 22. deposit_schedules（デポジットスケジュール）

```sql
CREATE TABLE deposit_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    processor_id    UUID REFERENCES processors(id),
    deposit_cycle   settlement_cycle NOT NULL,           -- 入金サイクル
    deposit_day     INTEGER,                             -- 入金日（月額の場合）
    hold_days       INTEGER DEFAULT 0,                   -- 保留日数
    min_amount      BIGINT DEFAULT 0,                    -- 最低入金額
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deposit_merchant ON deposit_schedules(merchant_id);
```

### 23. admin_users（管理者ユーザー）

```sql
CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    role            admin_role NOT NULL DEFAULT 'readonly',
    department      VARCHAR(100),                        -- 所属部署
    is_active       BOOLEAN NOT NULL DEFAULT true,
    -- PCI DSS v4.0 準拠
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    two_factor_secret  VARCHAR(255),                     -- TOTP シークレット
    password_changed_at TIMESTAMPTZ,                     -- 90日有効期限
    failed_login_count INTEGER NOT NULL DEFAULT 0,       -- 5回でロック
    locked_until    TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    -- パスワード履歴（過去5回再利用禁止: PCI DSS v4.0 Req 8.3.6）
    password_history JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 24. admin_sessions（管理者セッション）

```sql
CREATE TABLE admin_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES admin_users(id),
    session_token   VARCHAR(255) UNIQUE NOT NULL,
    ip_address      INET NOT NULL,
    user_agent      TEXT,
    status          session_status NOT NULL DEFAULT 'active',
    login_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL                 -- PCI DSS: 15分アイドルタイムアウト
);

CREATE INDEX idx_sessions_user ON admin_sessions(user_id);
CREATE INDEX idx_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_sessions_expires ON admin_sessions(expires_at);
```

### 25. admin_logs（管理者操作ログ）

```sql
CREATE TABLE admin_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES admin_users(id),
    user_type       VARCHAR(20) NOT NULL,                -- admin / merchant
    user_name       VARCHAR(100),
    action_type     VARCHAR(50) NOT NULL,                -- login / logout / create / update / delete / export
    target_entity   VARCHAR(50),                         -- 対象エンティティ
    target_id       VARCHAR(100),                        -- 対象ID
    ip_address      INET,
    user_agent      TEXT,
    details         JSONB DEFAULT '{}',                  -- 変更内容
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- PCI DSS v4.0 Req 10.5.1: 12ヶ月保持
-- 直近3ヶ月: PostgreSQL（月次パーティション）
-- 3-12ヶ月: S3 Standard（Parquet形式）
-- 12ヶ月以降: S3 Glacier Deep Archive

CREATE INDEX idx_admin_logs_user ON admin_logs(user_id, created_at DESC);
CREATE INDEX idx_admin_logs_action ON admin_logs(action_type, created_at DESC);
```

### 26. api_keys（加盟店APIキー）

```sql
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    key_prefix      VARCHAR(8) NOT NULL,                 -- キーの先頭8文字（識別用）
    key_hash        VARCHAR(255) NOT NULL,               -- SHA-256ハッシュ
    key_type        VARCHAR(10) NOT NULL,                -- 'test' / 'production'
    label           VARCHAR(100),                        -- ラベル（用途メモ）
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at      TIMESTAMPTZ                          -- ローテーション日時
);

CREATE INDEX idx_api_keys_merchant ON api_keys(merchant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

### 27. three_ds_auth（3DS認証レコード）

```sql
CREATE TABLE three_ds_auth (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id),
    three_ds_version three_ds_version NOT NULL,
    auth_method     auth_method,
    -- 認証結果
    authentication_value VARCHAR(255),                   -- CAVV/AAV
    ds_transaction_id VARCHAR(100),                      -- DS取引ID
    acs_transaction_id VARCHAR(100),                     -- ACS取引ID
    eci             VARCHAR(2),                          -- ECI値
    -- ステータス
    status          three_ds_status NOT NULL,
    challenge_required BOOLEAN NOT NULL DEFAULT false,
    challenge_url   TEXT,                                -- チャレンジURL
    -- タイムスタンプ
    initiated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_3ds_txn ON three_ds_auth(transaction_id);
```

### 28. card_tokens（カードトークン）

CDE（Card Data Environment）側で管理。管理系DBにはトークン参照のみ。

```sql
CREATE TABLE card_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token           VARCHAR(255) UNIQUE NOT NULL,        -- トークン値
    card_bin6       VARCHAR(6),                          -- BIN6桁
    card_last4      VARCHAR(4) NOT NULL,                 -- 下4桁
    card_brand      VARCHAR(20) NOT NULL,                -- VISA/MC/JCB/AMEX
    card_exp_month  INTEGER,                             -- 有効期限（月）
    card_exp_year   INTEGER,                             -- 有効期限（年）
    fingerprint     VARCHAR(255),                        -- カードフィンガープリント
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tokens_last4 ON card_tokens(card_last4);
CREATE INDEX idx_tokens_fingerprint ON card_tokens(fingerprint);
```

### 29. token_mappings（トークン×加盟店マッピング）

```sql
CREATE TABLE token_mappings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    card_token_id   UUID NOT NULL REFERENCES card_tokens(id),
    merchant_customer_id VARCHAR(255),                   -- 加盟店側の顧客識別子
    is_default      BOOLEAN NOT NULL DEFAULT false,      -- デフォルトカードか
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(merchant_id, card_token_id)
);

CREATE INDEX idx_token_map_merchant ON token_mappings(merchant_id);
```

### 30. report_templates（レポートテンプレート）

```sql
CREATE TABLE report_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name   VARCHAR(255) NOT NULL,
    template_type   VARCHAR(50) NOT NULL,                -- transaction / settlement / merchant / custom
    description     TEXT,
    query_config    JSONB NOT NULL,                      -- クエリ設定（フィルタ、集計、グループ化）
    output_format   VARCHAR(10) NOT NULL DEFAULT 'csv',  -- csv / xlsx / pdf
    is_system       BOOLEAN NOT NULL DEFAULT false,      -- システム定義テンプレート
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 31. report_runs（レポート実行履歴）

```sql
CREATE TABLE report_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID REFERENCES report_templates(id),
    merchant_id     UUID REFERENCES merchants(id),       -- 加盟店レポートの場合
    run_by          UUID NOT NULL,                       -- 実行者
    run_by_type     VARCHAR(20) NOT NULL,                -- admin / merchant
    parameters      JSONB DEFAULT '{}',                  -- 実行パラメータ
    status          VARCHAR(20) NOT NULL DEFAULT 'running', -- running / completed / failed
    file_path       VARCHAR(500),                        -- 出力ファイルパス
    file_size       BIGINT,                              -- ファイルサイズ
    row_count       INTEGER,                             -- 出力行数
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    error_message   TEXT
);

CREATE INDEX idx_report_runs_user ON report_runs(run_by, started_at DESC);
```

### 32. webhooks（Webhookエンドポイント）

```sql
CREATE TABLE webhooks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id     UUID NOT NULL REFERENCES merchants(id),
    endpoint_url    VARCHAR(500) NOT NULL,
    secret          VARCHAR(255) NOT NULL,               -- HMAC署名用
    events          JSONB NOT NULL DEFAULT '[]',         -- 対象イベント一覧
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_delivery_at TIMESTAMPTZ,
    last_status     VARCHAR(20),                         -- success / failed
    failure_count   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_merchant ON webhooks(merchant_id);
```

### 33. webhook_logs（Webhook配信ログ）

```sql
CREATE TABLE webhook_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id      UUID NOT NULL REFERENCES webhooks(id),
    transaction_id  UUID REFERENCES transactions(id),
    event_type      VARCHAR(50) NOT NULL,
    payload         JSONB NOT NULL,
    response_status INTEGER,                             -- HTTPステータス
    response_body   TEXT,
    latency_ms      INTEGER,
    attempt         INTEGER NOT NULL DEFAULT 1,          -- 試行回数
    is_success      BOOLEAN NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wh_logs_webhook ON webhook_logs(webhook_id, created_at DESC);
CREATE INDEX idx_wh_logs_txn ON webhook_logs(transaction_id);
```

### 34. system_settings（グローバル設定）

```sql
CREATE TABLE system_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key     VARCHAR(100) UNIQUE NOT NULL,
    setting_value   JSONB NOT NULL,
    description     TEXT,
    category        VARCHAR(50),                         -- payment / security / notification / system
    is_encrypted    BOOLEAN NOT NULL DEFAULT false,
    updated_by      UUID,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 35. currency_exchange（為替レート）

```sql
CREATE TABLE currency_exchange (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency   VARCHAR(3) NOT NULL,
    to_currency     VARCHAR(3) NOT NULL,
    rate            DECIMAL(12,6) NOT NULL,
    source          VARCHAR(50),                         -- レートソース（API名等）
    effective_at    TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, effective_at)
);

CREATE INDEX idx_exchange_pair ON currency_exchange(from_currency, to_currency, effective_at DESC);
```

---

## ENUM型定義（24型）

```sql
-- ===== 取引・ステータス系（6型）=====

-- 1. トランザクションステータス
CREATE TYPE transaction_status AS ENUM (
    'pending',              -- 処理待ち
    'auth_approved',        -- オーソリ承認
    'auth_declined',        -- オーソリ拒否
    'captured',             -- 売上確定
    'failed',               -- 失敗
    'cancelled',            -- キャンセル
    'voided',               -- 取消
    'refunded',             -- 全額返金済み
    'partial_refunded'      -- 一部返金済み
);

-- 2. 返金ステータス
CREATE TYPE refund_status AS ENUM (
    'pending',              -- 申請中
    'approved',             -- 承認済み
    'processing',           -- 処理中
    'completed',            -- 完了
    'rejected',             -- 却下
    'failed'                -- 失敗
);

-- 3. 精算ステータス
CREATE TYPE settlement_status AS ENUM (
    'pending',              -- 集計中
    'processing',           -- 処理中
    'completed',            -- 完了
    'failed',               -- 失敗
    'cancelled'             -- キャンセル
);

-- 4. 例外キュータイプ
CREATE TYPE exception_type AS ENUM (
    'manual_review',        -- 手動確認
    'fraud_suspected',      -- 不正疑い
    'processor_error',      -- プロセッサーエラー
    'settlement_error',     -- 精算エラー
    'chargeback',           -- チャージバック
    'validation_error',     -- バリデーションエラー
    'other'                 -- その他
);

-- 5. 例外キューステータス
CREATE TYPE exception_status AS ENUM (
    'pending',              -- 未処理
    'in_progress',          -- 対応中
    'approved',             -- 承認済み
    'rejected',             -- 却下
    'escalated',            -- エスカレーション
    'resolved'              -- 解決済み
);

-- 6. プロセッサーステータス
CREATE TYPE processor_status AS ENUM (
    'active',               -- 稼働中
    'degraded',             -- 劣化
    'suspended',            -- 停止中
    'maintenance',          -- メンテナンス
    'offline',              -- オフライン
    'error'                 -- エラー
);

-- ===== 加盟店・アクセス制御系（4型）=====

-- 7. 加盟店ステータス
CREATE TYPE merchant_status AS ENUM (
    'pending_review',       -- 審査待ち
    'under_review',         -- 審査中
    'active',               -- 有効
    'suspended',            -- 一時停止
    'terminated',           -- 解約
    'inactive'              -- 無効
);

-- 8. 加盟店ロール
CREATE TYPE merchant_role AS ENUM (
    'owner',                -- オーナー
    'admin',                -- 管理者
    'accountant',           -- 経理
    'viewer'                -- 閲覧者
);

-- 9. 管理者ロール
CREATE TYPE admin_role AS ENUM (
    'super_admin',          -- スーパー管理者
    'admin',                -- 管理者
    'reviewer',             -- 審査担当
    'readonly'              -- 読み取り専用
);

-- 10. 審査カテゴリ
CREATE TYPE reviewer_category AS ENUM (
    'approval',             -- 加盟店審査
    'fraud',                -- 不正対応
    'compliance',           -- コンプライアンス
    'settlement'            -- 精算
);

-- ===== 決済・手数料系（3型）=====

-- 11. 決済手段
CREATE TYPE payment_method AS ENUM (
    'visa',
    'mastercard',
    'jcb',
    'amex',
    'diners',
    'unionpay',
    'webmoney',
    'bank_transfer',        -- 銀行振込
    'convenience'           -- コンビニ決済
);

-- 12. カード種別
CREATE TYPE card_type AS ENUM (
    'credit',               -- クレジット
    'debit',                -- デビット
    'prepaid'               -- プリペイド
);

-- 13. 通貨
CREATE TYPE currency AS ENUM (
    'JPY', 'USD', 'EUR', 'GBP', 'CNY', 'SGD', 'THB', 'HKD'
);

-- ===== 3DS・セキュリティ系（3型）=====

-- 14. 3DSステータス
CREATE TYPE three_ds_status AS ENUM (
    'authenticated',        -- 認証成功
    'attempted',            -- 認証試行
    'not_authenticated',    -- 認証失敗
    'unavailable',          -- 利用不可
    'failed',               -- 失敗
    'error'                 -- エラー
);

-- 15. 3DSバージョン
CREATE TYPE three_ds_version AS ENUM (
    '1.0', '2.0', '2.1', '2.2'
);

-- 16. 認証方式
CREATE TYPE auth_method AS ENUM (
    'password',             -- パスワード
    'otp',                  -- ワンタイムパスワード
    'biometric',            -- 生体認証
    'app_based',            -- アプリ認証
    'device_verification'   -- デバイス認証
);

-- ===== ビジネスモデル系（2型）=====

-- 17. 業種
CREATE TYPE industry_type AS ENUM (
    'ec',                   -- EC
    'subscription',         -- サブスク
    'digital_goods',        -- デジタルコンテンツ
    'telecom',              -- 通信
    'education',            -- 教育
    'healthcare',           -- ヘルスケア
    'finance',              -- 金融
    'travel',               -- 旅行
    'food',                 -- 飲食
    'retail',               -- 小売
    'other'                 -- その他
);

-- 18. ビジネスモデル
CREATE TYPE business_model_type AS ENUM (
    'b2c',                  -- B2C
    'b2b',                  -- B2B
    'c2c',                  -- C2C
    'marketplace'           -- マーケットプレイス
);

-- ===== 接続先・ルーティング系（3型）=====

-- 19. プロセッサー種別
CREATE TYPE processor_type AS ENUM (
    'acquirer',             -- アクワイアラ
    'issuer',               -- イシュア
    'gateway',              -- ゲートウェイ
    'alternative_payment'   -- 代替決済
);

-- 20. ブランドカテゴリ
CREATE TYPE brand_category AS ENUM (
    'visa', 'mastercard', 'jcb', 'amex', 'diners', 'unionpay', 'webmoney'
);

-- 21. ルーティング条件タイプ
CREATE TYPE routing_condition_type AS ENUM (
    'amount_range',         -- 金額範囲
    'brand',                -- ブランド指定
    'processor_status',     -- プロセッサー状態
    'time_window',          -- 時間帯
    'merchant_category',    -- 加盟店カテゴリ
    'custom_rule'           -- カスタムルール
);

-- ===== 入金・精算系（2型）=====

-- 22. 入金ステータス
CREATE TYPE payout_status AS ENUM (
    'pending',              -- 準備中
    'scheduled',            -- スケジュール済み
    'processing',           -- 処理中
    'completed',            -- 完了
    'failed',               -- 失敗
    'cancelled'             -- キャンセル
);

-- 23. 精算サイクル
CREATE TYPE settlement_cycle AS ENUM (
    'daily',                -- 日次
    'weekly',               -- 週次
    'biweekly',             -- 隔週
    'monthly'               -- 月次
);

-- ===== セッション系（1型）=====

-- 24. セッションステータス
CREATE TYPE session_status AS ENUM (
    'active',               -- アクティブ
    'expired',              -- 期限切れ
    'revoked',              -- 取消済み
    'logged_out'            -- ログアウト済み
);
```

---

## ER図（テーブル間リレーション）

```
merchants ─┬── merchant_users
           ├── merchant_processors ── processors ─┬── processor_brands
           ├── merchant_applications               ├── processor_fees
           ├── merchant_settings                   ├── processor_health
           ├── fee_structures                      └── processor_responses
           ├── deposit_schedules
           ├── api_keys
           ├── token_mappings ── card_tokens
           ├── webhooks ── webhook_logs
           ├── settlements ─┬── settlement_details
           │                └── payouts
           ├── refunds
           └── exception_queue

transactions ─┬── transaction_logs
              ├── routing_logs ── routing_rules
              ├── three_ds_auth
              ├── processor_responses
              ├── settlement_details
              └── refunds

admin_users ─┬── admin_sessions
             └── admin_logs

system_settings（独立）
currency_exchange（独立）
report_templates ── report_runs
```

---

## バージョン履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| v1.0 | 2026-02-11 | 初版: 35テーブル / 24 ENUM |
| → v1.1 | 2026-02-13 | +10テーブル / +8 ENUM（CRM・代理店・マルチサイト）→ Addendum参照 |
| → v1.2 | 2026-02-15 | +5テーブル / +4 ENUM（顧客管理・決済リンク・リカーリング）→ Addendum参照 |
| → v1.3 | 2026-02-17 | +2テーブル / +1 ENUM（ローリングリザーブ）→ Addendum参照 |
| → v1.4 | 2026-02-18 | +10テーブル / +5 ENUM（不正検知・AI・通知・監査）→ Addendum参照 |
| → v1.5 | 2026-02-21 | +2テーブル / +4 ENUM（チャージバック・制限候補）→ Addendum参照 |
