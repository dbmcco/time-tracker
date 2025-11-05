// ABOUTME: One-time script to set up Google Sheet structure for time tracker
require('dotenv').config();
const { google } = require('googleapis');

async function setupGoogleSheet() {
  console.log('🔧 Setting up Google Sheet for Time Tracker...\n');

  // Authenticate
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // 1. Get existing sheets
    console.log('📋 Checking existing sheets...');
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log(`   Found sheets: ${existingSheets.join(', ')}\n`);

    // 2. Create or clear "Entries" sheet
    let entriesSheetId;
    if (existingSheets.includes('Entries')) {
      console.log('✓ "Entries" sheet already exists');
      entriesSheetId = spreadsheet.data.sheets.find(s => s.properties.title === 'Entries').properties.sheetId;
    } else {
      console.log('➕ Creating "Entries" sheet...');
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: { title: 'Entries' }
            }
          }]
        }
      });
      entriesSheetId = response.data.replies[0].addSheet.properties.sheetId;
      console.log('✓ Created "Entries" sheet');
    }

    // 3. Set up Entries headers
    console.log('📝 Setting up Entries headers...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Entries!A1:E1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Project', 'Start Time', 'End Time', 'Duration', 'Task Notes']]
      }
    });
    console.log('✓ Headers set\n');

    // 4. Add Duration formula to D2
    console.log('🧮 Adding Duration formula...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Entries!D2',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['=IF(C2="", "", (C2-B2)*24)']]
      }
    });
    console.log('✓ Duration formula added to D2\n');

    // 5. Format Entries sheet
    console.log('🎨 Formatting Entries sheet...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Bold headers
          {
            repeatCell: {
              range: {
                sheetId: entriesSheetId,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                }
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)'
            }
          },
          // Freeze header row
          {
            updateSheetProperties: {
              properties: {
                sheetId: entriesSheetId,
                gridProperties: { frozenRowCount: 1 }
              },
              fields: 'gridProperties.frozenRowCount'
            }
          }
        ]
      }
    });
    console.log('✓ Formatting applied\n');

    // 6. Create or update "Monthly Summary" sheet
    let summarySheetId;
    if (existingSheets.includes('Monthly Summary')) {
      console.log('✓ "Monthly Summary" sheet already exists');
      summarySheetId = spreadsheet.data.sheets.find(s => s.properties.title === 'Monthly Summary').properties.sheetId;
    } else {
      console.log('➕ Creating "Monthly Summary" sheet...');
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: { title: 'Monthly Summary' }
            }
          }]
        }
      });
      summarySheetId = response.data.replies[0].addSheet.properties.sheetId;
      console.log('✓ Created "Monthly Summary" sheet');
    }

    // 7. Add formulas to Monthly Summary
    console.log('📊 Setting up Monthly Summary formulas...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Monthly Summary!A1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          '=QUERY(Entries!A:E, "SELECT A, SUM(D) WHERE B >= date \'"&TEXT(TODAY(),"yyyy-mm")&"-01\' AND C <> \'\' GROUP BY A LABEL SUM(D) \'Hours\'", 1)'
        ]]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Monthly Summary!A10:B10',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          'Total Hours This Month:',
          '=SUM(FILTER(Entries!D:D, MONTH(Entries!B:B) = MONTH(TODAY()), YEAR(Entries!B:B) = YEAR(TODAY()), Entries!C:C <> ""))'
        ]]
      }
    });
    console.log('✓ Summary formulas added\n');

    // 8. Format Monthly Summary
    console.log('🎨 Formatting Monthly Summary...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Bold label in A10
          {
            repeatCell: {
              range: {
                sheetId: summarySheetId,
                startRowIndex: 9,
                endRowIndex: 10,
                startColumnIndex: 0,
                endColumnIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true }
                }
              },
              fields: 'userEnteredFormat.textFormat'
            }
          }
        ]
      }
    });
    console.log('✓ Formatting applied\n');

    console.log('✅ Google Sheet setup complete!\n');
    console.log(`📄 Sheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}\n`);
    console.log('Next steps:');
    console.log('1. Verify the sheet has "Entries" and "Monthly Summary" tabs');
    console.log('2. Make sure the service account has Editor access');
    console.log('3. Test the API with a timer start/stop\n');

  } catch (error) {
    console.error('❌ Error setting up Google Sheet:', error.message);

    if (error.message.includes('PERMISSION_DENIED')) {
      console.error('\n⚠️  Permission denied. Please:');
      console.error('1. Open your Google Sheet');
      console.error('2. Click Share');
      console.error(`3. Add: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
      console.error('4. Set permissions to: Editor');
      console.error('5. Click Send\n');
    }

    process.exit(1);
  }
}

setupGoogleSheet();
