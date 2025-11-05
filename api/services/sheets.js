// ABOUTME: Google Sheets API service for time tracker
const { google } = require('googleapis');

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

function appendRow(sheetName, values) {
  return {
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [values]
    }
  };
}

function findLastActiveTimer(rows) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row[2] === '' || row[2] === undefined) {
      return {
        rowIndex: i + 2, // +2 because: rows array is 0-indexed, sheet rows are 1-indexed starting at row 2 (after header)
        project: row[0],
        startTime: row[1]
      };
    }
  }
  return null;
}

function updateRow(sheetName, rowIndex, values) {
  return {
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [values]
    }
  };
}

module.exports = {
  getSheetsClient,
  appendRow,
  findLastActiveTimer,
  updateRow
};
