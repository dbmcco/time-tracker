const { getSheetsClient, appendRow, findLastActiveTimer, updateRow } = require('../sheets');

describe('Google Sheets Service', () => {
  beforeEach(() => {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----\\n';
    process.env.GOOGLE_SHEET_ID = 'test-sheet-id';
  });

  test('getSheetsClient returns configured client', () => {
    const client = getSheetsClient();
    expect(client).toBeDefined();
    expect(client.spreadsheets).toBeDefined();
  });

  test('appendRow constructs correct request params', () => {
    const params = appendRow('Sheet1', ['value1', 'value2']);
    expect(params.spreadsheetId).toBe('test-sheet-id');
    expect(params.range).toBe('Sheet1!A:Z');
    expect(params.valueInputOption).toBe('USER_ENTERED');
    expect(params.resource.values).toEqual([['value1', 'value2']]);
  });

  test('findLastActiveTimer finds row without end time', () => {
    const mockRows = [
      ['ProjectA', '2025-11-05T09:00:00Z', '2025-11-05T10:00:00Z', '1', 'Done'],
      ['ProjectB', '2025-11-05T11:00:00Z', '', '', '']
    ];
    const result = findLastActiveTimer(mockRows);
    expect(result.rowIndex).toBe(3); // mockRows[1] maps to sheet row 3 (row 1 is header, row 2 is mockRows[0])
    expect(result.project).toBe('ProjectB');
  });

  test('updateRow constructs correct request params', () => {
    const params = updateRow('Sheet1', 2, ['value1', 'value2', 'value3']);
    expect(params.spreadsheetId).toBe('test-sheet-id');
    expect(params.range).toBe('Sheet1!A2:Z2');
    expect(params.valueInputOption).toBe('USER_ENTERED');
    expect(params.resource.values).toEqual([['value1', 'value2', 'value3']]);
  });
});
