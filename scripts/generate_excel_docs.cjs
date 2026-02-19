const ExcelJS = require('exceljs');
const path = require('path');

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Payment System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ─────────────────────────────────────────
  // 共通スタイル定義
  // ─────────────────────────────────────────
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Yu Gothic' };
  const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
  const subHeaderFont = { bold: true, color: { argb: 'FF1F4E79' }, size: 10, name: 'Yu Gothic' };
  const bodyFont = { size: 10, name: 'Yu Gothic' };
  const bodyFontSmall = { size: 9, name: 'Yu Gothic' };
  const titleFont = { bold: true, size: 14, name: 'Yu Gothic', color: { argb: 'FF1F4E79' } };
  const sectionFont = { bold: true, size: 12, name: 'Yu Gothic', color: { argb: 'FF1F4E79' } };
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    right: { style: 'thin', color: { argb: 'FFB0B0B0' } }
  };
  const altRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8FC' } };

  function applyHeaderRow(row) {
    row.eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    row.height = 24;
  }

  function applySubHeaderRow(row) {
    row.eachCell(cell => {
      cell.fill = subHeaderFill;
      cell.font = subHeaderFont;
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    row.height = 22;
  }

  function applyBodyRow(row, isAlt = false) {
    row.eachCell(cell => {
      cell.font = bodyFont;
      cell.border = thinBorder;
      cell.alignment = { vertical: 'top', wrapText: true };
      if (isAlt) cell.fill = altRowFill;
    });
  }

  // ═══════════════════════════════════════════
  // シート1: 機能一覧
  // ═══════════════════════════════════════════
  const ws1 = workbook.addWorksheet('機能一覧', {
    properties: { tabColor: { argb: 'FF1F4E79' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  });

  // 列幅設定
  ws1.columns = [
    { width: 6 },   // A: #
    { width: 8 },   // B: ID
    { width: 18 },  // C: 画面名
    { width: 26 },  // D: コンポーネント
    { width: 60 },  // E: 主な機能
    { width: 60 },  // F: 操作
  ];

  // タイトル
  let r = 1;
  ws1.mergeCells(`A${r}:F${r}`);
  const titleCell1 = ws1.getCell(`A${r}`);
  titleCell1.value = 'AI Payment System 機能一覧表 v2.0';
  titleCell1.font = titleFont;
  titleCell1.alignment = { vertical: 'middle' };
  ws1.getRow(r).height = 28;
  r++;

  ws1.mergeCells(`A${r}:F${r}`);
  ws1.getCell(`A${r}`).value = '作成日: 2026-02-18 | ワイヤーフレーム v3 最新準拠 | 全37画面';
  ws1.getCell(`A${r}`).font = { ...bodyFont, italic: true, color: { argb: 'FF666666' } };
  r++;
  r++; // 空行

  // --- マスター管理画面 ---
  const masterScreens = [
    // [セクション, ID, 画面名, コンポーネント, 機能, 操作]
    ['1.1 概況', 'M01', 'ダッシュボード', 'MasterDashboard', 'KPI 5種（取引量/決済高/成功率/CB率/自動化率）、期間切替（本日/今週/今月）、取引推移チャート（件数/金額切替、7d/30d/90d）、例外キュー概要、プロセッサーヘルス、お知らせ、AIサマリー（再生成可）', 'KPIドリルダウンモーダル、AIチャットサイドバー（クイックアクション5種、コンテキスト質問）、クイックアクション4種'],
    ['1.1 概況', 'M02', '例外キュー', 'MasterExceptionQueue', '例外キュー一覧（審査保留/不正検知/精算エラー/その他フィルタ）、AI推薦表示（承認/却下/信頼スコア）、リスクスコア、経過時間、優先度表示', '個別承認/却下（理由入力ConfirmDialog）、バッチ操作（複数選択→一括承認/却下）、詳細パネル展開、エスカレーション'],
    ['1.2 モニタリング', 'M03', 'リアルタイム監視', 'MasterTransactionMonitor', '決済リアルタイムフィード（5秒自動更新/手動停止）、ステータス別フィルタ、取引テーブル（ID/加盟店/金額/ブランド/プロセッサー/応答時間/ステータス）、ブランド別集計ヘッダー', 'ステータスフィルタ、取引行クリック→詳細スライドパネル、自動更新ON/OFF'],
    ['1.3 取引', 'M03b', '注文検索', 'MasterOrderSearch', '16項目検索条件、マネロン疑いフラグ、検索結果テーブル', '検索実行、返金（全額/一部ConfirmDialog）、キャンセル、取引詳細スライドパネル、CSVエクスポート'],
    ['1.3 取引', 'M16', '顧客管理', 'MasterCustomers', '顧客検索（8項目）、顧客KPI 5種、セグメント分布チャート、LTV分布チャート、コホート分析', '顧客詳細スライドパネル、タグ/メモ追加、ブロック/ホワイトリスト（ConfirmDialog）、CSVエクスポート'],
    ['1.3 取引', 'M14', '継続課金管理', 'MasterRecurring', 'プラン一覧、ユーザー管理（アクティブ/一時停止/停止/完了）、決済履歴、KPI 4種', 'プラン詳細パネル、ユーザー一時停止/再開（ConfirmDialog）、手動リトライ、強制停止、CSVエクスポート'],
    ['1.4 加盟店', 'M04', '加盟店管理', 'MasterMerchants', '[加盟店一覧タブ] 加盟店テーブル、KPI 4種\n[サイト管理タブ] 3階層展開管理、サイト設定、接続先別手数料（ブランド別加盟店率/原価率/マージン計算、TR手数料6項目、デポジット、取引制限、入金サイクル）、オーバーライドハイライト', '加盟店詳細スライドパネル、サイト追加モーダル、サイト設定保存（ConfirmDialog）、接続先追加申請、手数料率変更、ステータス変更、CSVエクスポート'],
    ['1.4 加盟店', 'M06', '審査・申込', 'MasterMerchantApplications', '[新規加盟店申込タブ] 申込一覧、AI審査進捗（4項目）、ステップ管理（6段階）、メール送信管理（8テンプレート）\n[既存加盟店サイト追加タブ] サイト追加申込一覧', '承認/条件付き承認/拒否（ConfirmDialog、inputConfirm必須）、接続先審査開始、再申込許可、条件確定（20項目フォーム）'],
    ['1.4 加盟店', 'M09b', '接続先審査', 'MasterProcessors', '審査中の接続先申込一覧、API連携ステータス（API審査/加盟店登録/テスト決済の3ステップ）、審査フロー操作ログ', '操作ログ閲覧、ステップ別ステータス管理、接続先審査承認'],
    ['1.4 加盟店', 'M15', '代理店管理', 'MasterAgents', '代理店一覧、KPI 5種、代理店詳細パネル', '代理店詳細スライドパネル、手数料率編集、ステータス変更、報酬支払確認、CSVエクスポート'],
    ['1.5 精算', 'M08', '精算・入金管理', 'MasterSettlement', '精算バッチ一覧、入金スケジュール、加盟店別精算状況、接続先別TR/CB手数料ブレイクダウン、ブランド別手数料明細', 'バッチ実行/再実行（ConfirmDialog）、入金詳細パネル、CSVエクスポート'],
    ['1.5 精算', 'M11', 'レポート', 'MasterReport', 'レポートテンプレート6種、配信設定（Slack/Email）、配信ログ', 'レポートプレビュー、PDF/CSVエクスポート、配信設定CRUD、配信ログ閲覧'],
    ['1.6 決済インフラ', 'M09', '接続先管理', 'MasterSystemSettings', 'プロセッサー一覧（14接続先）、稼働率/レスポンス監視、接続先詳細展開（ブランド別手数料マトリクス/TR手数料/デポジット/取引制限/固定費/入金サイクル/CVV・NGジャンル/接続サイト一覧）、ヘルスモニタ', '接続先追加モーダル、有効化/無効化、メンテナンス登録、接続テスト'],
    ['1.6 決済インフラ', 'M10', 'ルーティング', 'MasterRouting', 'ルーティングルール一覧（アコーディオン展開式）、A/Bテスト設定、フェイルオーバーチェーン、ルール実行ログ', 'ルールCRUD、優先度ドラッグ変更、有効化/無効化、テスト実行、コスト最適化シミュレーション'],
    ['1.6 決済インフラ', 'M07', '不正検知', 'MasterFraudSettings', '[ルール管理タブ] ルールアコーディオン（8ルール）、条件ビルダー（35フィールド、AND/ORグループ、時間窓）、テスト/シミュレーション\n[AIモデル設定] 閾値/モデル性能/特徴量/再学習/切替\n[ブロック/ホワイトリスト] BIN/IP/メール/デバイスID\n[CSVインポート]\n[検知ログ]\n[加盟店別設定]', 'ルールCRUD（ConditionBuilder、保存時ConfirmDialog）、ルール削除（danger）、テストモード切替、シミュレーション、AIモデル切替（承認フロー）、ブロックリスト追加/削除、CSVインポート'],
    ['1.7 運用', 'M05', 'AI監視', 'MasterAIMonitor', 'AIモジュール5種の一覧、精度モニタリング（Accuracy/Precision/Recall/F1）、APIコスト/トークン使用量、リアルタイムメトリクス', 'モデル詳細確認、再学習スケジュール設定、アラート閾値設定、学習履歴閲覧'],
    ['1.7 運用', 'M12', 'スタッフ管理', 'MasterUserManagement', 'スタッフ一覧、ロール体系（スーパー管理者/管理者/レビュアー）、カテゴリ（審査/不正検知/URL巡回/精算）、アクティビティログ、セッション管理', 'スタッフ招待モーダル、ロール変更（ConfirmDialog、理由入力必須）、アカウント無効化、パスワードリセット、活動ログ閲覧'],
    ['1.7 運用', 'M13', 'システム設定', 'MasterSystemSettings', '8タブ: 決済手段/接続先管理/通知設定/API設定/セキュリティ/エラーコード/お知らせ管理/操作ログ', '決済手段有効化/無効化、接続先追加/編集、通知設定、APIキー管理、セキュリティ設定、エラーコード管理、お知らせCRUD、操作ログ検索/CSVエクスポート'],
  ];

  const merchantScreens = [
    ['2.1 ホーム', 'S01', 'ダッシュボード', 'MerchantDashboard', 'KPI 4種（月間売上/本日売上/成功率/平均単価）、売上チャート、決済手段分布、直近取引、お知らせ', '期間切替、KPIドリルダウン、クイックアクション'],
    ['2.2 注文', 'S02', '注文一覧', 'MerchantTransactions', '取引一覧テーブル、検索・フィルタ（ステータス/期間/金額/ブランド）', '検索、取引詳細スライドパネル、返金処理（全額/一部ConfirmDialog）、CSVエクスポート'],
    ['2.2 注文', 'S11', '顧客管理', 'MerchantCustomers', '顧客検索、KPI 4種、セグメント分布、コホート分析', '顧客詳細スライドパネル、タグ/メモ管理、CSVエクスポート'],
    ['2.3 集金ツール', 'S09', '決済リンク', 'MerchantPaymentLinks', '[新規作成タブ] リンク作成フォーム（3タイプ）、プレビュー\n[リンク一覧タブ] 作成済みリンクテーブル\n[利用状況タブ] 利用統計', 'リンク作成（ConfirmDialog）、プレビューモーダル、URL/QRコードコピー、詳細スライドパネル、一時停止/削除'],
    ['2.3 集金ツール', 'S10', '決済管理', 'MerchantSubscriptions', '[商品設定タブ] プラン一覧\n[ユーザー管理タブ] サブスクユーザー一覧\n[決済履歴タブ] 実行ログ\n[CSV決済タブ] CSVバッチアップロード/承認フロー', 'プランCRUD、ユーザー一時停止/再開、手動リトライ、強制停止、CSVアップロード、バッチ承認/却下'],
    ['2.4 売上', 'S03', '決済高レポート', 'MerchantSalesReport', '月次売上KPI、日次チャート、ブランド別内訳、入金スケジュール', '期間切替、CSV/PDFエクスポート'],
    ['2.4 売上', 'S04', '入金確認', 'MerchantPayouts', '入金KPI 4種、入金履歴テーブル、入金カレンダー、リザーブ管理（プロセッサー別）', '入金詳細スライドパネル（ブレイクダウン）、CSVエクスポート'],
    ['2.5 設定', 'S05', 'API・Webhook', 'MerchantAPISettings', 'APIキー管理（本番/テスト）、Webhookエンドポイント設定、イベント選択、IP制限、APIドキュメント、通信ログ', 'キー再発行（ConfirmDialog）、Webhookテスト送信、IP追加/削除'],
    ['2.5 設定', 'S06', '新規サイト申請', 'MerchantSiteApplication', 'サイト追加申請フォーム（サイト名/URL/業種/月間想定額/決済手段/3DS）、申請状況確認', '申請送信（ConfirmDialog）、ステータス確認'],
    ['2.5 設定', 'S07', 'スタッフ管理', 'MerchantUserManagement', 'スタッフ一覧、権限マトリクス（オーナー/管理者/経理/閲覧者）、アクティビティログ', 'スタッフ招待モーダル、ロール変更（ConfirmDialog）、アカウント無効化'],
    ['2.5 設定', 'S08', 'アカウント設定', 'MerchantAccountSettings', '7タブ: 会社情報/口座情報/APIキー/セキュリティ/メンバー/通知/契約情報', '会社情報変更申請、口座変更申請、パスワード変更、2FA設定、通知設定変更'],
    ['2.6 サポート', 'S12', 'AIチャット', 'MerchantAIChat', 'AI対話サポート（売上確認/返金実行/API設定変更/エラー問合せ等）、会話履歴、クイックアクション', 'メッセージ送信、AI操作実行（確認ダイアログ付き）、履歴閲覧'],
  ];

  const agentScreens = [
    ['3.1 ホーム', 'D01', 'ダッシュボード', 'AgentDashboard', 'KPI 4種（紹介加盟店数/取引総額/報酬見込/報酬確定額）、ステータスサマリー、月次報酬推移チャート、最新紹介リスト、通知パネル、紹介サイト一覧', '期間切替、KPIドリルダウンモーダル、クイックアクション'],
    ['3.2 営業活動', 'D02', '紹介先一覧', 'AgentMerchants', '紹介加盟店テーブル、クレジット決済検索（12項目）', '加盟店詳細スライドパネル、決済検索、決済詳細パネル'],
    ['3.2 営業活動', 'D04', '新規紹介', 'AgentReferral', '紹介フォーム、紹介履歴テーブル、ステータスタイムライン', '紹介送信（ConfirmDialog）、ステータス確認'],
    ['3.3 報酬', 'D03', '報酬明細', 'AgentReports', '報酬KPI 4種、報酬明細一覧テーブル', '明細詳細スライドパネル、検索、CSVエクスポート'],
    ['3.4 設定', 'D05', 'アカウント設定', 'AgentAccountSettings', '4タブ: アカウント情報/スタッフ管理/個別権限設定/セキュリティ', '情報編集、スタッフ検索/登録（ConfirmDialog）、権限設定変更、パスワード変更'],
  ];

  const publicScreens = [
    ['4. 公開画面', 'P01', '加盟店申込フォーム', 'MerchantApplicationForm', '5ステップ申込、プログレスバー、AI審査リアルタイム表示（4項目）', 'フォーム入力、書類アップロード、送信（ConfirmDialog）'],
    ['4. 公開画面', 'P02', '決済ページ', 'PaymentPage', 'カード入力フォーム、商品情報表示、3DS認証フロー、処理中/完了/エラー各状態表示', 'カード情報入力、支払実行'],
    ['4. 公開画面', 'P03', '代理店申込フォーム', 'AgentApplicationForm', '3ステップ申込、会社名/代表者/住所/電話/メール/口座情報', 'フォーム入力、送信（ConfirmDialog）'],
  ];

  function addScreenSection(ws, title, screens, startRow) {
    let row = startRow;
    // セクションヘッダー
    ws.mergeCells(`A${row}:F${row}`);
    ws.getCell(`A${row}`).value = title;
    ws.getCell(`A${row}`).font = sectionFont;
    ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
    ws.getRow(row).height = 24;
    row++;

    // ヘッダー行
    const hRow = ws.addRow(['#', 'ID', '画面名', 'コンポーネント', '主な機能', '操作']);
    applyHeaderRow(hRow);
    row++;

    let prevSection = '';
    let idx = 1;
    screens.forEach((s, i) => {
      const dataRow = ws.addRow([idx, s[1], s[2], s[3], s[4], s[5]]);
      applyBodyRow(dataRow, i % 2 === 1);
      dataRow.height = Math.max(30, Math.ceil(Math.max(s[4].length, s[5].length) / 80) * 16);
      idx++;
      row++;
    });
    row++; // 空行
    ws.addRow([]);
    return row;
  }

  r = addScreenSection(ws1, '1. マスター管理画面（PSP運用チーム向け）— 18画面', masterScreens, r);
  r = addScreenSection(ws1, '2. 加盟店管理画面（加盟店スタッフ向け）— 12画面', merchantScreens, r);
  r = addScreenSection(ws1, '3. 代理店管理画面（代理店スタッフ向け）— 5画面', agentScreens, r);
  r = addScreenSection(ws1, '4. 公開画面 — 3画面', publicScreens, r);

  // 画面数サマリー
  ws1.mergeCells(`A${r}:F${r}`);
  ws1.getCell(`A${r}`).value = '画面数サマリー';
  ws1.getCell(`A${r}`).font = sectionFont;
  r++;
  const summaryHeader = ws1.addRow(['', 'カテゴリ', '画面数', '画面一覧', '', '']);
  applyHeaderRow(summaryHeader);
  r++;
  [
    ['', 'マスター管理', '18', 'M01~M16 + M03b + M09b'],
    ['', '加盟店管理', '12', 'S01~S12'],
    ['', '代理店管理', '5', 'D01~D05'],
    ['', '公開画面', '3', 'P01~P03'],
    ['', '合計', '38', ''],
  ].forEach((d, i) => {
    const dr = ws1.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
    if (i === 4) {
      dr.eachCell(c => { c.font = { ...bodyFont, bold: true }; });
    }
    r++;
  });

  // 条件ビルダーフィールド一覧シート
  const wsCondition = workbook.addWorksheet('条件ビルダー(35種)', {
    properties: { tabColor: { argb: 'FF2E75B6' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });
  wsCondition.columns = [
    { width: 6 },   // #
    { width: 14 },  // カテゴリ
    { width: 24 },  // フィールド名
    { width: 16 },  // 入力タイプ
    { width: 50 },  // 対応演算子
    { width: 8 },   // 時間窓
  ];

  wsCondition.mergeCells('A1:F1');
  wsCondition.getCell('A1').value = '不正検知条件ビルダー — フィールド一覧（35種）';
  wsCondition.getCell('A1').font = titleFont;
  wsCondition.getRow(1).height = 28;

  wsCondition.mergeCells('A2:F2');
  wsCondition.getCell('A2').value = '時間窓オプション: 1分/3分/5分/10分/30分/1時間/6時間/12時間/24時間/7日/30日 | 演算子15種';
  wsCondition.getCell('A2').font = { ...bodyFontSmall, italic: true, color: { argb: 'FF666666' } };

  const condHeader = wsCondition.addRow(['#', 'カテゴリ', 'フィールド名', '入力タイプ', '対応演算子', '時間窓']);
  applyHeaderRow(condHeader);

  const conditionFields = [
    ['金額', '取引金額', '数値（円）', '＞/≧/＜/≦/＝/≠/範囲', '—'],
    ['金額', '累計取引金額', '数値（円）', '＞/≧', '✅'],
    ['カード', 'カード発行国', '選択（JP/US/CN等10か国+その他）', '＝/≠/いずれか一致/いずれにも不一致', '—'],
    ['カード', 'カードBIN', 'テキスト', '＝/いずれか/いずれにも不一致/ブロックリスト', '—'],
    ['カード', 'カードブランド', '選択（VISA/MC/JCB/AMEX/Diners/UnionPay）', '＝/≠/いずれか一致/不一致', '—'],
    ['カード', 'カード種別', '選択（credit/debit/prepaid）', '＝/≠', '—'],
    ['メール', 'メールアドレス', 'テキスト', '＝/含む/含まない/正規表現/ブロックリスト', '—'],
    ['メール', 'メールドメイン', 'テキスト', '＝/いずれか/不一致/ブロックリスト', '—'],
    ['メール', '使い捨てメール', 'ブール', '＝', '—'],
    ['IP', 'IPアドレス', 'テキスト', '＝/いずれか/不一致/CIDR/ブロックリスト', '—'],
    ['IP', 'IPアドレス国', '選択', '＝/≠/いずれか一致/不一致', '—'],
    ['IP', 'プロキシ/VPN検知', 'ブール', '＝', '—'],
    ['IP', 'Tor検知', 'ブール', '＝', '—'],
    ['地理', 'IP/カード国不一致', 'ブール', '＝', '—'],
    ['デバイス', 'デバイスフィンガープリント', 'テキスト', '＝/ブロックリスト/新規', '—'],
    ['デバイス', 'デバイス種別', '選択（desktop/mobile/tablet/bot/unknown）', '＝/≠/いずれか', '—'],
    ['デバイス', 'ブラウザ', '選択', '＝/≠/いずれか', '—'],
    ['デバイス', 'OS', '選択', '＝/≠/いずれか', '—'],
    ['AI', 'AI不正スコア', '数値', '＞/≧/＜/≦/範囲', '—'],
    ['速度', '同一カード取引回数', '数値（件）', '＞/≧', '✅'],
    ['速度', '同一メール取引回数', '数値（件）', '＞/≧', '✅'],
    ['速度', '同一IP取引回数', '数値（件）', '＞/≧', '✅'],
    ['速度', '同一デバイス取引回数', '数値（件）', '＞/≧', '✅'],
    ['関連性', '同一メールのカード数', '数値（枚）', '＞/≧', '✅'],
    ['関連性', '同一カードのメール数', '数値（件）', '＞/≧', '✅'],
    ['時間', '取引時刻（時）', '数値（時）', '＞/≧/＜/≦/範囲', '—'],
    ['時間', '曜日', '選択（月〜日）', '＝/≠/いずれか', '—'],
    ['パターン', '初回取引', 'ブール', '＝', '—'],
    ['パターン', '継続課金取引', 'ブール', '＝', '—'],
    ['パターン', '3DS認証結果', '選択（authenticated等5種）', '＝/≠/いずれか', '—'],
    ['属性', '加盟店カテゴリ', '選択（EC等7種）', '＝/≠/いずれか', '—'],
    ['属性', '通貨', '選択（JPY等8種）', '＝/≠', '—'],
    ['属性', '顧客登録日数', '数値（日）', '＞/≧/＜/≦', '—'],
    ['整合性', '配送先/請求先一致', 'ブール', '＝', '—'],
    ['整合性', '氏名/メール整合性', 'ブール', '＝', '—'],
  ];
  conditionFields.forEach((f, i) => {
    const dr = wsCondition.addRow([i + 1, ...f]);
    applyBodyRow(dr, i % 2 === 1);
    // 時間窓のセルに色
    if (f[4] === '✅') {
      dr.getCell(6).font = { ...bodyFont, color: { argb: 'FF008000' } };
    }
  });

  // 共通UI機能シート
  const wsUI = workbook.addWorksheet('共通UI機能', {
    properties: { tabColor: { argb: 'FF548235' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 2 }]
  });
  wsUI.columns = [
    { width: 6 },
    { width: 24 },
    { width: 80 },
  ];
  wsUI.mergeCells('A1:C1');
  wsUI.getCell('A1').value = '共通UI機能一覧';
  wsUI.getCell('A1').font = titleFont;
  wsUI.getRow(1).height = 28;

  const uiHeader = wsUI.addRow(['#', '機能', '内容']);
  applyHeaderRow(uiHeader);

  const uiFeatures = [
    ['ログインユーザー表示', 'サイドバー下部にユーザー名・権限・バージョンを常時表示'],
    ['AIチャット', 'M01: アコーディオン開閉式チャットサイドバー / S12: フルページAIチャット'],
    ['ToastContext/useToast', '右上表示、3秒自動消去、4種類（success/error/warning/info）、全コンポーネント共通'],
    ['ConfirmDialog', '5種類（approve/reject/danger/warning/info）、inputConfirm対応、impacts表示、確認ボタンカスタマイズ'],
    ['スライドパネル', '一覧行クリック→右から440pxスライドで詳細表示（共通パターン）'],
    ['モーダル', '返金/承認/作成等の確認ダイアログ・フォーム（共通パターン）'],
    ['アコーディオン', 'ルーティングルール、不正検知ルール、加盟店→サイト→接続先展開'],
    ['条件ビルダー', '不正検知ルール用。35フィールド、AND/ORグループ、時間窓対応、演算子13種'],
    ['CSVエクスポート', '各一覧画面に配置（カラム選択/期間指定対応）'],
    ['CSV決済', 'S10から一括決済バッチアップロード（承認フロー付き）'],
    ['権限管理（マスター）', 'super_admin / admin / reviewer（カテゴリ: 審査/不正検知/URL巡回/精算）'],
    ['権限管理（加盟店）', 'オーナー / 管理者 / 経理 / 閲覧者'],
    ['権限管理（代理店）', 'agent_admin / agent_viewer（+個別権限: データDL/スタッフ編集等）'],
    ['KPIカード', 'ラベル/値/サブテキスト/トレンド/色指定のKPI表示コンポーネント'],
    ['Badge', 'テキスト+色（blue/green/red/yellow/purple/gray）のラベルコンポーネント'],
    ['MiniChart', 'インラインのスパークラインチャート（データ配列/色/高さ/幅）'],
  ];
  uiFeatures.forEach((f, i) => {
    const dr = wsUI.addRow([i + 1, f[0], f[1]]);
    applyBodyRow(dr, i % 2 === 1);
  });

  // ═══════════════════════════════════════════
  // シート2: DB設計
  // ═══════════════════════════════════════════
  const ws2 = workbook.addWorksheet('DB設計', {
    properties: { tabColor: { argb: 'FF548235' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  });

  ws2.columns = [
    { width: 6 },   // A: #
    { width: 14 },  // B: グループ
    { width: 30 },  // C: テーブル名
    { width: 50 },  // D: 用途
    { width: 18 },  // E: 関連画面/要件
    { width: 10 },  // F: バージョン
  ];

  // タイトル
  ws2.mergeCells('A1:F1');
  ws2.getCell('A1').value = 'DB追加設計書 v1.4 — テーブル定義';
  ws2.getCell('A1').font = titleFont;
  ws2.getRow(1).height = 28;

  ws2.mergeCells('A2:F2');
  ws2.getCell('A2').value = '作成日: 2026-02-13 / 最終更新: 2026-02-18 | 全62テーブル / 42 ENUM型';
  ws2.getCell('A2').font = { ...bodyFont, italic: true, color: { argb: 'FF666666' } };

  ws2.addRow([]); // 空行

  // テーブル一覧ヘッダー
  const dbHeader = ws2.addRow(['#', 'グループ', 'テーブル名', '用途', '関連要件/画面', 'Ver']);
  applyHeaderRow(dbHeader);

  // 全テーブル一覧
  const allTables = [
    // v1.0 テーブル (35テーブル)
    [1, 'コア', 'merchants', '加盟店情報', 'コア', 'v1.0'],
    [2, 'コア', 'merchant_users', '加盟店ユーザー', 'コア', 'v1.0'],
    [3, 'コア', 'admin_users', '管理者ユーザー', 'コア', 'v1.0'],
    [4, 'コア', 'transactions', '取引データ', 'コア', 'v1.0'],
    [5, 'コア', 'transaction_logs', '取引ログ', 'コア', 'v1.0'],
    [6, 'コア', 'chargebacks', 'チャージバック', 'コア', 'v1.0'],
    [7, 'コア', 'refunds', '返金', 'コア', 'v1.0'],
    [8, '接続先', 'processors', '接続先（PSP/アクワイアラ）', 'コア', 'v1.0'],
    [9, '接続先', 'processor_brands', '接続先×ブランド設定', 'コア', 'v1.0'],
    [10, '接続先', 'merchant_processors', '加盟店×接続先紐付', 'コア', 'v1.0'],
    [11, '接続先', 'merchant_processor_fees', '加盟店×接続先手数料', 'コア', 'v1.0'],
    [12, 'ルーティング', 'routing_rules', 'ルーティングルール', 'コア', 'v1.0'],
    [13, 'ルーティング', 'routing_logs', 'ルーティングログ', 'コア', 'v1.0'],
    [14, '精算', 'settlements', '精算バッチ', 'コア', 'v1.0'],
    [15, '精算', 'settlement_items', '精算明細', 'コア', 'v1.0'],
    [16, '精算', 'payouts', '入金記録', 'コア', 'v1.0'],
    [17, '審査', 'merchant_applications', '加盟店審査申込', 'コア', 'v1.0'],
    [18, '審査', 'merchant_documents', '加盟店提出書類', 'コア', 'v1.0'],
    [19, '3DS', 'three_ds_results', '3DS認証結果', 'コア', 'v1.0'],
    [20, 'セキュリティ', 'api_keys', 'APIキー', 'コア', 'v1.0'],
    [21, 'セキュリティ', 'webhooks', 'Webhook設定', 'コア', 'v1.0'],
    [22, 'セキュリティ', 'webhook_logs', 'Webhookログ', 'コア', 'v1.0'],
    [23, 'セキュリティ', 'ip_restrictions', 'IP制限', 'コア', 'v1.0'],
    [24, 'セキュリティ', 'login_histories', 'ログイン履歴', 'コア', 'v1.0'],
    [25, 'セキュリティ', 'mfa_settings', 'MFA設定', 'コア', 'v1.0'],
    [26, 'セキュリティ', 'card_tokens', 'カードトークン（CDE参照）', 'コア', 'v1.0'],
    [27, '例外', 'exception_queues', '例外キュー', 'コア', 'v1.0'],
    [28, '例外', 'exception_queue_logs', '例外キューログ', 'コア', 'v1.0'],
    [29, 'バッチ', 'batch_jobs', 'バッチジョブ管理', 'コア', 'v1.0'],
    [30, 'バッチ', 'batch_job_logs', 'バッチジョブログ', 'コア', 'v1.0'],
    [31, '通知', 'notifications', '通知', 'コア', 'v1.0'],
    [32, '設定', 'system_settings', 'システム設定', 'コア', 'v1.0'],
    [33, '設定', 'payment_methods', '決済手段マスター', 'コア', 'v1.0'],
    [34, '設定', 'currencies', '通貨マスター', 'コア', 'v1.0'],
    [35, 'レポート', 'report_schedules', 'レポートスケジュール', 'コア', 'v1.0'],
    // v1.1追加 (10テーブル)
    [36, 'コア', 'sites', 'サイト情報（加盟店配下）', '#7 マルチサイト', 'v1.1'],
    [37, '決済リンク', 'payment_links', 'URL決済の設定', '#1 URL決済', 'v1.1'],
    [38, '継続決済', 'subscription_plans', '継続/分割決済の商品設定', '#2 リカーリング', 'v1.1'],
    [39, '継続決済', 'subscription_users', '継続/分割決済のユーザー', '#2 リカーリング', 'v1.1'],
    [40, '共通', 'announcements', 'お知らせ', '#4 お知らせ', 'v1.1'],
    [41, '共通', 'error_codes', 'エラーコードマスター', '#3 エラーコード', 'v1.1'],
    [42, '代理店', 'agents', '代理店情報', '#6 代理店', 'v1.1'],
    [43, '代理店', 'agent_users', '代理店ユーザー', '#6 代理店', 'v1.1'],
    [44, '代理店', 'agent_merchants', '代理店×加盟店紐付け', '#6 代理店', 'v1.1'],
    [45, '代理店', 'agent_commissions', '代理店報酬', '#6 代理店', 'v1.1'],
    // v1.2追加 (5テーブル)
    [46, '顧客CRM', 'customers', '顧客プロファイル（名寄せ済み）', '顧客管理', 'v1.2'],
    [47, '顧客CRM', 'customer_cards', '顧客カード情報（トークン）', '顧客管理', 'v1.2'],
    [48, '顧客CRM', 'customer_notes', '運営/加盟店メモ', '顧客管理', 'v1.2'],
    [49, '精算', 'csv_batch_payments', 'CSV一括決済バッチ', 'CSV決済', 'v1.2'],
    [50, '精算', 'csv_batch_records', 'CSV一括決済明細', 'CSV決済', 'v1.2'],
    // v1.3追加 (2テーブル)
    [51, '精算', 'rolling_reserve_settings', 'リザーブ設定', 'M08, S04', 'v1.3'],
    [52, '精算', 'rolling_reserve_transactions', 'リザーブ留保/解放履歴', 'M08, S04', 'v1.3'],
    // v1.4追加 (10テーブル)
    [53, '不正検知', 'fraud_rules', '不正検知ルール定義', 'M07', 'v1.4'],
    [54, '不正検知', 'fraud_rule_conditions', 'ルールの条件グループ・条件行', 'M07', 'v1.4'],
    [55, '不正検知', 'fraud_blocklist', 'BIN/IP/メール/デバイスのブロック・ホワイトリスト', 'M07', 'v1.4'],
    [56, '不正検知', 'fraud_detection_logs', '検知ログ（ルール発火履歴）', 'M07', 'v1.4'],
    [57, '不正検知', 'fraud_merchant_overrides', '加盟店別ルール閾値オーバーライド', 'M07', 'v1.4'],
    [58, 'AI', 'ai_models', 'AIモデルバージョン管理', 'M05, M07', 'v1.4'],
    [59, 'AI', 'ai_prompts', 'AIプロンプト設定（6種）', 'M13 API設定', 'v1.4'],
    [60, '監査', 'audit_logs', '管理画面操作ログ（PCI DSS準拠）', 'M13 操作ログ', 'v1.4'],
    [61, '通知', 'notification_channels', '通知チャネル設定（Slack/Email/SMS）', 'M13 通知', 'v1.4'],
    [62, '接続先審査', 'processor_applications', '接続先審査申込', 'M06, M09b', 'v1.4'],
  ];

  const versionFills = {
    'v1.0': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
    'v1.1': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7E6' } },
    'v1.2': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E6' } },
    'v1.3': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } },
    'v1.4': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6E6' } },
  };

  allTables.forEach((t, i) => {
    const dr = ws2.addRow(t);
    applyBodyRow(dr, i % 2 === 1);
    // バージョン列に色付け
    const ver = t[5];
    if (versionFills[ver]) {
      dr.eachCell(c => { c.fill = versionFills[ver]; });
    }
  });

  // 空行
  ws2.addRow([]);

  // テーブルサマリー
  const sumRow1 = ws2.addRow(['', '', 'テーブル数サマリー', '', '', '']);
  ws2.mergeCells(`C${sumRow1.number}:F${sumRow1.number}`);
  sumRow1.getCell(3).font = sectionFont;

  const sumH = ws2.addRow(['', '', '区分', 'v1.0', 'v1.1追加', 'v1.2追加']);
  applySubHeaderRow(sumH);
  // 2行目ヘッダー追加
  const sumH2 = ws2.addRow(['', '', '', 'v1.3追加', 'v1.4追加', '合計']);
  applySubHeaderRow(sumH2);

  // 実データ（1行にまとめる方式に変更）
  ws2.addRow([]); // クリア
  const lastR = ws2.lastRow.number;
  // サマリーはシンプルに
  const summData = [
    ['', '', 'テーブル', '35', '10', '5→2→10 = 62'],
    ['', '', 'ENUM', '24', '8', '4→1→5 = 42'],
  ];
  summData.forEach((d, i) => {
    const dr = ws2.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
  });

  // ───────────────────────────────────
  // DB詳細カラムシート
  // ───────────────────────────────────
  const ws2detail = workbook.addWorksheet('DBカラム詳細', {
    properties: { tabColor: { argb: 'FF548235' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });
  ws2detail.columns = [
    { width: 30 },  // テーブル名
    { width: 28 },  // カラム名
    { width: 22 },  // 型
    { width: 50 },  // 説明
  ];

  ws2detail.mergeCells('A1:D1');
  ws2detail.getCell('A1').value = 'DB追加設計書 v1.4 — カラム詳細定義';
  ws2detail.getCell('A1').font = titleFont;
  ws2detail.getRow(1).height = 28;

  ws2detail.mergeCells('A2:D2');
  ws2detail.getCell('A2').value = 'v1.1~v1.4追加テーブルのカラム定義';
  ws2detail.getCell('A2').font = { ...bodyFont, italic: true, color: { argb: 'FF666666' } };

  const detailHeader = ws2detail.addRow(['テーブル名', 'カラム', '型', '説明']);
  applyHeaderRow(detailHeader);

  // テーブル別カラム定義
  const tableColumns = {
    'customers': [
      ['id', 'UUID', 'PK'],
      ['site_id', 'UUID', 'FK → sites'],
      ['merchant_id', 'UUID', 'FK → merchants'],
      ['customer_code', 'VARCHAR(20)', 'CUS-XXXXXXXX（自動採番）'],
      ['user_identifier', 'VARCHAR(255)', '加盟店側ユーザーID（最優先キー）'],
      ['email', 'VARCHAR(255)', 'メールアドレス'],
      ['phone', 'VARCHAR(20)', '電話番号'],
      ['name', 'VARCHAR(255)', 'カード名義 or 氏名'],
      ['total_transactions', 'INT', '総取引回数'],
      ['total_amount', 'BIGINT', 'LTV（累計決済額）'],
      ['successful_transactions', 'INT', '成功取引回数'],
      ['first_transaction_at', 'TIMESTAMPTZ', '初回取引日'],
      ['last_transaction_at', 'TIMESTAMPTZ', '最終取引日'],
      ['average_amount', 'INT', '平均単価'],
      ['risk_level', 'customer_risk_level', 'low/medium/high/blocked'],
      ['tags', 'JSONB', 'タグ（VIP/リピーター等）'],
      ['segment', 'customer_segment', 'new/returning/loyal/dormant/churned'],
      ['is_blocked', 'BOOLEAN', 'ブロック済みか'],
      ['blocked_at', 'TIMESTAMPTZ', 'ブロック日時'],
      ['blocked_reason', 'TEXT', 'ブロック理由'],
      ['created_at', 'TIMESTAMPTZ', '作成日時'],
      ['updated_at', 'TIMESTAMPTZ', '更新日時'],
    ],
    'sites': [
      ['id', 'UUID', 'PK'],
      ['merchant_id', 'UUID', 'FK → merchants'],
      ['site_code', 'VARCHAR(20)', 'サイトコード（自動採番）UNIQUE'],
      ['site_name', 'VARCHAR(255)', 'サイト名'],
      ['site_url', 'VARCHAR(500)', 'サイトURL'],
      ['industry', 'industry_type', '業種'],
      ['business_model', 'business_model_type', 'ビジネスモデル'],
      ['description', 'TEXT', 'サービス説明'],
      ['status', 'site_status', 'pending/active/suspended/terminated'],
      ['payment_methods', 'JSONB', '利用決済手段'],
      ['fee_rate', 'JSONB', 'サイト別手数料率（ブランド別）'],
      ['settlement_cycle', 'VARCHAR(50)', '入金サイクル'],
      ['test_mode', 'BOOLEAN', 'テストモード'],
      ['created_at', 'TIMESTAMPTZ', '作成日時'],
      ['updated_at', 'TIMESTAMPTZ', '更新日時'],
      ['deleted_at', 'TIMESTAMPTZ', '論理削除'],
    ],
    'fraud_rules': [
      ['id', 'UUID', 'PK'],
      ['rule_code', 'VARCHAR(20)', 'ルールコード（FR-001等）'],
      ['name', 'VARCHAR(255)', 'ルール名'],
      ['type', 'fraud_rule_type', '種別（amount_threshold/velocity/geo_restriction等8種）'],
      ['action', 'fraud_action', '検知時アクション（auto_block/queue_review等4種）'],
      ['priority', 'INT', '優先順位（小さいほど先に評価）'],
      ['is_enabled', 'BOOLEAN', '有効/無効'],
      ['is_test_mode', 'BOOLEAN', 'テストモード'],
      ['scope', 'VARCHAR(20)', 'global/merchant_specific'],
      ['scope_merchant_ids', 'JSONB', '加盟店指定時のID配列'],
      ['hits_30d', 'INT', '30日間の検知数（バッチ集計）'],
      ['created_by', 'UUID', '作成者'],
      ['approved_by', 'UUID', '承認者（admin→super_admin承認フロー）'],
      ['created_at', 'TIMESTAMPTZ', '作成日時'],
      ['updated_at', 'TIMESTAMPTZ', '更新日時'],
    ],
    'fraud_rule_conditions': [
      ['id', 'UUID', 'PK'],
      ['rule_id', 'UUID', 'FK → fraud_rules'],
      ['group_index', 'INT', 'グループ番号（グループ間はAND）'],
      ['group_logic', 'VARCHAR(3)', 'グループ内の論理（AND/OR）'],
      ['field', 'VARCHAR(50)', '条件フィールド（35種）'],
      ['operator', 'VARCHAR(20)', '演算子（15種）'],
      ['value', 'TEXT', '比較値'],
      ['value2', 'TEXT', '範囲上限値（between演算子用）'],
      ['time_window', 'VARCHAR(20)', '時間窓（速度系）'],
      ['sort_order', 'INT', 'グループ内の表示順'],
    ],
    'fraud_blocklist': [
      ['id', 'UUID', 'PK'],
      ['list_type', 'VARCHAR(10)', 'block/white/ng_list'],
      ['entry_type', 'VARCHAR(20)', 'BIN/IP/メール/デバイスID/カスタム'],
      ['value', 'TEXT', 'エントリ値'],
      ['reason', 'TEXT', '登録理由'],
      ['expires_at', 'TIMESTAMPTZ', '有効期限（NULLで永久）'],
      ['added_by', 'UUID', '登録者'],
      ['created_at', 'TIMESTAMPTZ', '登録日時'],
    ],
    'fraud_detection_logs': [
      ['id', 'UUID', 'PK'],
      ['transaction_id', 'UUID', 'FK → transactions'],
      ['rule_id', 'UUID', 'FK → fraud_rules'],
      ['action_taken', 'fraud_action', '実際に取られたアクション'],
      ['score', 'DECIMAL(5,4)', 'AI不正スコア'],
      ['matched_conditions', 'JSONB', 'マッチした条件の詳細'],
      ['is_false_positive', 'BOOLEAN', '誤検知フラグ（事後判定）'],
      ['reviewed_by', 'UUID', '確認者'],
      ['reviewed_at', 'TIMESTAMPTZ', '確認日時'],
      ['created_at', 'TIMESTAMPTZ', '検知日時'],
    ],
    'ai_models': [
      ['id', 'UUID', 'PK'],
      ['module', 'ai_module_type', 'fraud/review/routing/chat/prediction/url_patrol'],
      ['version', 'VARCHAR(20)', 'バージョン（v2.1等）'],
      ['status', 'ai_model_status', 'training/shadow/active/retired'],
      ['accuracy', 'DECIMAL(5,2)', '精度'],
      ['precision_score', 'DECIMAL(5,2)', '適合率'],
      ['recall', 'DECIMAL(5,2)', '再現率'],
      ['f1_score', 'DECIMAL(5,2)', 'F1スコア'],
      ['false_positive_rate', 'DECIMAL(5,4)', '誤検知率'],
      ['training_data_count', 'INT', '学習データ件数'],
      ['trained_at', 'TIMESTAMPTZ', '学習完了日時'],
      ['activated_at', 'TIMESTAMPTZ', '本番投入日時'],
      ['created_at', 'TIMESTAMPTZ', '作成日時'],
    ],
    'ai_prompts': [
      ['id', 'UUID', 'PK'],
      ['function_name', 'VARCHAR(50)', '機能名（6種）'],
      ['display_name', 'VARCHAR(100)', '表示名'],
      ['model', 'VARCHAR(50)', '使用モデル'],
      ['max_tokens', 'INT', '最大トークン数'],
      ['temperature', 'DECIMAL(3,2)', 'Temperature'],
      ['system_prompt', 'TEXT', 'システムプロンプト'],
      ['is_active', 'BOOLEAN', '有効フラグ'],
      ['updated_by', 'UUID', '更新者'],
      ['updated_at', 'TIMESTAMPTZ', '更新日時'],
    ],
    'audit_logs': [
      ['id', 'BIGSERIAL', 'PK'],
      ['user_id', 'UUID', '操作者'],
      ['user_type', 'VARCHAR(20)', 'admin/merchant/agent'],
      ['user_name', 'VARCHAR(100)', '表示名'],
      ['action_type', 'VARCHAR(50)', '操作種別'],
      ['target_page', 'VARCHAR(100)', '対象ページ'],
      ['target_url', 'TEXT', 'URL/詳細'],
      ['ip_address', 'INET', 'IPアドレス'],
      ['user_agent', 'TEXT', 'User-Agent'],
      ['details', 'JSONB', '変更内容の詳細'],
      ['created_at', 'TIMESTAMPTZ', '操作日時（月次パーティション、90日保持）'],
    ],
    'processor_applications': [
      ['id', 'UUID', 'PK'],
      ['application_id', 'UUID', 'FK → merchant_applications'],
      ['site_id', 'UUID', 'FK → sites'],
      ['processor_id', 'UUID', 'FK → processors'],
      ['status', 'proc_app_status', 'pending→api_review→merchant_registration→test_transaction→approved/rejected'],
      ['api_review_status', 'VARCHAR(20)', 'API審査ステータス'],
      ['merchant_reg_status', 'VARCHAR(20)', '加盟店登録ステータス'],
      ['test_txn_status', 'VARCHAR(20)', 'テスト決済ステータス'],
      ['external_merchant_id', 'VARCHAR(100)', '接続先側の加盟店ID'],
      ['notes', 'TEXT', 'メモ'],
      ['created_at', 'TIMESTAMPTZ', '作成日時'],
      ['updated_at', 'TIMESTAMPTZ', '更新日時'],
    ],
  };

  let rowIdx = 0;
  Object.entries(tableColumns).forEach(([tableName, columns]) => {
    // テーブル名セクション
    const secRow = ws2detail.addRow([tableName, '', '', '']);
    applySubHeaderRow(secRow);

    columns.forEach((col, i) => {
      const dr = ws2detail.addRow([tableName, col[0], col[1], col[2]]);
      applyBodyRow(dr, i % 2 === 1);
      dr.getCell(1).font = { ...bodyFontSmall, color: { argb: 'FF888888' } };
      rowIdx++;
    });
    ws2detail.addRow([]); // テーブル間の空行
  });

  // ENUM一覧シート
  const wsEnum = workbook.addWorksheet('ENUM型一覧', {
    properties: { tabColor: { argb: 'FF548235' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });
  wsEnum.columns = [
    { width: 6 },
    { width: 30 },
    { width: 60 },
    { width: 10 },
  ];
  wsEnum.mergeCells('A1:D1');
  wsEnum.getCell('A1').value = 'ENUM型一覧（全42型）';
  wsEnum.getCell('A1').font = titleFont;
  wsEnum.getRow(1).height = 28;
  wsEnum.addRow([]);
  const enumH = wsEnum.addRow(['#', 'ENUM名', '値', 'Ver']);
  applyHeaderRow(enumH);

  const enumList = [
    // v1.4追加分（主要なもの）
    ['fraud_rule_type', 'amount_threshold, velocity, geo_restriction, time_amount, ai_score, pattern, list_match, custom', 'v1.4'],
    ['fraud_action', 'auto_block, queue_review, queue_review_confirm, flag_only', 'v1.4'],
    ['ai_module_type', 'fraud, review, routing, chat, prediction, url_patrol', 'v1.4'],
    ['ai_model_status', 'training, shadow, active, retired', 'v1.4'],
    ['proc_app_status', 'pending, api_review, merchant_registration, test_transaction, approved, rejected', 'v1.4'],
    // v1.3
    ['reserve_tx_type', 'hold, release', 'v1.3'],
    // v1.2
    ['customer_risk_level', 'low, medium, high, blocked', 'v1.2'],
    ['customer_segment', 'new, returning, loyal, dormant, churned', 'v1.2'],
    // v1.1
    ['site_status', 'pending, active, suspended, terminated', 'v1.1'],
    ['payment_link_type', 'fixed, amount_input, amount_select', 'v1.1'],
    ['link_status', 'active, inactive, expired', 'v1.1'],
    ['subscription_type', 'recurring, installment', 'v1.1'],
    ['billing_cycle_type', 'interval, monthly', 'v1.1'],
    ['plan_status', 'active, paused, archived', 'v1.1'],
    ['subscription_user_status', 'active, paused, stopped, completed, failed_stopped', 'v1.1'],
    ['announcement_type', 'incident, maintenance, release, info', 'v1.1'],
    ['announcement_priority', 'critical, high, normal, low', 'v1.1'],
    ['error_category', 'card_error, system_error, validation_error, auth_error, network_error, processor_error', 'v1.1'],
    ['agent_status', 'active, suspended, terminated', 'v1.1'],
    ['agent_role', 'agent_admin, agent_viewer', 'v1.1'],
    ['commission_status', 'pending, confirmed, paid', 'v1.1'],
  ];
  enumList.forEach((e, i) => {
    const dr = wsEnum.addRow([i + 1, e[0], e[1], e[2]]);
    applyBodyRow(dr, i % 2 === 1);
    if (versionFills[e[2]]) {
      dr.getCell(4).fill = versionFills[e[2]];
    }
  });

  // ═══════════════════════════════════════════
  // シート3: API一覧（READ系）
  // ═══════════════════════════════════════════
  const ws3r = workbook.addWorksheet('API一覧(READ)', {
    properties: { tabColor: { argb: 'FFC00000' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  });
  ws3r.columns = [
    { width: 8 },   // #
    { width: 28 },  // API
    { width: 24 },  // 呼出元画面
    { width: 55 },  // 必要データ
    { width: 16 },  // 更新頻度
  ];

  ws3r.mergeCells('A1:E1');
  ws3r.getCell('A1').value = 'コアシステム連携 API一覧（READ系）v2.0';
  ws3r.getCell('A1').font = titleFont;
  ws3r.getRow(1).height = 28;

  ws3r.mergeCells('A2:E2');
  ws3r.getCell('A2').value = '作成日: 2026-02-18 | 確認先: 江成チーム | READ 62件';
  ws3r.getCell('A2').font = { ...bodyFont, italic: true, color: { argb: 'FF666666' } };

  ws3r.addRow([]);
  const apiRH = ws3r.addRow(['#', 'API', '呼出元画面', '必要データ', '更新頻度']);
  applyHeaderRow(apiRH);

  const readAPIs = [
    // 1.1 取引・決済
    ['__section', '1.1 取引・決済'],
    ['R-001', '取引リアルタイムフィード', 'M03 リアルタイム監視', '取引ID/加盟店/サイト/金額/ブランド/プロセッサー/ルーティング理由/応答時間/3DS結果/ステータス', '5秒ポーリング/WS'],
    ['R-002', '取引検索', 'M03b, S02', '16項目検索条件+マネロン疑いフラグ', 'オンデマンド'],
    ['R-003', '取引KPI', 'M01, M03, S01', '取引量/売上額/成功率/CB率/自動化率', '1分間隔'],
    ['R-004', '取引推移チャート', 'M01, S01', '日次/時間別の件数・金額', '5分間隔'],
    ['R-005', '決済手段分布', 'S01', 'ブランド別の件数・金額・構成比', '日次集計'],
    ['R-006', '取引詳細', 'M03, M03b, S02', '基本/購入者/ルーティング/3DS/タイムライン/関連取引', 'オンデマンド'],
    ['R-007', 'KPIドリルダウン', 'M01', '個別KPIの詳細内訳', 'オンデマンド'],
    // 1.2 顧客
    ['__section', '1.2 顧客'],
    ['R-010', '顧客検索', 'M16, S11', '顧客ID/メール/カード/LTV/リスク/セグメント/タグ', 'オンデマンド'],
    ['R-011', '顧客KPI', 'M16, S11', '総顧客数/アクティブ率/平均LTV/リピート率/新規数', '日次集計'],
    ['R-012', '顧客分析', 'M16, S11', 'セグメント分布/LTV分布/コホート', '日次集計'],
    ['R-013', '顧客詳細', 'M16, S11', '取引履歴/カード一覧/メモ一覧', 'オンデマンド'],
    // 1.3 サブスク
    ['__section', '1.3 サブスクリプション'],
    ['R-020', 'プラン一覧', 'M14, S10', 'プランID/名前/タイプ/金額/サイクル/ユーザー数/ステータス', 'オンデマンド'],
    ['R-021', 'サブスクユーザー一覧', 'M14, S10', 'ユーザーID/メール/プラン/次回決済日/失敗回数/ステータス', 'オンデマンド'],
    ['R-022', '決済履歴（継続）', 'M14, S10', '実行日時/結果/リトライ/エラーコード', 'オンデマンド'],
    ['R-023', 'CSVバッチ一覧', 'S10', 'バッチID/名称/件数/合計金額/ステータス', 'オンデマンド'],
    ['R-024', 'CSVバッチ詳細', 'S10', '個別レコード一覧、バリデーション結果', 'オンデマンド'],
    // 1.4 加盟店
    ['__section', '1.4 加盟店・サイト'],
    ['R-030', '加盟店一覧', 'M04', 'ID/名称/業種/ステータス/月間処理額/成功率/CB率/代理店', 'オンデマンド'],
    ['R-031', '加盟店詳細', 'M04', '会社情報/口座情報/API設定/月次チャート', 'オンデマンド'],
    ['R-032', 'サイト一覧', 'M04', 'サイトID/名前/URL/ステータス/接続先数', 'オンデマンド'],
    ['R-033', 'サイト詳細', 'M04', '3DS設定/リカーリング/CVV/トークン化/IP制限/Webhook', 'オンデマンド'],
    ['R-034', 'サイト接続先詳細', 'M04', 'ブランド別手数料率/TR手数料6項目/デポジット/取引制限', 'オンデマンド'],
    ['R-035', '審査申込一覧', 'M06', '申込ID/会社名/業種/AI審査結果/ステータス', 'オンデマンド'],
    ['R-036', 'AI審査詳細', 'M06', '反社/Web/財務/業種リスク/総合スコア', 'WebSocket'],
    ['R-037', 'サイト追加申込一覧', 'M06', '申込ID/加盟店/サイト名/URL/ステータス', 'オンデマンド'],
    ['R-038', '接続先審査状況', 'M09b', '審査ID/接続先/ステータス/3ステップ進捗', 'オンデマンド'],
    // 1.5 精算
    ['__section', '1.5 精算・入金'],
    ['R-040', '精算バッチ一覧', 'M08', 'バッチID/対象期間/総額/手数料/純振込額', 'オンデマンド'],
    ['R-041', '精算バッチ詳細', 'M08', '加盟店別精算/接続先別TR・CB手数料', 'オンデマンド'],
    ['R-042', '入金スケジュール', 'M08, S04', '入金予定日/売上合計/手数料/リザーブ/純入金額', '日次更新'],
    ['R-043', '入金履歴', 'S04', '入金日/売上/手数料/リザーブ/ステータス', 'オンデマンド'],
    ['R-044', 'リザーブ情報', 'S04', '現在残高/解放予定/プロセッサー別条件', '日次更新'],
    // 1.6 代理店
    ['__section', '1.6 代理店'],
    ['R-050', '代理店一覧', 'M15', '代理店ID/名称/紹介数/月間処理額/報酬率', 'オンデマンド'],
    ['R-051', '代理店詳細', 'M15', '基本情報/紐付加盟店/サイト/報酬履歴', 'オンデマンド'],
    ['R-052', '紹介先加盟店一覧', 'D02', '加盟店ID/名称/取引額/サイト一覧', 'オンデマンド'],
    ['R-053', '報酬明細一覧', 'D03', '報告書ID/対象月/支払金額/ステータス', 'オンデマンド'],
    ['R-054', '報酬明細詳細', 'D03', '加盟店別内訳テーブル', 'オンデマンド'],
    ['R-055', '代理店決済検索', 'D02', '12項目検索', 'オンデマンド'],
    ['R-056', '代理店KPI', 'D01', '紹介加盟店数/取引総額/報酬/月次推移', '日次集計'],
    // 1.7 不正検知
    ['__section', '1.7 不正検知・ルーティング'],
    ['R-060', '不正検知ルール一覧', 'M07', 'ルールID/名前/条件（構造化）/アクション/テストモード/ヒット数', 'オンデマンド'],
    ['R-061', 'ブロック/ホワイトリスト', 'M07', 'リスト種別/エントリ種別/値/理由/有効期限', 'オンデマンド'],
    ['R-062', '不正検知ログ', 'M07', '検知日時/取引ID/ルールID/アクション/スコア', 'オンデマンド'],
    ['R-063', '加盟店別オーバーライド', 'M07', '加盟店ID/ルールID/オーバーライド条件', 'オンデマンド'],
    ['R-064', 'ルール影響シミュレーション', 'M07', '過去30日データでの影響分析', 'オンデマンド'],
    ['R-065', 'ルーティングルール一覧', 'M10', 'ルールID/名前/条件/優先度/ヒット数', 'オンデマンド'],
    ['R-066', 'ルーティング実行ログ', 'M10', '実行日時/取引ID/適用ルール/選択プロセッサー', 'オンデマンド'],
    ['R-067', 'プロセッサー状態', 'M09, M13, M01', 'ID/名称/ステータス/稼働率/レスポンス', '30秒間隔'],
    ['R-068', 'プロセッサー詳細', 'M13', '手数料マトリクス/TR手数料/デポジット/ヘルス', 'オンデマンド'],
    // 1.8 AI
    ['__section', '1.8 AI管理'],
    ['R-070', 'AIモジュール一覧', 'M05', 'モジュール名/バージョン/精度/APIコスト/エラー数', '5分間隔'],
    ['R-071', 'AIモデル履歴', 'M05, M07', 'バージョン/精度/学習データ件数/本番投入日', 'オンデマンド'],
    ['R-072', 'AIモデル比較', 'M07', '現行vs新モデルの精度比較', 'オンデマンド'],
    ['R-073', 'AIプロンプト一覧', 'M13', '6種プロンプト設定', 'オンデマンド'],
    // 1.9 システム
    ['__section', '1.9 システム管理'],
    ['R-080', '例外キュー一覧', 'M02, M01', 'キューID/タイプ/リスクスコア/AI推薦/ステータス', '30秒間隔'],
    ['R-081', '操作ログ検索', 'M13', '8項目検索', 'オンデマンド'],
    ['R-082', '通知設定一覧', 'M13', 'チャネル/イベント別通知ルール', 'オンデマンド'],
    ['R-083', 'お知らせ一覧', 'M13, M01, S01, D01', 'お知らせID/タイトル/タイプ/ステータス', 'オンデマンド'],
    ['R-084', 'エラーコード一覧', 'M13', 'コード/カテゴリ/メッセージ/対処法', 'オンデマンド'],
    ['R-085', '決済手段設定', 'M13', 'ブランド別設定', 'オンデマンド'],
    ['R-086', 'セキュリティ設定', 'M13', 'パスワードポリシー/2FA/IP制限/セッション', 'オンデマンド'],
    ['R-087', 'Webhookログ', 'S05', 'イベント名/日時/ステータス/レスポンスタイム', 'オンデマンド'],
    ['R-088', 'スタッフ一覧', 'M12, S07, D05', 'ID/名前/メール/ロール/MFA/最終ログイン', 'オンデマンド'],
    ['R-089', 'レポートテンプレート一覧', 'M11', 'テンプレートID/名前/パラメータ定義', 'オンデマンド'],
    ['R-090', 'レポート配信ログ', 'M11', '配信日時/送信先/ステータス', 'オンデマンド'],
    ['R-091', '決済リンク一覧', 'S09', 'リンクID/名前/タイプ/金額/利用数/URL', 'オンデマンド'],
    ['R-092', '決済リンク詳細', 'S09', '利用分析/直近取引一覧', 'オンデマンド'],
  ];

  let apiIdx = 0;
  readAPIs.forEach((a) => {
    if (a[0] === '__section') {
      const secRow = ws3r.addRow(['', a[1], '', '', '']);
      applySubHeaderRow(secRow);
      ws3r.mergeCells(`B${secRow.number}:E${secRow.number}`);
      return;
    }
    apiIdx++;
    const dr = ws3r.addRow(a);
    applyBodyRow(dr, apiIdx % 2 === 1);
    // リアルタイム系は色付け
    if (a[4] && (a[4].includes('秒') || a[4].includes('WS') || a[4].includes('WebSocket'))) {
      dr.getCell(5).font = { ...bodyFont, bold: true, color: { argb: 'FFFF0000' } };
    }
  });

  // ═══════════════════════════════════════════
  // シート4: API一覧（WRITE系）
  // ═══════════════════════════════════════════
  const ws3w = workbook.addWorksheet('API一覧(WRITE)', {
    properties: { tabColor: { argb: 'FFC00000' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  });
  ws3w.columns = [
    { width: 8 },   // #
    { width: 28 },  // API
    { width: 20 },  // 呼出元画面
    { width: 50 },  // 送信データ
    { width: 28 },  // 備考
  ];

  ws3w.mergeCells('A1:E1');
  ws3w.getCell('A1').value = 'コアシステム連携 API一覧（WRITE系）v2.0';
  ws3w.getCell('A1').font = titleFont;
  ws3w.getRow(1).height = 28;

  ws3w.mergeCells('A2:E2');
  ws3w.getCell('A2').value = '作成日: 2026-02-18 | 確認先: 江成チーム | WRITE 75件';
  ws3w.getCell('A2').font = { ...bodyFont, italic: true, color: { argb: 'FF666666' } };

  ws3w.addRow([]);
  const apiWH = ws3w.addRow(['#', 'API', '呼出元画面', '送信データ', '備考']);
  applyHeaderRow(apiWH);

  const writeAPIs = [
    ['__section', '2.1 取引操作'],
    ['W-001', '返金実行', 'M03b, S02', '取引ID, 返金種別, 返金金額, 理由', '権限: admin以上'],
    ['W-002', '取引キャンセル', 'M03b', '取引ID', '権限: admin以上'],
    ['__section', '2.2 加盟店・審査・サイト'],
    ['W-010', '加盟店申込送信', 'P01', '会社情報/業種/決済設定/書類', 'AI審査パイプライン起動'],
    ['W-011', '審査承認/拒否', 'M06', '申込ID, 判定, コメント, inputConfirm', '権限: admin以上'],
    ['W-012', '審査条件確定', 'M06', '手数料率/TR手数料/デポジット等20項目', '権限: super_admin'],
    ['W-013', '加盟店ステータス変更', 'M04', '加盟店ID, 新ステータス', '権限: super_admin'],
    ['W-014', '加盟店手数料率変更', 'M04', '加盟店ID, サイトID, 接続先ID, ブランド別手数料率', '権限: super_admin'],
    ['W-015', 'サイト追加申請', 'S06', '加盟店ID, サイト名, URL, 業種, 月間想定額', '審査フロー起動'],
    ['W-016', 'サイト追加（運営側）', 'M04', '加盟店ID, サイト名, URL, 業種, 決済設定', '権限: admin以上'],
    ['W-017', 'サイト設定保存', 'M04', 'サイトID, 3DS/リカーリング/CVV等全設定', '権限: admin以上、ConfirmDialog'],
    ['W-018', '接続先審査開始', 'M06', '申込ID, 接続先ID', '権限: admin以上'],
    ['W-019', '再申込許可', 'M06', '申込ID, コメント', '権限: admin以上'],
    ['W-020', '代理店申込送信', 'P03', '会社名/代表者/住所/電話/メール/口座情報', ''],
    ['__section', '2.3 精算・入金'],
    ['W-030', '精算バッチ実行', 'M08', '対象期間, 対象加盟店', '権限: super_admin'],
    ['W-031', '精算バッチ再実行', 'M08', 'バッチID', 'エラー分のみ再実行'],
    ['__section', '2.4 サブスク・CSV決済'],
    ['W-040', 'プラン作成', 'S10', 'プラン名/タイプ/金額/サイクル', ''],
    ['W-041', 'プラン更新', 'S10', 'プランID, 変更フィールド', ''],
    ['W-042', 'ユーザー一時停止/再開', 'S10, M14', 'ユーザーID, アクション', ''],
    ['W-043', '手動リトライ', 'S10, M14', 'ユーザーID', '失敗したサブスク決済のリトライ'],
    ['W-044', '強制停止', 'S10, M14', 'ユーザーID', '再開不可'],
    ['W-045', 'CSVバッチアップロード', 'S10', 'CSVファイル, バッチ名, 予定日', '承認フロー必須'],
    ['W-046', 'CSVバッチ承認/却下', 'S10', 'バッチID, 判定', '権限: admin以上'],
    ['__section', '2.5 例外キュー'],
    ['W-050', '例外承認/拒否', 'M02', 'キューID, 判定, コメント', ''],
    ['W-051', '例外バッチ操作', 'M02', 'キューID[], 判定', '複数件一括'],
    ['__section', '2.6 不正検知'],
    ['W-060', 'ルール作成', 'M07', 'ルール名/条件（構造化）/アクション/優先度/スコープ', '承認フロー: admin→super_admin'],
    ['W-061', 'ルール更新', 'M07', 'ルールID, 変更フィールド', '承認フロー: admin→super_admin'],
    ['W-062', 'ルール削除', 'M07', 'ルールID', 'ConfirmDialog（danger型）'],
    ['W-063', 'ブロックリスト追加', 'M07', 'リスト種別, エントリ種別, 値, 理由, 有効期限', ''],
    ['W-064', 'ブロックリスト削除', 'M07', 'エントリID', ''],
    ['W-065', '加盟店別オーバーライド', 'M07', '加盟店ID, ルールID, オーバーライド条件', ''],
    ['W-066', 'CSVインポート（制限リスト）', 'M07', 'CSVファイル', 'プレビュー→確認→実行'],
    ['W-067', 'ルールテスト実行', 'M07', 'ルールID', 'テストモードで検知ログのみ'],
    ['W-068', 'シミュレーション実行', 'M07', 'ルール変更案', '過去30日データで影響確認'],
    ['__section', '2.7 ルーティング'],
    ['W-070', 'ルール作成', 'M10', 'ルール名/条件/優先度/フェイルオーバー', ''],
    ['W-071', 'ルール更新', 'M10', 'ルールID, 変更フィールド', ''],
    ['W-072', 'ルール削除', 'M10', 'ルールID', ''],
    ['W-073', 'ルール並替', 'M10', 'ルールID[], 新しい優先度順', ''],
    ['W-074', 'プロセッサー有効化/無効化', 'M13', 'プロセッサーID, ステータス', ''],
    ['W-075', 'プロセッサー追加', 'M13', '接続先名/APIエンドポイント/環境', ''],
    ['W-076', '接続テスト実行', 'M13', 'プロセッサーID', 'ヘルスチェック'],
    ['__section', '2.8 AI管理'],
    ['W-080', 'AIモデル切替', 'M07, M05', 'モジュール, 新バージョン', 'ConfirmDialog（approve型）'],
    ['W-081', 'AIモデル却下', 'M07, M05', 'モジュール, バージョン', ''],
    ['W-082', '再学習スケジュール設定', 'M05', 'モジュール, スケジュール', ''],
    ['W-083', 'AIプロンプト更新', 'M13', 'プロンプトID, モデル/maxTokens/temperature/プロンプト', ''],
    ['W-084', 'AIプロンプトテスト', 'M13', 'プロンプトID, テスト入力', ''],
    ['W-085', 'AIサマリー再生成', 'M01', '—', 'ダッシュボードAIサマリー再生成'],
    ['W-086', 'AIチャット送信', 'M01, S12', 'メッセージ, セッションID', 'ストリーミング対応推奨'],
    ['__section', '2.9 設定・管理'],
    ['W-090', 'APIキー再発行', 'S05, S08', '環境（本番/テスト）', 'ConfirmDialog必須'],
    ['W-091', 'Webhook設定更新', 'S05', 'URL, イベント種別[]', ''],
    ['W-092', 'Webhookテスト送信', 'S05', 'エンドポイントURL', ''],
    ['W-093', 'IP制限設定', 'S05', 'IP/CIDR, ラベル', ''],
    ['W-094', '会社情報変更申請', 'S08', '変更フィールド, 新値', '承認フロー'],
    ['W-095', '口座変更申請', 'S08', '銀行情報', '承認フロー（1-3営業日）'],
    ['W-096', 'パスワード変更', 'S08, D05', '現/新パスワード', ''],
    ['W-097', 'スタッフ招待', 'M12, S07, D05', '名前/メール/ロール/MFA/カテゴリ', ''],
    ['W-098', 'スタッフ権限変更', 'M12, S07, D05', 'ユーザーID, 新ロール, 理由', 'ConfirmDialog、監査ログ記録'],
    ['W-099', 'スタッフ無効化', 'M12, S07', 'ユーザーID', 'ConfirmDialog（danger型）'],
    ['W-100', 'パスワードリセット', 'M12', 'ユーザーID', 'リセットメール送信'],
    ['W-101', '顧客ブロック/ホワイトリスト', 'M16', '顧客ID, アクション, 理由', 'ConfirmDialog'],
    ['W-102', '顧客タグ追加', 'M16, S11', '顧客ID, タグ名', ''],
    ['W-103', '顧客メモ追加', 'M16, S11', '顧客ID, メモ内容', ''],
    ['W-104', '代理店紹介送信', 'D04', '会社名/代表者名/業種/URL/月間想定額', 'ConfirmDialog'],
    ['W-105', '通知設定更新', 'M13', 'チャネル/イベント別ルール/サイレント時間', ''],
    ['W-106', 'お知らせCRUD', 'M13', 'タイトル/本文/タイプ/対象/公開日時', ''],
    ['W-107', '決済手段有効/無効化', 'M13', 'ブランド, 有効フラグ', ''],
    ['W-108', 'セキュリティ設定更新', 'M13', 'パスワードポリシー/2FA/セッション/メンテナンスモード', ''],
    ['W-109', '操作ログCSVエクスポート', 'M13', '検索条件', 'CSVファイル生成'],
    ['W-110', '決済リンク作成', 'S09', 'タイプ/商品名/金額/有効期限/利用回数', ''],
    ['W-111', '決済リンク更新', 'S09', 'リンクID, 変更フィールド', ''],
    ['W-112', '決済リンク一時停止/削除', 'S09', 'リンクID, アクション', ''],
    ['W-113', 'レポート生成', 'M11', 'テンプレートID, パラメータ', 'PDF/CSV生成'],
    ['W-114', 'レポート配信設定', 'M11', 'テンプレートID, 配信先/方法/スケジュール', ''],
    ['W-115', '外部APIキー更新', 'M13', 'サービス名, 環境, 新キー', ''],
  ];

  apiIdx = 0;
  writeAPIs.forEach((a) => {
    if (a[0] === '__section') {
      const secRow = ws3w.addRow(['', a[1], '', '', '']);
      applySubHeaderRow(secRow);
      ws3w.mergeCells(`B${secRow.number}:E${secRow.number}`);
      return;
    }
    apiIdx++;
    const dr = ws3w.addRow(a);
    applyBodyRow(dr, apiIdx % 2 === 1);
    // 権限系は赤色
    if (a[4] && a[4].includes('権限')) {
      dr.getCell(5).font = { ...bodyFont, color: { argb: 'FFCC0000' } };
    }
    // ConfirmDialog系はオレンジ
    if (a[4] && a[4].includes('ConfirmDialog')) {
      dr.getCell(5).font = { ...bodyFont, color: { argb: 'FFFF8C00' } };
    }
  });

  // WebSocketシート
  const wsWS = workbook.addWorksheet('WebSocket', {
    properties: { tabColor: { argb: 'FFC00000' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });
  wsWS.columns = [
    { width: 8 },
    { width: 28 },
    { width: 24 },
    { width: 50 },
    { width: 20 },
  ];
  wsWS.mergeCells('A1:E1');
  wsWS.getCell('A1').value = 'リアルタイム通信（WebSocket要件）';
  wsWS.getCell('A1').font = titleFont;
  wsWS.getRow(1).height = 28;
  wsWS.addRow([]);
  const wsH = wsWS.addRow(['#', 'チャネル', '用途', 'データ', '画面']);
  applyHeaderRow(wsH);

  const wsData = [
    ['WS-001', 'transactions.live', '決済リアルタイムフィード', '全取引イベント（ID/加盟店/金額/ブランド/ステータス/レスポンス）', 'M03'],
    ['WS-002', 'queue.updates', '例外キュー更新', '新規キュー/ステータス変更', 'M02, M01'],
    ['WS-003', 'processor.health', 'プロセッサーヘルス', '稼働率/レスポンス/エラー数', 'M13, M01'],
    ['WS-004', 'review.progress', 'AI審査進捗', '各チェック項目の結果（反社/Web/財務/業種）', 'P01, M06'],
    ['WS-005', 'ai.chat', 'AIチャット', 'メッセージ送受信（ストリーミング対応推奨）', 'M01, S12'],
    ['WS-006', 'fraud.alerts', '不正検知アラート', '高リスク取引のリアルタイム通知', 'M07, M01'],
  ];
  wsData.forEach((d, i) => {
    const dr = wsWS.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
  });

  // APIサマリーシート
  const wsSumm = workbook.addWorksheet('APIサマリー', {
    properties: { tabColor: { argb: 'FFC00000' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });
  wsSumm.columns = [
    { width: 6 },
    { width: 28 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 10 },
  ];
  wsSumm.mergeCells('A1:F1');
  wsSumm.getCell('A1').value = 'API数サマリー';
  wsSumm.getCell('A1').font = titleFont;
  wsSumm.getRow(1).height = 28;
  wsSumm.addRow([]);
  const summH = wsSumm.addRow(['', 'カテゴリ', 'READ', 'WRITE', 'WebSocket', '合計']);
  applyHeaderRow(summH);

  const apiSummary = [
    ['', '取引・決済', 7, 2, 1, 10],
    ['', '顧客', 4, 3, 0, 7],
    ['', 'サブスク・CSV', 5, 7, 0, 12],
    ['', '加盟店・サイト・審査', 9, 11, 1, 21],
    ['', '精算・入金', 5, 2, 0, 7],
    ['', '代理店', 7, 1, 0, 8],
    ['', '不正検知', 5, 9, 1, 15],
    ['', 'ルーティング・接続先', 4, 7, 1, 12],
    ['', 'AI管理', 4, 7, 1, 12],
    ['', 'システム管理', 12, 26, 1, 39],
    ['', '合計', 62, 75, 6, 143],
  ];
  apiSummary.forEach((d, i) => {
    const dr = wsSumm.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
    if (i === apiSummary.length - 1) {
      dr.eachCell(c => { c.font = { ...bodyFont, bold: true }; });
      dr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; });
    }
  });

  // 確認事項シート
  const wsConfirm = workbook.addWorksheet('確認事項', {
    properties: { tabColor: { argb: 'FFFFC000' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });
  wsConfirm.columns = [
    { width: 6 },
    { width: 18 },
    { width: 80 },
    { width: 12 },
  ];
  wsConfirm.mergeCells('A1:D1');
  wsConfirm.getCell('A1').value = '確認事項（江成チームへ）';
  wsConfirm.getCell('A1').font = titleFont;
  wsConfirm.getRow(1).height = 28;
  wsConfirm.addRow([]);
  const confH = wsConfirm.addRow(['#', 'カテゴリ', '確認事項', 'ステータス']);
  applyHeaderRow(confH);

  const confirmItems = [
    ['データモデル', '取引データに「購入者ID/メール/名前/カード名義」は含まれるか？', '未確認'],
    ['データモデル', '顧客データの名寄せロジック（メール優先 or カード優先 or 加盟店側ID優先？）', '未確認'],
    ['データモデル', 'リザーブ（デポジット）の計算ロジックはプロセッサー別か？', '未確認'],
    ['データモデル', 'CSVバッチ決済のpaymentid空欄時の挙動（新規決済扱い？）', '未確認'],
    ['API仕様', 'リアルタイム監視のデータ取得方式（WebSocket / SSE / ポーリング？）', '未確認'],
    ['API仕様', '取引検索APIのページネーション仕様（カーソル / オフセット？）', '未確認'],
    ['API仕様', '返金APIのレスポンス（同期 / 非同期？処理完了通知方法は？）', '未確認'],
    ['API仕様', 'AI審査のプログレス通知方式（WebSocket推奨）', '未確認'],
    ['不正検知', '条件ビルダーの35フィールドのうち、コアシステム側で取得可能なフィールドはどれか？', '未確認'],
    ['不正検知', '速度チェック系（同一カード取引回数等）のリアルタイム集計はコアシステム側で対応可能か？', '未確認'],
    ['不正検知', 'IP国判定/プロキシ・VPN検知/Tor検知のデータソース（MaxMind等？）', '未確認'],
    ['不正検知', 'デバイスフィンガープリントの実装方式', '未確認'],
    ['不正検知', '使い捨てメール判定のデータソース', '未確認'],
    ['不正検知', 'ルール変更の承認フロー（admin→super_admin）をAPI側で制御するか？', '未確認'],
    ['不正検知', 'シミュレーション実行（過去30日データ再評価）のパフォーマンス要件', '未確認'],
    ['ルーティング', 'ルーティングエンジンのA/Bテスト機能の有無', '未確認'],
    ['ルーティング', 'フェイルオーバーチェーンのコスト比較データ', '未確認'],
    ['ルーティング', 'ルール並替（優先度変更）のAPI仕様', '未確認'],
    ['精算', '精算サイクルの設定粒度（週次/月2回/月次？加盟店別可能？）', '未確認'],
    ['精算', '手数料計算のタイミング（取引時 / 精算バッチ時？）', '未確認'],
    ['精算', 'ローリングリザーブの留保/解放バッチの実行タイミング', '未確認'],
    ['AI管理', 'AIモデルの学習・デプロイはコアシステム側で管理するか？', '未確認'],
    ['AI管理', 'AIプロンプト設定の変更��映タイミング（即時 / デプロイ時？）', '未確認'],
    ['AI管理', 'AIチャットのストリーミングレスポンス対応可否', '未確認'],
    ['その他', 'テスト環境と本番環境のデータ分離方式', '未確認'],
    ['その他', '監査ログの保持期間（PCI DSS: 90日以上）', '未確認'],
    ['その他', 'CSVエクスポートの上限件数', '未確認'],
    ['その他', 'ファイルアップロード（申込書類/CSV）のストレージ', '未確認'],
    ['その他', '接続先審査の3ステップの自動化範囲', '未確認'],
  ];
  confirmItems.forEach((d, i) => {
    const dr = wsConfirm.addRow([i + 1, d[0], d[1], d[2]]);
    applyBodyRow(dr, i % 2 === 1);
    // ステータスのセルを黄色に
    dr.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    dr.getCell(4).font = { ...bodyFont, color: { argb: 'FFCC6600' } };
  });

  // ═══════════════════════════════════════════
  // 保存
  // ═══════════════════════════════════════════
  const outputPath = path.join(__dirname, '..', 'docs', 'AI_Payment_System_仕様書_v2.0.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Excel file generated: ${outputPath}`);
  console.log(`Sheets: ${workbook.worksheets.map(ws => ws.name).join(', ')}`);
}

generateExcel().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
