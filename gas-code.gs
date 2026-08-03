// nursing-quiz-app（かずからの挑戦状）改善点フィードバック機能 バックエンド GAS
// 作成日: 2026-08-03（パラセクト）
// オンライン図書館（gas-code.gs）の addFeedback と同じ設計方針

const SPREADSHEET_ID = '1k47gjlOtmbrEDieXrAQlTw4AVkH3J_63QG2kSuXDuOs'; // nursing-quiz-app フィードバックDB

const SHEET_NAME_FEEDBACK = 'フィードバック';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ===== シート初期化（初回に一度だけ手動実行） =====
function setupSheets() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME_FEEDBACK);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_FEEDBACK);
    sheet.appendRow(['userID', '種別', 'カテゴリー', '内容', '投稿日時']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  Logger.log('シート設定完了');
}

// ===== doGet =====
function doGet(e) {
  const params = e.parameter;
  const action = params.action;

  let result;
  try {
    switch (action) {
      case 'addFeedback': result = addFeedback(params.uid, params.type, params.category, params.message); break;
      case 'getFeedback': result = getFeedback();                                                          break;
      default:            result = { ok: false, error: 'unknown action' };
    }
  } catch (err) {
    result = { ok: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== 改善点・不具合報告（自由記述） =====
function addFeedback(uid, type, category, message) {
  if (!message) return { ok: false, error: 'message required' };
  const ss    = getSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME_FEEDBACK);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_FEEDBACK);
    sheet.appendRow(['userID', '種別', 'カテゴリー', '内容', '投稿日時']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  const now = new Date().toISOString();
  sheet.appendRow([uid || 'guest', type || 'その他', category || '', message, now]);
  return { ok: true };
}

function getFeedback() {
  const ss    = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_FEEDBACK);
  if (!sheet) return { ok: true, list: [] };
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    list.push({ uid: data[i][0], type: data[i][1], category: data[i][2], message: data[i][3], postedAt: data[i][4] });
  }
  return { ok: true, list };
}
