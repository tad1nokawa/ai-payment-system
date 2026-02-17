import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..', 'docs');

// ─── 共通スタイル ───
const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Yu Gothic' };
const sectionFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
const sectionFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Yu Gothic' };
const subSectionFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
const subSectionFont = { bold: true, color: { argb: 'FF1E40AF' }, size: 10, name: 'Yu Gothic' };
const bodyFont = { size: 10, name: 'Yu Gothic' };
const thinBorder = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};
const altRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

function applyHeaderRow(ws, row, colCount) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', wrapText: true };
  }
  row.height = 24;
}

function applyBodyRow(ws, row, colCount, idx) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = bodyFont;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', wrapText: true };
    if (idx % 2 === 1) cell.fill = altRowFill;
  }
  row.height = 32;
}

function addSectionRow(ws, label, colCount) {
  const row = ws.addRow([label]);
  ws.mergeCells(row.number, 1, row.number, colCount);
  const cell = row.getCell(1);
  cell.fill = sectionFill;
  cell.font = sectionFont;
  cell.alignment = { vertical: 'middle' };
  cell.border = thinBorder;
  row.height = 28;
  return row;
}

function addSubSectionRow(ws, label, colCount) {
  const row = ws.addRow([label]);
  ws.mergeCells(row.number, 1, row.number, colCount);
  const cell = row.getCell(1);
  cell.fill = subSectionFill;
  cell.font = subSectionFont;
  cell.alignment = { vertical: 'middle' };
  cell.border = thinBorder;
  row.height = 22;
  return row;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 機能一覧表
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateFeatureList() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI Payment System';
  wb.created = new Date();

  // --- Sheet 1: マスター管理 ---
  const ws1 = wb.addWorksheet('マスター管理', { properties: { tabColor: { argb: 'FF3B82F6' } } });
  ws1.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'セクション', key: 'section', width: 14 },
    { header: '画面名', key: 'name', width: 18 },
    { header: '主な機能', key: 'features', width: 55 },
    { header: '主な操作', key: 'actions', width: 50 },
  ];
  applyHeaderRow(ws1, ws1.getRow(1), 5);

  const masterData = [
    ['概況', 'M01', 'ダッシュボード', 'KPI（取引量/売上/成功率/CB率/自動化率）、取引推移チャート、例外キュー概要、プロセッサーヘルス、AIチャットサポート', 'KPIドリルダウン、期間切替、AIチャット（アコーディオン開閉）'],
    ['概況', 'M02', '例外キュー', 'AI審査結果待ちの取引・申込を一覧表示、リスクスコア表示', '承認/拒否/エスカレーション、バッチ操作、詳細パネル'],
    ['モニタリング', 'M03', 'リアルタイム監視', '決済トランザクションのリアルタイムフィード（5秒更新）、KPI、アラート表示', 'ステータスフィルタ、取引詳細展開（基本情報/購入者/ルーティング/3DS）'],
    ['取引', 'M03b', '注文検索', '16項目の検索条件（取引ID/加盟店/カード/ブランド/金額/日時/ユーザー/代理店/チケット等）', '検索、返金、キャンセル、取引詳細スライドパネル、CSVエクスポート'],
    ['取引', 'M16', '顧客管理', '顧客検索（メール/カード下4桁/加盟店/リスク/セグメント/LTV/サブスク状態）、顧客分析', '顧客詳細、タグ追加、メモ追加、ブロック/ホワイトリスト、CSVエクスポート'],
    ['取引', 'M14', '継続課金管理', 'サブスクリプションプラン管理、ユーザー管理、決済履歴', 'プランCRUD、一時停止/再開、手動リトライ、強制停止'],
    ['加盟店', 'M04', '加盟店管理', '加盟店一覧、KPI（総加盟店数/月間処理額/平均成功率/CB率超過）、サイト別接続先管理（サイトID→接続先→ブランド別手数料オーバーライド）、代理店紐付表示', '加盟店詳細スライドパネル（サイト別接続先手数料テーブル/MID/デポジット/入金サイクル/オーバーライドハイライト）、ステータス変更、手数料率変更、CSVエクスポート'],
    ['加盟店', 'M06', '審査・申込', '申込一覧、AI審査結果表示（反社チェック/Web分析/財務分析/業種リスク）、条件確定フォーム（5ブランド手数料率/TR手数料6項目/デポジット・制限6項目/入金サイクル）', '承認/条件付き承認/拒否、審査詳細パネル、AIスコア確認、条件確定（20項目フォーム）'],
    ['加盟店', 'M15', '代理店管理', '代理店一覧、手数料体系管理、紐付加盟店一覧', '代理店詳細、報酬支払確認、手数料率編集'],
    ['精算', 'M08', '精算・入金管理', '精算バッチ一覧、入金スケジュール、加盟店別精算状況、接続先別TR/CB手数料ブレイクダウン', 'バッチ実行/再実行、入金詳細、ブランド別手数料確認、接続先別手数料明細'],
    ['精算', 'M11', 'レポート', 'レポートテンプレート（月次精算/加盟店別/ブランド別/CB等）', 'レポート生成、PDF/CSVエクスポート、配信設定'],
    ['決済インフラ', 'M09', '接続先管理', 'プロセッサー一覧（クレジット7社+WEBマネー7種=14接続先）、稼働率/レスポンス監視、ブランド別手数料マトリクス、TR手数料ブレイクダウン、制限条件（デポジット/取引上限/回数制限/固定費）、入金サイクル/CVV/NGジャンル、サイト別接続加盟店一覧', 'プロセッサー詳細パネル（手数料マトリクス/TR手数料/条件/入金情報/接続サイト一覧）、有効化/無効化、接続先追加、メンテナンス登録'],
    ['決済インフラ', 'M10', 'ルーティング', 'ルーティングルール管理（ブランド→プロセッサー）、A/Bテスト設定、フェイルオーバーチェーンのコスト比較', 'ルール追加/編集/並替、優先度変更、ルール有効化/無効化、コスト最適化判断'],
    ['決済インフラ', 'M07', '不正検知', '不正検知ルール管理（金額閾値/速度チェック/地域制限/AIスコア等）、ブロックリスト', 'ルール追加/編集/有効化、BIN/IP/メールブロックリスト管理'],
    ['運用', 'M05', 'AI監視', 'AIモジュール一覧（不正検知/審査/ルーティング/予測）、精度モニタリング', 'モデル詳細確認、再学習スケジュール設定、アラート閾値設定'],
    ['運用', 'M12', 'スタッフ管理', 'マスターシステムのスタッフ管理、ロール/権限管理', 'ユーザー追加/編集、ロール変更、MFA管理、活動ログ閲覧'],
    ['運用', 'M13', 'システム設定', '決済手段設定、手数料テーブル（TR手数料/CB手数料/デポジット率表示）、3DS設定、通知設定', '決済手段有効化/無効化、手数料率編集、3DSルール設定'],
  ];

  masterData.forEach((d, i) => {
    const row = ws1.addRow({ section: d[0], id: d[1], name: d[2], features: d[3], actions: d[4] });
    applyBodyRow(ws1, row, 5, i);
  });

  ws1.autoFilter = { from: 'A1', to: 'E1' };

  // --- Sheet 2: 加盟店管理 ---
  const ws2 = wb.addWorksheet('加盟店管理', { properties: { tabColor: { argb: 'FF22C55E' } } });
  ws2.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'セクション', key: 'section', width: 14 },
    { header: '画面名', key: 'name', width: 18 },
    { header: '主な機能', key: 'features', width: 55 },
    { header: '主な操作', key: 'actions', width: 50 },
  ];
  applyHeaderRow(ws2, ws2.getRow(1), 5);

  const merchantData = [
    ['ホーム', 'S01', 'ダッシュボード', 'KPI（月間売上/本日売上/成功率/平均単価）、売上チャート、決済手段分布、直近取引', '期間切替、KPIドリルダウン、クイックアクション'],
    ['注文', 'S02', '注文一覧', '取引一覧表示（ID/日時/金額/ステータス/決済方法/カード/注文番号）', '検索・フィルタ、取引詳細パネル、返金処理（全額/一部）、CSVエクスポート'],
    ['注文', 'S11', '顧客管理', '顧客検索（メール/カード/セグメント/サブスク状態）、顧客分析（LTV/リピート率/コホート）', '顧客詳細、タグ/メモ管理、CSVエクスポート'],
    ['集金ツール', 'S09', '決済リンク', '決済リンク一覧、QRコード生成', 'リンク作成/編集/停止、詳細パネル（利用分析/直近取引）'],
    ['集金ツール', 'S10', '決済管理', '商品設定（月額/年額/分割）、ユーザー管理、決済履歴、CSV決済', 'プラン作成/編集、ユーザー一時停止/再開、CSVバッチアップロード/承認'],
    ['売上', 'S03', '売上レポート', '月次売上KPI、日次チャート、ブランド別内訳、入金スケジュール', '期間切替、CSV/PDFエクスポート'],
    ['売上', 'S04', '入金確認', '入金履歴、入金カレンダー、リザーブ（デポジット）管理', '入金詳細パネル（売上→手数料→リザーブ→入金額）、CSVエクスポート'],
    ['設定', 'S05', 'API・Webhook', 'APIキー管理（本番/テスト）、Webhookエンドポイント設定、IP制限', 'キー再発行、Webhookテスト送信、IP追加/削除'],
    ['設定', 'S07', 'スタッフ管理', 'スタッフ一覧（ロール/MFA/最終ログイン）、権限マトリクス', 'スタッフ招待、ロール変更、アカウント無効化'],
    ['設定', 'S08', 'アカウント設定', '会社情報/口座情報/APIキー/セキュリティ/メンバー/通知/契約情報（7タブ）', '会社情報変更申請、口座変更申請、パスワード変更、2FA設定'],
    ['サポート', 'S06', 'AIチャット', 'AI対話サポート（売上確認/返金実行/API設定変更等）、会話履歴', 'メッセージ送信、クイックアクション、AI操作実行（確認付き）'],
  ];

  merchantData.forEach((d, i) => {
    const row = ws2.addRow({ section: d[0], id: d[1], name: d[2], features: d[3], actions: d[4] });
    applyBodyRow(ws2, row, 5, i);
  });
  ws2.autoFilter = { from: 'A1', to: 'E1' };

  // --- Sheet 3: 代理店管理 ---
  const ws3 = wb.addWorksheet('代理店管理', { properties: { tabColor: { argb: 'FFF97316' } } });
  ws3.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'セクション', key: 'section', width: 14 },
    { header: '画面名', key: 'name', width: 18 },
    { header: '主な機能', key: 'features', width: 55 },
    { header: '主な操作', key: 'actions', width: 50 },
  ];
  applyHeaderRow(ws3, ws3.getRow(1), 5);

  const agentData = [
    ['ホーム', 'D01', 'ダッシュボード', 'KPI（紹介加盟店数/取引総額/報酬見込/報酬確定額）、AI分析、通知', '期間切替、KPIドリルダウン、クイックアクション'],
    ['営業活動', 'D02', '紹介先一覧', '紹介加盟店テーブル（取次サイト一覧）、クレジット決済検索', '加盟店詳細パネル、決済検索（12項目）、決済詳細パネル'],
    ['営業活動', 'D04', '新規紹介', '紹介フォーム（会社名/代表者/業種/URL等）、紹介履歴', '紹介送信（確認付き）、ステータスタイムライン確認'],
    ['報酬', 'D03', '報酬明細', '報酬明細一覧（報告書ID/レポートNo./対象月/発行日/支払金額/支払予定日）', '明細詳細パネル（加盟店別内訳テーブル）、検索'],
    ['設定', 'D05', 'アカウント設定', 'アカウント情報、スタッフ管理（検索/登録）、個別権限設定', 'スタッフ検索/登録、権限設定（データDL許可/スタッフ編集許可）'],
  ];

  agentData.forEach((d, i) => {
    const row = ws3.addRow({ section: d[0], id: d[1], name: d[2], features: d[3], actions: d[4] });
    applyBodyRow(ws3, row, 5, i);
  });
  ws3.autoFilter = { from: 'A1', to: 'E1' };

  // --- Sheet 4: 公開画面 ---
  const ws4 = wb.addWorksheet('公開画面', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  ws4.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '画面名', key: 'name', width: 22 },
    { header: '主な機能', key: 'features', width: 60 },
    { header: '主な操作', key: 'actions', width: 40 },
  ];
  applyHeaderRow(ws4, ws4.getRow(1), 4);

  const publicData = [
    ['P01', '加盟店申込フォーム', '5ステップ申込（会社情報→業種→決済設定→書類→確認）、AI審査リアルタイム表示', 'フォーム入力、書類アップロード、送信'],
    ['P02', '決済ページ', 'カード入力フォーム、3DS認証、処理中/完了/エラー各状態', 'カード情報入力、支払実行'],
    ['P03', '代理店申込フォーム', '代理店向け申込フォーム', 'フォーム入力、送信'],
  ];

  publicData.forEach((d, i) => {
    const row = ws4.addRow({ id: d[0], name: d[1], features: d[2], actions: d[3] });
    applyBodyRow(ws4, row, 4, i);
  });

  // --- Sheet 5: 決済手段 ---
  const ws5 = wb.addWorksheet('決済手段', { properties: { tabColor: { argb: 'FF059669' } } });
  ws5.columns = [
    { header: '決済手段', key: 'method', width: 18 },
    { header: 'ブランド', key: 'brand', width: 16 },
    { header: '加盟店手数料', key: 'fee', width: 14 },
    { header: 'プロセッサー', key: 'processor', width: 30 },
    { header: 'TR手数料（成功）', key: 'trFee', width: 18 },
    { header: 'CB手数料', key: 'cbFee', width: 18 },
    { header: 'デポジット', key: 'deposit', width: 18 },
  ];
  applyHeaderRow(ws5, ws5.getRow(1), 7);

  const paymentData = [
    ['クレジットカード', 'VISA', '3.0%', 'Univa Pay cast / Worldpay', '11〜30円', '1,200〜3,000円', '10% / 180日'],
    ['クレジットカード', 'Mastercard', '3.0%', '楽天銀行 / Simpletransact', '10円〜0.35USD', '1,300円〜45USD', '5〜10% / 120〜180日'],
    ['クレジットカード', 'JCB', '3.25%', 'TCMS / ONTHELINE', '20円', '—', '5% / 180日'],
    ['クレジットカード', 'AMEX', '3.6%', 'Asiabill', '—', '—', '10% / 180日'],
    ['クレジットカード', 'Diners', '3.3〜3.8%', 'TCMS / Asiabill', '20円', '—', '5〜10% / 180日'],
    ['WEBマネー', 'ビットキャッシュ', '5.0%', 'ビットキャッシュ直接', '—', '—', '—'],
    ['WEBマネー', 'スマートピット', '¥300/件', 'スマートピット直接', '—', '—', '—'],
    ['WEBマネー', 'ネットライドキャッシュ', '5.0%', 'ネットライドキャッシュ直接', '—', '—', '—'],
    ['WEBマネー', 'セキュリティマネー', '5.0%', 'セキュリティマネー直接', '—', '—', '—'],
    ['WEBマネー', 'Gマネー', '4.5%', 'Gマネー直接', '—', '—', '—'],
    ['WEBマネー', 'ペイディ', '3.5%', 'ペイディ直接', '—', '—', '—'],
    ['WEBマネー', 'ニーハオペイ', '4.0%', 'ニーハオペイ直接', '—', '—', '—'],
  ];

  paymentData.forEach((d, i) => {
    const row = ws5.addRow({ method: d[0], brand: d[1], fee: d[2], processor: d[3], trFee: d[4], cbFee: d[5], deposit: d[6] });
    applyBodyRow(ws5, row, 7, i);
  });

  // --- Sheet 6: 共通UI ---
  const ws6 = wb.addWorksheet('共通UI機能', { properties: { tabColor: { argb: 'FF6366F1' } } });
  ws6.columns = [
    { header: '機能', key: 'feature', width: 25 },
    { header: '内容', key: 'desc', width: 70 },
  ];
  applyHeaderRow(ws6, ws6.getRow(1), 2);

  const uiData = [
    ['ログインユーザー表示', 'サイドバー下部にユーザー名・権限を常時表示（3ポータル共通）'],
    ['AIチャット（M01）', 'ダッシュボード左カラムにアコーディオン表示（開閉可能）'],
    ['スライドパネル', '一覧行クリック→右からスライドで詳細表示（共通パターン）'],
    ['モーダル', '返金/承認等の確認ダイアログ（共通パターン）'],
    ['CSVエクスポート', '各一覧画面に配置（カラム選択/期間指定対応）'],
    ['CSV決済', 'S10から一括決済バッチアップロード（承認フロー付き）'],
    ['権限管理', 'ロールベース（super_admin/admin/staff/viewer）'],
  ];

  uiData.forEach((d, i) => {
    const row = ws6.addRow({ feature: d[0], desc: d[1] });
    applyBodyRow(ws6, row, 2, i);
  });

  const filePath = path.join(docsDir, 'Feature_List_v1.0.xlsx');
  await wb.xlsx.writeFile(filePath);
  console.log('Feature list saved:', filePath);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. コアシステム連携情報
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateCoreSystemIntegration() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI Payment System';
  wb.created = new Date();

  // --- Sheet 1: READ API ---
  const ws1 = wb.addWorksheet('READ API一覧', { properties: { tabColor: { argb: 'FF3B82F6' } } });
  ws1.columns = [
    { header: 'カテゴリ', key: 'category', width: 16 },
    { header: 'API名', key: 'api', width: 26 },
    { header: '呼出元画面', key: 'screen', width: 28 },
    { header: '必要データ', key: 'data', width: 65 },
    { header: '更新頻度', key: 'freq', width: 22 },
  ];
  applyHeaderRow(ws1, ws1.getRow(1), 5);

  const readData = [
    ['取引・決済', '取引リアルタイムフィード', 'M03 リアルタイム監視', '取引ID/加盟店/金額/ブランド/プロセッサー/ルーティング理由/応答時間/3DS/ステータス/購入者ID/メール/名前', '5秒ポーリング or WebSocket'],
    ['取引・決済', '取引検索', 'M03b 注文検索, S02 注文一覧', '上記＋検索条件16項目（取引ID/加盟店/カード下4桁/ブランド/金額範囲/日時範囲/ユーザーID/メール/名前/代理店/チケット番号/課金方法/備考/ステータス/テスト含む/マネロン疑い）', 'オンデマンド'],
    ['取引・決済', '取引KPI', 'M01 ダッシュボード, M03', '取引量/売上額/成功率/CB率/自動化率（本日/今週/今月/カスタム期間）', '1分間隔'],
    ['取引・決済', '取引推移チャート', 'M01, S01', '日次/時間別の件数・金額（7日/30日/90日）', '5分間隔'],
    ['取引・決済', '決済手段分布', 'S01 ダッシュボード', 'ブランド別の件数・金額・構成比', '日次集計'],
    ['顧客', '顧客検索', 'M16, S11', '顧客ID/メール/カード情報（マスク済）/加盟店/取引回数/LTV/最終取引日/サブスク状態/リスクレベル/セグメント/PQ-ID/RC紐付数/カード保存状態', 'オンデマンド'],
    ['顧客', '顧客分析', 'M16, S11', '総顧客数/アクティブ率/平均LTV/リピート率/新規数/セグメント分布/コホートデータ/LTV分布', '日次集計'],
    ['顧客', '顧客タイムライン', 'M16, S11', '取引履歴（日時/金額/ブランド/ステータス/メモ）、カード情報一覧', 'オンデマンド'],
    ['サブスク', 'プラン一覧', 'M14, S10', 'プランID/名前/タイプ（月額/年額/分割）/金額/サイクル/ユーザー数/ステータス', 'オンデマンド'],
    ['サブスク', 'サブスクユーザー一覧', 'M14, S10', 'ユーザーID/メール/プラン/カード/次回決済日/失敗回数/ステータス', 'オンデマンド'],
    ['サブスク', '決済履歴（継続）', 'M14, S10', '実行日時/ユーザーID/プラン/金額/結果/リトライステータス/エラーコード', 'オンデマンド'],
    ['サブスク', 'CSVバッチ一覧', 'S10', 'バッチID/名称/件数/合計金額/予定日/ステータス/アップロード日時', 'オンデマンド'],
    ['加盟店', '加盟店一覧', 'M04', '加盟店ID/名称/業種/ステータス/月間処理額/成功率/CB率/契約日/手数料率', 'オンデマンド'],
    ['加盟店', '加盟店詳細', 'M04', '会社情報/口座情報/API設定/手数料テーブル/月次チャート/直近取引', 'オンデマンド'],
    ['加盟店', '審査申込一覧', 'M06', '申込ID/会社名/業種/申込日/AI審査結果/スコア/ステータス', 'オンデマンド'],
    ['加盟店', 'AI審査詳細', 'M06', '反社チェック/Web分析/財務分析/業種リスク/総合スコア/推薦結果', 'WebSocket（リアルタイム更新）'],
    ['精算・入金', '精算バッチ一覧', 'M08', 'バッチID/対象期間/加盟店数/総額/手数料/純振込額/ステータス/実行日時', 'オンデマンド'],
    ['精算・入金', '入金スケジュール', 'M08, S04', '入金予定日/対象期間/売上合計/手数料/リザーブ控除/リザーブ解放/純入金額', '日次更新'],
    ['精算・入金', '入金履歴', 'S04', '入金日/精算期間/売上/手数料/リザーブ保留/解放/純入金額/ステータス/ブランド別内訳', 'オンデマンド'],
    ['精算・入金', 'リザーブ情報', 'S04', '現在残高/当月解放予定/翌月解放予定/当月新規保留/プロセッサー別条件', '日次更新'],
    ['代理店', '代理店一覧', 'M15', '代理店ID/名称/紹介加盟店数/月間処理額/報酬率/ステータス', 'オンデマンド'],
    ['代理店', '紹介先加盟店一覧', 'D02', '加盟店ID/名称/ステータス/取引額/手数料/稼働開始日', 'オンデマンド'],
    ['代理店', '報酬明細一覧', 'D03', '報告書ID/レポートNo/対象月/発行日/支払金額/支払予定日/ステータス/加盟店別内訳', 'オンデマンド'],
    ['代理店', '代理店決済検索', 'D02', '決済ID/オーダーID/加盟店/サイト/通貨/ステータス/顧客名/メール/カード下4桁/金額/決済日時', 'オンデマンド'],
    ['インフラ', '不正検知ルール一覧', 'M07', 'ルールID/名前/タイプ/条件/アクション/優先度/有効フラグ/30日ヒット数', 'オンデマンド'],
    ['インフラ', 'ブロックリスト', 'M07', 'BINリスト/IPリスト/メールリスト（各エントリ+追加日）', 'オンデマンド'],
    ['インフラ', 'ルーティングルール一覧', 'M10', 'ルール文/優先度/有効フラグ', 'オンデマンド'],
    ['インフラ', 'プロセッサー状態', 'M09, M01', 'プロセッサーID/名称/ステータス/稼働率/平均レスポンス/直近エラー数', '30秒間隔'],
    ['運用', '例外キュー', 'M02, M01', 'キューID/タイプ/対象/リスクスコア/AI推薦/経過時間/ステータス', '30秒間隔'],
    ['運用', 'AIモジュール状態', 'M05', 'モジュール名/精度/最終学習日/次回学習日/エラー数', '5分間隔'],
    ['運用', 'Webhookログ', 'S05', 'イベント名/日時/ステータス/レスポンスタイム', 'オンデマンド'],
    ['運用', 'スタッフ一覧', 'M12, S07, D05', 'スタッフID/名前/メール/ロール/MFA状態/最終ログイン/活動ログ', 'オンデマンド'],
  ];

  readData.forEach((d, i) => {
    const row = ws1.addRow({ category: d[0], api: d[1], screen: d[2], data: d[3], freq: d[4] });
    applyBodyRow(ws1, row, 5, i);
  });
  ws1.autoFilter = { from: 'A1', to: 'E1' };

  // --- Sheet 2: WRITE API ---
  const ws2 = wb.addWorksheet('WRITE API一覧', { properties: { tabColor: { argb: 'FFEF4444' } } });
  ws2.columns = [
    { header: 'カテゴリ', key: 'category', width: 16 },
    { header: 'API名', key: 'api', width: 26 },
    { header: '呼出元画面', key: 'screen', width: 24 },
    { header: '送信データ', key: 'data', width: 50 },
    { header: '備考', key: 'note', width: 30 },
  ];
  applyHeaderRow(ws2, ws2.getRow(1), 5);

  const writeData = [
    ['取引操作', '返金実行', 'M03b, S02', '取引ID, 返金種別（全額/一部）, 返金金額, 理由', '権限: admin以上'],
    ['取引操作', '取引キャンセル', 'M03b', '取引ID', '権限: admin以上'],
    ['加盟店・審査', '加盟店申込送信', 'P01', '会社情報/業種/決済設定/書類ファイル', 'AI審査パイプライン起動'],
    ['加盟店・審査', '審査承認/拒否', 'M06', '申込ID, 判定（承認/条件付き/拒否）, コメント', '権限: admin以上'],
    ['加盟店・審査', '加盟店ステータス変更', 'M04', '加盟店ID, 新ステータス', '権限: super_admin'],
    ['加盟店・審査', '加盟店手数料率変更', 'M04', '加盟店ID, ブランド別手数料率', '権限: super_admin'],
    ['精算', '精算バッチ実行', 'M08', '対象期間, 対象加盟店（全件/個別指定）', '権限: super_admin'],
    ['精算', '精算バッチ再実行', 'M08', 'バッチID', 'エラー分のみ再実行'],
    ['サブスク', 'プラン作成/更新', 'S10', 'プラン名/タイプ/金額/サイクル', ''],
    ['サブスク', 'ユーザー一時停止/再開', 'S10, M14', 'ユーザーID, アクション', ''],
    ['サブスク', '手動リトライ', 'S10, M14', 'ユーザーID', '失敗したサブスク決済のリトライ'],
    ['サブスク', 'CSVバッチアップロード', 'S10', 'CSVファイル, バッチ名, 予定日', '承認フロー必須'],
    ['サブスク', 'CSVバッチ承認/却下', 'S10', 'バッチID, 判定', '権限: admin以上'],
    ['例外キュー', '例外承認/拒否', 'M02', 'キューID, 判定, コメント', ''],
    ['例外キュー', '例外バッチ操作', 'M02', 'キューID[], 判定', '複数件一括操作'],
    ['不正検知', '不正検知ルールCRUD', 'M07', 'ルール名/タイプ/条件/アクション/優先度/有効フラグ', ''],
    ['不正検知', 'ブロックリスト登録', 'M07', 'タイプ（BIN/IP/メール）, 値, 理由', ''],
    ['ルーティング', 'ルーティングルールCRUD', 'M10', 'ルール文/優先度/有効フラグ', ''],
    ['ルーティング', 'プロセッサー有効化/無効化', 'M09', 'プロセッサーID, ステータス', ''],
    ['設定', 'APIキー再発行', 'S05, S08', '環境（本番/テスト）', '確認ダイアログ必須'],
    ['設定', 'Webhook設定更新', 'S05', 'URL, 受信イベント種別[]', ''],
    ['設定', 'Webhookテスト送信', 'S05', 'エンドポイントURL', ''],
    ['設定', 'IP制限設定', 'S05', 'IP/CIDR, ラベル', ''],
    ['設定', '会社情報変更申請', 'S08', '変更フィールド, 新値', '承認フロー'],
    ['設定', '口座変更申請', 'S08', '銀行情報', '承認フロー（1-3営業日）'],
    ['設定', 'パスワード変更', 'S08', '現パスワード, 新パスワード', ''],
    ['管理', 'スタッフ招待', 'S07, M12, D05', '名前/メール/ロール/MFA設定', ''],
    ['管理', 'スタッフ権限変更', 'S07, M12, D05', 'ユーザーID, 新ロール, 理由', '監査ログ記録'],
    ['管理', '顧客ブロック/WL', 'M16', '顧客ID, アクション（ブロック/ホワイトリスト）', ''],
    ['管理', '顧客タグ/メモ追加', 'M16, S11', '顧客ID, タグ or メモ内容', ''],
    ['管理', '代理店紹介送信', 'D04', '会社名/代表者/業種/URL/コメント', ''],
  ];

  writeData.forEach((d, i) => {
    const row = ws2.addRow({ category: d[0], api: d[1], screen: d[2], data: d[3], note: d[4] });
    applyBodyRow(ws2, row, 5, i);
  });
  ws2.autoFilter = { from: 'A1', to: 'E1' };

  // --- Sheet 3: WebSocket ---
  const ws3 = wb.addWorksheet('WebSocket要件', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  ws3.columns = [
    { header: 'チャネル', key: 'channel', width: 26 },
    { header: '用途', key: 'purpose', width: 24 },
    { header: 'データ', key: 'data', width: 40 },
    { header: '利用画面', key: 'screen', width: 20 },
  ];
  applyHeaderRow(ws3, ws3.getRow(1), 4);

  const wsData = [
    ['transactions.live', '決済リアルタイムフィード', '全取引イベント', 'M03'],
    ['queue.updates', '例外キュー更新', '新規キュー/ステータス変更', 'M02, M01'],
    ['processor.health', 'プロセッサーヘルス', '稼働率/レスポンス/エラー数', 'M09, M01'],
    ['review.progress', 'AI審査進捗', '各チェック項目の結果', 'P01, M06'],
    ['ai.chat', 'AIチャット', 'メッセージ送受信', 'M01, S06'],
  ];

  wsData.forEach((d, i) => {
    const row = ws3.addRow({ channel: d[0], purpose: d[1], data: d[2], screen: d[3] });
    applyBodyRow(ws3, row, 4, i);
  });

  // --- Sheet 4: 認証・認可 ---
  const ws4 = wb.addWorksheet('認証・認可', { properties: { tabColor: { argb: 'FF059669' } } });
  ws4.columns = [
    { header: '項目', key: 'item', width: 22 },
    { header: '内容', key: 'desc', width: 55 },
  ];
  applyHeaderRow(ws4, ws4.getRow(1), 2);

  const authData = [
    ['認証方式', 'JWT（アクセストークン + リフレッシュトークン）'],
    ['ロール体系', 'super_admin / admin / staff / viewer'],
    ['マルチテナント', '加盟店ID/代理店IDによるデータ分離'],
    ['MFA', 'Google Authenticator / TOTP'],
    ['セッション', 'ログイン履歴（IP/デバイス/OS/日時）'],
  ];

  authData.forEach((d, i) => {
    const row = ws4.addRow({ item: d[0], desc: d[1] });
    applyBodyRow(ws4, row, 2, i);
  });

  // --- Sheet 5: 確認事項 ---
  const ws5 = wb.addWorksheet('確認事項（江成チーム）', { properties: { tabColor: { argb: 'FFDC2626' } } });
  ws5.columns = [
    { header: '#', key: 'no', width: 6 },
    { header: 'カテゴリ', key: 'category', width: 16 },
    { header: '確認事項', key: 'question', width: 65 },
    { header: '回答', key: 'answer', width: 40 },
  ];
  applyHeaderRow(ws5, ws5.getRow(1), 4);

  const checkData = [
    ['データモデル', '取引データに「購入者ID/メール/名前/カード名義」は含まれるか？'],
    ['データモデル', '顧客データの「PQ-ID」（ペイクイックID）の仕様は？'],
    ['データモデル', 'リザーブ（デポジット）の計算ロジックはプロセッサー別か？'],
    ['データモデル', 'CSVバッチ決済のpaymentid空欄時の挙動（新規決済扱い？）'],
    ['API仕様', 'リアルタイム監視のデータ取得方式（WebSocket / SSE / ポーリング？）'],
    ['API仕様', '取引検索APIのページネーション仕様（カーソル / オフセット？）'],
    ['API仕様', '返金APIのレスポンス（同期 / 非同期？処理完了通知方法は？）'],
    ['API仕様', 'AI審査のプログレス通知方式（WebSocket推奨）'],
    ['ルーティング', 'ルーティングエンジンのA/Bテスト機能の有無'],
    ['ルーティング', '不正検知AIスコアの算出タイミング（リアルタイム / バッチ？）'],
    ['ルーティング', 'BINブロックリストのインポート機能の要否'],
    ['精算', '精算サイクルの設定粒度（週次/月2回/月次？加盟店別設定可能？）'],
    ['精算', '手数料計算のタイミング（取引時 / 精算バッチ時？）'],
    ['精算', '為替対応の要否（JPYのみ or 多通貨？）'],
    ['その他', 'テスト環境と本番環境のデータ分離方式'],
    ['その他', '監査ログの保持期間'],
    ['その他', 'CSVエクスポートの上限件数'],
    ['その他', 'ファイルアップロード（申込書類/CSV）のストレージ'],
  ];

  checkData.forEach((d, i) => {
    const row = ws5.addRow({ no: i + 1, category: d[0], question: d[1], answer: '' });
    applyBodyRow(ws5, row, 4, i);
  });
  ws5.autoFilter = { from: 'A1', to: 'D1' };

  const filePath = path.join(docsDir, 'Core_System_Integration_v1.0.xlsx');
  await wb.xlsx.writeFile(filePath);
  console.log('Core system integration saved:', filePath);
}

// ─── 実行 ───
(async () => {
  await generateFeatureList();
  await generateCoreSystemIntegration();
  console.log('Done!');
})();
