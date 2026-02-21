# Zone A ↔ Zone B 内部API仕様書 v1.0

**作成日**: 2026-02-20
**目的**: PCI DSS v4.0 Req 1.3準拠 — CDE(Zone A)と管理系(Zone B)間のネットワーク境界と通信仕様を定義
**関連**: System_Architecture_v1.0.md Section 5.3.1

---

## 1. 通信基盤

### 1.1 ネットワーク経路

| 項目 | 仕様 |
|------|------|
| 接続方式 | AWS VPC PrivateLink（推奨）or VPC Peering |
| プロトコル | HTTPS（TLS 1.2以上、TLS 1.0/1.1は明示的に無効化） |
| 認証方式 | **mTLS（相互TLS認証）** — クライアント証明書 + サーバー証明書 |
| 追加認証 | HMAC-SHA256署名（リクエストボディ + タイムスタンプ + nonce） |
| 許可ポート | 443/tcp のみ（他ポートは全て拒否） |
| レート制限 | API毎に設定（下記個別仕様参照） |
| タイムアウト | 接続: 5秒 / 読取: 30秒（返金等の長い処理は60秒） |
| リトライ | 指数バックオフ（1s → 2s → 4s、最大3回） |

### 1.2 mTLS証明書管理

| 項目 | 仕様 |
|------|------|
| CA | AWS Private CA（ACM Private CA） |
| 証明書有効期間 | 1年（90日前に自動更新） |
| 鍵長 | RSA 2048bit 以上 or ECDSA P-256 |
| CRL/OCSP | OCSP Stapling有効 |
| 証明書保管 | AWS Secrets Manager（暗号化保管） |

### 1.3 HMAC署名仕様

```
署名対象:
  HTTP_METHOD + "\n" +
  REQUEST_PATH + "\n" +
  TIMESTAMP (ISO 8601) + "\n" +
  NONCE (UUID v4) + "\n" +
  SHA256(REQUEST_BODY)

ヘッダー:
  X-Signature: HMAC-SHA256(signing_string, shared_secret)
  X-Timestamp: 2026-02-20T10:00:00Z
  X-Nonce: 550e8400-e29b-41d4-a716-446655440000

検証:
  - タイムスタンプが±5分以内であること
  - Nonceが未使用であること（Redis TTL 10分で管理）
```

---

## 2. API一覧

### 2.1 Zone A → Zone B（取引結果・ヘルス通知系）

| # | API | メソッド | パス | レート制限 |
|---|-----|---------|------|-----------|
| I-001 | 取引結果通知 | POST | /internal/v1/transactions/notify | 1,000 req/s |
| I-007 | プロセッサーヘルス通知 | POST | /internal/v1/processors/health | 10 req/min |
| I-009 | リカーリング結果通知 | POST | /internal/v1/recurring/results | 500 req/s |
| I-010 | 精算データ集計 | POST | /internal/v1/settlements/aggregate | 10 req/min |
| I-014 | 3DS結果通知 | POST | /internal/v1/transactions/3ds-result | 500 req/s |
| I-015 | 不正検知結果通知 | POST | /internal/v1/fraud/detection-result | 500 req/s |

### 2.2 Zone B → Zone A（指示・同期系）

| # | API | メソッド | パス | レート制限 |
|---|-----|---------|------|-----------|
| I-002 | 返金実行 | POST | /internal/v1/transactions/refund | 100 req/s |
| I-003 | キャンセル実行 | POST | /internal/v1/transactions/cancel | 100 req/s |
| I-004 | ルーティングルール同期 | PUT | /internal/v1/routing/rules/sync | 10 req/min |
| I-005 | 不正検知ルール同期 | PUT | /internal/v1/fraud/rules/sync | 10 req/min |
| I-006 | ブロックリスト同期 | PUT | /internal/v1/fraud/blocklist/sync | 10 req/min |
| I-008 | リカーリング対象取得 | GET | /internal/v1/recurring/targets | 1 req/min |
| I-011 | プロセッサー設定同期 | PUT | /internal/v1/processors/config/sync | 10 req/min |
| I-012 | 加盟店設定同期 | PUT | /internal/v1/merchants/config/sync | 10 req/min |
| I-013 | カード変更URL生成 | POST | /internal/v1/cards/change-url | 50 req/min |

---

## 3. API詳細仕様

### I-001: 取引結果通知（A→B）

決済完了/失敗時にZone AからZone Bへ取引結果を同期。

