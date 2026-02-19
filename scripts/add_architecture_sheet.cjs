const ExcelJS = require('exceljs');
const path = require('path');

async function addArchitectureSheet() {
  const filePath = path.join(__dirname, '..', 'docs', 'AI_Payment_System_仕様書_v2.0.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // 共通スタイル
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Yu Gothic' };
  const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
  const subHeaderFont = { bold: true, color: { argb: 'FF1F4E79' }, size: 10, name: 'Yu Gothic' };
  const bodyFont = { size: 10, name: 'Yu Gothic' };
  const titleFont = { bold: true, size: 14, name: 'Yu Gothic', color: { argb: 'FF1F4E79' } };
  const sectionFont = { bold: true, size: 12, name: 'Yu Gothic', color: { argb: 'FF1F4E79' } };
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    right: { style: 'thin', color: { argb: 'FFB0B0B0' } }
  };
  const altRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8FC' } };
  const greenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
  const yellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
  const redFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6E6' } };

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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // シート1: システム全体構成
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 先頭に挿入するため、index指定
  const ws = workbook.addWorksheet('システム構成', {
    properties: { tabColor: { argb: 'FF7030A0' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });
  // ※シート順序はExcel上で手動調整可能

  ws.columns = [
    { width: 6 },   // A
    { width: 18 },  // B
    { width: 30 },  // C
    { width: 50 },  // D
    { width: 20 },  // E
  ];

  // タイトル
  ws.mergeCells('A1:E1');
  ws.getCell('A1').value = 'AIpayment システム全体構成 v1.0';
  ws.getCell('A1').font = titleFont;
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:E2');
  ws.getCell('A2').value = '作成日: 2026-02-18 | CDE(PCI DSS) + 管理系の2環境構成';
  ws.getCell('A2').font = { ...bodyFont, italic: true, color: { argb: 'FF666666' } };

  ws.addRow([]);

  // 環境分離方針
  const sec1 = ws.addRow(['', '環境分離方針', '', '', '']);
  ws.mergeCells(`B${sec1.number}:E${sec1.number}`);
  sec1.getCell(2).font = sectionFont;

  const envH = ws.addRow(['', '項目', 'AWS環境A（CDE）', 'AWS環境B（管理系）', '']);
  applyHeaderRow(envH);

  const envData = [
    ['', '担当', '江成チーム', '別途構築'],
    ['', 'PCI DSS', '準拠必須', '準拠不要（カード番号非保持）'],
    ['', '扱うデータ', 'カード番号, CVV, 暗号鍵', 'トークン, 取引結果, 加盟店情報, 精算データ'],
    ['', 'ネットワーク', '完全隔離VPC, WAF, IDS/IPS', '通常のVPC, WAF'],
    ['', 'アクセス', '限定的（API経由のみ）', '管理画面SPA + API'],
    ['', '監査', 'PCI DSS Lv.1 準拠の監査証跡', '操作ログ（audit_logs, 90日保持）'],
    ['', '主要機能', '決済処理, トークン化, 3DS, ルーティングエンジン', '管理画面API, CRM, レポート, AI'],
  ];
  envData.forEach((d, i) => {
    const dr = ws.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
  });

  ws.addRow([]);

  // Zone A機能一覧
  const sec2 = ws.addRow(['', 'CDE (Zone A) に配置する機能', '', '', '']);
  ws.mergeCells(`B${sec2.number}:E${sec2.number}`);
  sec2.getCell(2).font = sectionFont;

  const zaH = ws.addRow(['#', '機能', '理由', '関連画面', '']);
  applyHeaderRow(zaH);

  const zoneAData = [
    ['A-1', 'カードトークン化API', 'カード番号を直接受信', 'P02'],
    ['A-2', '決済処理 (auth/capture/void)', 'トークン→カード復号→接続先通信', 'P02'],
    ['A-3', '3DS認証処理', 'カード発行元との認証通信', 'P02'],
    ['A-4', '接続先API通信', '各プロセッサーとのAPI通信', '—'],
    ['A-5', 'ルーティングエンジン', '決済時のリアルタイム接続先選択', '—'],
    ['A-6', 'リカーリングエンジン', 'カードトークンで定期課金実行', '—'],
    ['A-7', '返金処理（実行）', '接続先への返金API呼出', '—'],
    ['A-8', '決済リンク決済処理', 'P02経由のリンク決済', 'P02'],
  ];
  zoneAData.forEach((d, i) => {
    const dr = ws.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
  });

  ws.addRow([]);

  // Zone B機能一覧
  const sec3 = ws.addRow(['', '管理系 (Zone B) に配置する機能', '', '', '']);
  ws.mergeCells(`B${sec3.number}:E${sec3.number}`);
  sec3.getCell(2).font = sectionFont;

  const zbH = ws.addRow(['#', '機能', '関連画面', 'API数', '']);
  applyHeaderRow(zbH);

  const zoneBData = [
    ['B-1', '加盟店・サイト管理', 'M04, M06, S06, S08', 'R:9 / W:11'],
    ['B-2', '取引検索・閲覧', 'M03, M03b, S02', 'R:7 / W:2'],
    ['B-3', '例外キュー管理', 'M02, M01', 'R:1 / W:2'],
    ['B-4', '精算・入金管理', 'M08, S04', 'R:5 / W:2'],
    ['B-5', '不正検知ルール管理', 'M07', 'R:5 / W:9'],
    ['B-6', 'ルーティングルール管理', 'M10', 'R:4 / W:7'],
    ['B-7', 'レポート生成', 'M11, S03', 'R:2 / W:2'],
    ['B-8', 'ユーザー認証・認可', 'M12, S07, D05', 'R:1 / W:5'],
    ['B-9', '顧客CRM', 'M16, S11', 'R:4 / W:3'],
    ['B-10', '継続課金管理（設定・閲覧）', 'M14, S10', 'R:5 / W:7'],
    ['B-11', '決済リンク管理（設定）', 'S09', 'R:2 / W:3'],
    ['B-12', '代理店管理', 'M15, D01-D05', 'R:7 / W:1'],
    ['B-13', 'AI監視・チャット', 'M05, M01, S12', 'R:4 / W:7'],
    ['B-14', 'システム設定', 'M13', 'R:6 / W:9'],
    ['B-15', '操作ログ・監査', 'M13', 'R:1 / W:1'],
    ['B-16', '通知配信', 'M13', 'R:1 / W:1'],
  ];
  zoneBData.forEach((d, i) => {
    const dr = ws.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
  });

  ws.addRow([]);

  // 環境をまたぐ機能
  const sec4 = ws.addRow(['', '環境をまたぐ機能（要注意）', '', '', '']);
  ws.mergeCells(`B${sec4.number}:E${sec4.number}`);
  sec4.getCell(2).font = sectionFont;

  const crossH = ws.addRow(['#', '機能', 'Zone Aの役割', 'Zone Bの役割', '連携方式']);
  applyHeaderRow(crossH);

  const crossData = [
    ['C-1', 'ルーティング', '実行時のルール適用', 'ルール設定・管理', 'ルール変更時にZone Aへ同期'],
    ['C-2', '不正検知', '決済時リアルタイム判定', 'ルール設定・ログ閲覧', 'ルール変更時にZone Aへ同期'],
    ['C-3', '返金', '接続先への返金実行', '返金指示・結果表示', 'Zone B→A API呼出'],
    ['C-4', 'リカーリング', '定期課金実行', 'プラン設定・ユーザー管理', 'Zone A実行→結果をBに通知'],
    ['C-5', '取引データ', '取引結果生成', '取引検索・表示', 'Zone A→B イベント駆動同期'],
    ['C-6', 'プロセッサーヘルス', '稼働率計測', 'ヘルス表示・アラート', 'Zone A→B ヘルスデータ送信'],
    ['C-7', '精算', '取引ごと手数料計算', 'バッチ管理・入金管理', 'Zone A→B 精算データ同期'],
  ];
  crossData.forEach((d, i) => {
    const dr = ws.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
    // 全セルにハイライト
    dr.eachCell(c => { c.fill = yellowFill; });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // シート2: 内部API一覧
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ws2 = workbook.addWorksheet('内部API(ZoneA⇔B)', {
    properties: { tabColor: { argb: 'FF7030A0' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  });
  // シート順序は手動調整

  ws2.columns = [
    { width: 8 },
    { width: 28 },
    { width: 10 },
    { width: 50 },
    { width: 20 },
  ];

  ws2.mergeCells('A1:E1');
  ws2.getCell('A1').value = 'Zone A ↔ Zone B 内部API仕様（未定義→要設計）';
  ws2.getCell('A1').font = titleFont;
  ws2.getRow(1).height = 28;

  ws2.mergeCells('A2:E2');
  ws2.getCell('A2').value = '⚠️ 現在未定義。江成チームとの合意が必要。';
  ws2.getCell('A2').font = { ...bodyFont, bold: true, color: { argb: 'FFCC0000' } };

  ws2.addRow([]);
  const intH = ws2.addRow(['#', 'API', '方向', '用途', '備考']);
  applyHeaderRow(intH);

  const internalAPIs = [
    ['I-001', '取引結果通知', 'A→B', '決済完了/失敗時に管理系DBへ同期', 'イベント駆動推奨'],
    ['I-002', '返金実行', 'B→A', '管理画面からの返金指示', '同期API'],
    ['I-003', 'キャンセル実行', 'B→A', '管理画面からのキャンセル指示', '同期API'],
    ['I-004', 'ルーティングルール同期', 'B→A', 'ルール変更時にZone Aに反映', '変更時のみ'],
    ['I-005', '不正検知ルール同期', 'B→A', 'ルール変更時にZone Aに反映', '変更時のみ'],
    ['I-006', 'ブロックリスト同期', 'B→A', 'BIN/IP/メール等のブロックリスト更新', '即時同期必要'],
    ['I-007', 'プロセッサーヘルス通知', 'A→B', '稼働率/レスポンス/エラー数の定期送信', '30秒間隔'],
    ['I-008', 'リカーリング対象取得', 'A→B', '本日の課金対象ユーザー一覧', '日次バッチ'],
    ['I-009', 'リカーリング結果通知', 'A→B', '課金実行結果の通知', 'イベント駆動'],
    ['I-010', '精算データ集計', 'A→B', '期間内取引の手数料集計データ', 'バッチ'],
    ['I-011', 'プロセッサー設定同期', 'B→A', '接続先の有効/無効切替、手数料率変更', '変更時のみ'],
    ['I-012', '加盟店設定同期', 'B→A', '加盟店/サイトのステータス変更', '変更時のみ'],
    ['I-013', 'カード変更URL生成', 'B→A', 'サブスクユーザーのカード変更', '同期API'],
    ['I-014', '3DS結果取得', 'A→B', '3DS認証結果の管理系DB記録', 'イベント駆動'],
    ['I-015', '不正検知結果通知', 'A→B', 'リアルタイム判定結果の通知', 'イベント駆動'],
  ];
  internalAPIs.forEach((d, i) => {
    const dr = ws2.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
    // 方向列の色分け
    if (d[2] === 'A→B') {
      dr.getCell(3).font = { ...bodyFont, bold: true, color: { argb: 'FF0070C0' } };
    } else {
      dr.getCell(3).font = { ...bodyFont, bold: true, color: { argb: 'FFCC0000' } };
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // シート3: 設計レビュー
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ws3 = workbook.addWorksheet('設計レビュー', {
    properties: { tabColor: { argb: 'FF7030A0' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });
  // シート順序は手動調整

  ws3.columns = [
    { width: 6 },
    { width: 8 },
    { width: 30 },
    { width: 60 },
    { width: 24 },
  ];

  ws3.mergeCells('A1:E1');
  ws3.getCell('A1').value = '現在の設計に対するレビュー';
  ws3.getCell('A1').font = titleFont;
  ws3.getRow(1).height = 28;

  ws3.addRow([]);
  const revH = ws3.addRow(['#', '判定', '項目', '詳細', '対応方針']);
  applyHeaderRow(revH);

  const reviewData = [
    // ✅ 問題なし
    [1, '✅', 'CDE分離方針', 'カード番号をCDE内に閉じ、管理系はトークン参照のみ', '対応不要'],
    [2, '✅', 'P02 iframeトークン化', 'CDE内iframeでカード入力→postMessageでtoken返却', '対応不要'],
    [3, '✅', 'DB設計のカード情報', 'card_tokenはCDE側トークン参照のみ、カード番号カラムなし', '対応不要'],
    [4, '✅', '操作ログ (audit_logs)', 'PCI DSS 90日保持、月次パーティション設計済み', '対応不要'],
    [5, '✅', 'DB設計 62テーブル/42 ENUM', '機能要件に対して漏れなく設計されている', '対応不要'],
    [6, '✅', 'フロントAPI 143件', '画面機能に対して必要なAPIが網羅されている', '対応不要'],
    [7, '✅', 'マルチテナント分離', 'merchant_id/agent_idによるデータ分離', '対応不要'],
    [8, '✅', '3階層データモデル', '加盟店→サイト→接続先の3階層が正しく設計', '対応不要'],
    // ⚠️ 要検討
    [9, '⚠️', 'ルーティングエンジンの配置', 'ルール管理=Zone B、ルール実行=Zone A。同期方式が未定義', 'Zone Aにルールキャッシュ（Redis）を持ち、変更時にAPI同期'],
    [10, '⚠️', '不正検知ルールの実行位置', '自動ブロック=Zone Aで決済前判定必須、AI判定=Zone Bで非同期可', 'ハイブリッド方式を推奨'],
    [11, '⚠️', '取引データの同期方式', '取引結果はZone Aで生成、管理画面はZone Bから表示', 'イベント駆動同期（SQS/EventBridge）推奨'],
    [12, '⚠️', '精算処理の分担', '取引ごとの手数料はZone Aで計算→Zone Bで集計管理', 'Zone Aで取引時計算→Zone Bでバッチ管理'],
    [13, '⚠️', 'リカーリング連携', 'プラン管理=Zone B、課金実行=Zone A。双方向同期が必要', 'マスタはZone B、実行時にAPI取得'],
    [14, '⚠️', 'P02決済ページのホスティング', 'CDE iframeを含むため、ドメイン検討が必要', '別ドメイン（pay.aipayment.jp）推奨'],
    // 🔴 要対応
    [15, '🔴', '内部API仕様が未定義', 'Zone A↔B間の内部API（15件以上）が未設計', '内部API仕様書を別途作成'],
    [16, '🔴', 'パスワードポリシーが弱い', '現状8文字。PCI DSS/AQUAGATES相当は12文字+記号+過去4回不可+90日更新', 'M13セキュリティ設定を強化'],
    [17, '🔴', 'AI実行環境が未定義', '6種のAI機能の実行環境（外部API/自社モデル）が未決定', '外部API+自社モデルのハイブリッド推奨'],
  ];
  reviewData.forEach((d, i) => {
    const dr = ws3.addRow(d);
    applyBodyRow(dr, i % 2 === 1);
    // 判定列の色分け
    const status = d[1];
    if (status === '✅') {
      dr.getCell(2).fill = greenFill;
    } else if (status === '⚠️') {
      dr.getCell(2).fill = yellowFill;
      dr.eachCell(c => { if (!c.fill || c.fill.fgColor?.argb !== 'FFD6E4F0') c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } }; });
    } else if (status === '🔴') {
      dr.getCell(2).fill = redFill;
      dr.eachCell(c => { c.fill = redFill; });
      dr.eachCell(c => { c.font = { ...bodyFont, bold: true }; });
    }
  });

  // 保存
  await workbook.xlsx.writeFile(filePath);
  console.log(`Updated: ${filePath}`);
  console.log(`Added sheets: システム構成, 内部API(ZoneA⇔B), 設計レビュー`);
  console.log(`Total sheets: ${workbook.worksheets.map(ws => ws.name).join(', ')}`);
}

addArchitectureSheet().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