**リクエスト**:
```json
POST /internal/v1/transactions/notify
Content-Type: application/json

{
  "transaction_id": "txn_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "site_id": "site_xxx",
  "merchant_id": "mer_xxx",
  "type": "payment",
  "status": "success",
  "amount": 9800,
  "currency": "JPY",
  "card_token": "tok_xxx",
  "card_last4": "1234",
  "card_brand": "VISA",
  "card_bin6": "411111",
  "processor_id": "proc_xxx",
  "processor_txn_id": "EXT-12345",
  "routing_rule_id": "rule_xxx",
  "three_ds_status": "authenticated",
  "three_ds_version": "2.2.0",
  "fraud_score": 0.12,
  "fraud_action": "pass",
  "error_code": null,
  "error_message": null,
  "customer_email": "user@example.com",
  "customer_ip": "203.0.113.1",
  "user_agent": "Mozilla/5.0...",
  "metadata": {},
  "processed_at": "2026-02-20T10:00:00Z"
}
```

**⚠️ セキュリティ要件**:
- カード番号（PAN）は**絶対に含めない** — card_tokenとcard_last4のみ
- CVVは含めない
- card_bin6は不正検知に必要な場合のみ（最小限データ原則）

**レスポンス**:
```json
{
  "received": true,
  "zone_b_txn_id": "ztxn_xxx"
}
```

---

### I-002: 返金実行（B→A）

管理画面から返金指示を送信。Zone Aが接続先に返金処理を実行。

**リクエスト**:
```json
POST /internal/v1/transactions/refund
Content-Type: application/json

{
  "original_transaction_id": "txn_xxx",
  "refund_amount": 9800,
  "refund_type": "full",
  "reason": "customer_request",
  "reason_detail": "返品・キャンセル",
  "requested_by": "admin_user_xxx",
  "requested_at": "2026-02-20T10:00:00Z"
}
```

**レスポンス**:
```json
{
  "refund_transaction_id": "txn_refund_xxx",
  "status": "success",
  "refunded_amount": 9800,
  "processor_refund_id": "REF-12345",
  "processed_at": "2026-02-20T10:00:05Z"
}
```

---

### I-003: キャンセル実行（B→A）

オーソリ済み・未売上確定のトランザクションを取消。

**リクエスト**:
```json
POST /internal/v1/transactions/cancel
Content-Type: application/json

{
  "transaction_id": "txn_xxx",
  "reason": "merchant_request",
  "requested_by": "admin_user_xxx"
}
```

---

### I-004: ルーティングルール同期（B→A）

Zone Bで変更されたルーティングルールをZone Aに反映。

**リクエスト**:
```json
PUT /internal/v1/routing/rules/sync
Content-Type: application/json

{
  "sync_type": "incremental",
  "rules": [
    {
      "rule_id": "rule_xxx",
      "action": "update",
      "priority": 1,
      "conditions": { "brand": "VISA", "amount_min": 0, "amount_max": 100000 },
      "processor_id": "proc_xxx",
      "failover_processor_id": "proc_yyy",
      "is_enabled": true
    }
  ],
  "sync_timestamp": "2026-02-20T10:00:00Z"
}
```

**同期方式**: Zone Aはルールキャッシュ（Redis）を保持。同期API受信時にキャッシュを更新。

---

### I-005: 不正検知ルール同期（B→A）

Zone Bで設定された不正検知ルール（35フィールド条件ビルダー）をZone Aに反映。

**リクエスト**:
```json
PUT /internal/v1/fraud/rules/sync
Content-Type: application/json

{
  "sync_type": "full",
  "rules": [
    {
      "rule_id": "fr_xxx",
      "action": "update",
      "fraud_action": "auto_block",
      "priority": 1,
      "is_enabled": true,
      "condition_groups": [
        {
          "group_index": 0,
          "logic": "AND",
          "conditions": [
            { "field": "amount", "operator": ">=", "value": "500000" },
            { "field": "card_country", "operator": "not_in", "value": "JP" }
          ]
        }
      ]
    }
  ],
  "sync_timestamp": "2026-02-20T10:00:00Z"
}
```

---

### I-006: ブロックリスト同期（B→A）

BIN/IP/メール/デバイスのブロックリストをZone Aに同期。

**リクエスト**:
```json
PUT /internal/v1/fraud/blocklist/sync
Content-Type: application/json

{
  "sync_type": "incremental",
  "entries": [
    {
      "id": "bl_xxx",
      "action": "add",
      "list_type": "block",
      "entry_type": "BIN",
      "value": "411111",
      "expires_at": null
    }
  ],
  "sync_timestamp": "2026-02-20T10:00:00Z"
}
```

---

### I-007: プロセッサーヘルス通知（A→B）

接続先の稼働率・レスポンスタイム・エラー数を定期送信。

**リクエスト**:
```json
POST /internal/v1/processors/health
Content-Type: application/json

{
  "timestamp": "2026-02-20T10:00:00Z",
  "processors": [
    {
      "processor_id": "proc_xxx",
      "status": "healthy",
      "uptime_pct": 99.95,
      "avg_response_ms": 245,
      "p95_response_ms": 480,
      "error_rate_pct": 0.05,
      "txn_count_1h": 1250,
      "success_count_1h": 1248,
      "last_error": null
    }
  ]
}
```

**送信間隔**: 1分ごと

---

### I-008: リカーリング対象取得（A→B）

毎日AM2:00のリカーリングバッチ実行前に、本日の課金対象ユーザー一覧を取得。

**リクエスト**:
```
GET /internal/v1/recurring/targets?date=2026-02-20
```

**レスポンス**:
```json
{
  "date": "2026-02-20",
  "targets": [
    {
      "subscription_user_id": "su_xxx",
      "plan_id": "plan_xxx",
      "site_id": "site_xxx",
      "card_token": "tok_xxx",
      "amount": 9800,
      "currency": "JPY",
      "retry_count": 0
    }
  ],
  "total_count": 1250
}
```

---

### I-009: リカーリング結果通知（A→B）

リカーリング課金実行結果をZone Bに通知。

**リクエスト**:
```json
POST /internal/v1/recurring/results
Content-Type: application/json

{
  "subscription_user_id": "su_xxx",
  "transaction_id": "txn_xxx",
  "status": "success",
  "amount": 9800,
  "next_payment_date": "2026-03-20",
  "consecutive_failures": 0,
  "processed_at": "2026-02-20T02:05:00Z"
}
```

---

### I-010: 精算データ集計（A→B）

期間内の取引を集計し、手数料計算結果をZone Bに送信。

**リクエスト**:
```json
POST /internal/v1/settlements/aggregate
Content-Type: application/json

{
  "period_start": "2026-02-01",
  "period_end": "2026-02-15",
  "merchant_id": "mer_xxx",
  "site_id": "site_xxx",
  "processor_id": "proc_xxx",
  "summary": {
    "total_txn_count": 1500,
    "total_amount": 15000000,
    "total_fee": 450000,
    "processor_fee": 300000,
    "psp_fee": 150000,
    "net_amount": 14550000,
    "refund_count": 5,
    "refund_amount": 49000,
    "chargeback_count": 1,
    "chargeback_amount": 9800
  }
}
```

---

### I-011: プロセッサー設定同期（B→A）

接続先の有効/無効切替、手数料率変更をZone Aに反映。

**リクエスト**:
```json
PUT /internal/v1/processors/config/sync
Content-Type: application/json

{
  "processor_id": "proc_xxx",
  "changes": {
    "is_enabled": true,
    "fee_rate": { "VISA": 3.2, "MC": 3.2, "JCB": 3.5 },
    "daily_limit": 50000000,
    "per_txn_limit": 500000
  },
  "changed_by": "admin_user_xxx",
  "sync_timestamp": "2026-02-20T10:00:00Z"
}
```

---

### I-012: 加盟店設定同期（B→A）

加盟店/サイトのステータス変更をZone Aに反映。

**リクエスト**:
```json
PUT /internal/v1/merchants/config/sync
Content-Type: application/json

{
  "changes": [
    {
      "entity_type": "site",
      "entity_id": "site_xxx",
      "status": "suspended",
      "reason": "不正利用の疑い"
    }
  ],
  "changed_by": "admin_user_xxx",
  "sync_timestamp": "2026-02-20T10:00:00Z"
}
```

---

### I-013: カード変更URL生成（B→A）

サブスクリプションユーザーのカード変更URLを生成。

**リクエスト**:
```json
POST /internal/v1/cards/change-url
Content-Type: application/json

{
  "subscription_user_id": "su_xxx",
  "site_id": "site_xxx",
  "expires_in_hours": 72
}
```

**レスポンス**:
```json
{
  "change_url": "https://pay.aipayment.jp/card-change/tok_change_xxx",
  "expires_at": "2026-02-23T10:00:00Z"
}
```

---

### I-014: 3DS結果通知（A→B）

3DS認証結果を管理系DBに記録。

**リクエスト**:
```json
POST /internal/v1/transactions/3ds-result
Content-Type: application/json

{
  "transaction_id": "txn_xxx",
  "three_ds_version": "2.2.0",
  "authentication_status": "Y",
  "eci": "05",
  "cavv": "xxx...",
  "ds_transaction_id": "xxx...",
  "acs_transaction_id": "xxx...",
  "challenge_performed": false,
  "authenticated_at": "2026-02-20T10:00:03Z"
}
```

---

### I-015: 不正検知結果通知（A→B）

Zone Aでのリアルタイム不正検知判定結果をZone Bに通知。

**リクエスト**:
```json
POST /internal/v1/fraud/detection-result
Content-Type: application/json

{
  "transaction_id": "txn_xxx",
  "rule_id": "fr_xxx",
  "action_taken": "queue_review",
  "fraud_score": 0.85,
  "matched_conditions": [
    { "field": "amount", "operator": ">=", "value": "500000", "actual": "750000" },
    { "field": "card_country", "operator": "not_in", "value": "JP", "actual": "US" }
  ],
  "detected_at": "2026-02-20T10:00:01Z"
}
```

---

## 4. エラーハンドリング

### 4.1 共通エラーレスポンス

```json
{
  "error": true,
  "error_code": "INTERNAL_API_ERROR",
  "error_message": "Detailed error description",
  "request_id": "req_xxx",
  "timestamp": "2026-02-20T10:00:00Z"
}
```

### 4.2 エラーコード

| コード | HTTPステータス | 説明 |
|--------|-------------|------|
| AUTH_FAILED | 401 | mTLS認証失敗 |
| SIGNATURE_INVALID | 401 | HMAC署名検証失敗 |
| TIMESTAMP_EXPIRED | 401 | タイムスタンプ期限切れ（±5分） |
| NONCE_REUSED | 401 | Nonce再利用検出 |
| RATE_LIMITED | 429 | レート制限超過 |
| VALIDATION_ERROR | 400 | リクエストバリデーションエラー |
| NOT_FOUND | 404 | 対象リソースが存在しない |
| PROCESSOR_ERROR | 502 | 接続先プロセッサーエラー |
| INTERNAL_ERROR | 500 | 内部サーバーエラー |

### 4.3 障害時フォールバック

| シナリオ | 対応 |
|---------|------|
| Zone B→A通信不可 | メッセージキュー（SQS）にエンキュー → Zone A復旧後に処理 |
| Zone A→B通信不可 | DLQ（Dead Letter Queue）に退避 → Zone B復旧後にリプレイ |
| 同期失敗（ルール/設定） | 最後に成功した設定を維持 + アラート発報 |

---

## 5. 監査・ログ要件（PCI DSS v4.0 Req 10準拠）

### 5.1 内部API通信ログ

全ての内部API通信を記録:

| ログ項目 | 必須 |
|---------|------|
| タイムスタンプ | ✅ |
| API名（I-001〜I-015） | ✅ |
| 方向（A→B / B→A） | ✅ |
| リクエストID | ✅ |
| HTTPステータスコード | ✅ |
| レスポンスタイム（ms） | ✅ |
| リクエストボディ（**PAN/CVVは絶対に含めない**） | ✅ |
| エラー詳細（失敗時） | ✅ |
| 送信元IP | ✅ |
| クライアント証明書CN | ✅ |

### 5.2 ログ保管

- CloudWatch Logs: リアルタイム監視 + 3ヶ月即時検索
- S3 Standard: 3〜12ヶ月アーカイブ
- S3 Glacier: 12ヶ月以降コンプライアンス保管

---

## 6. セキュリティグループ（VPC）

### 6.1 Zone A → Zone B

| ルール | プロトコル | ポート | 送信元 | 送信先 | 用途 |
|--------|----------|-------|--------|--------|------|
| Allow | TCP | 443 | Zone A SG | Zone B ALB SG | 内部API（I-001,007,009,010,014,015） |
| Deny | ALL | ALL | * | * | その他全て拒否 |

### 6.2 Zone B → Zone A

| ルール | プロトコル | ポート | 送信元 | 送信先 | 用途 |
|--------|----------|-------|--------|--------|------|
| Allow | TCP | 443 | Zone B SG | Zone A ALB SG | 内部API（I-002,003,004,005,006,008,011,012,013） |
| Deny | ALL | ALL | * | * | その他全て拒否 |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|----------|------|---------|
| v1.0 | 2026-02-20 | 初版作成。15件のAPI仕様定義、mTLS認証、HMAC署名、セキュリティグループ定義 |
