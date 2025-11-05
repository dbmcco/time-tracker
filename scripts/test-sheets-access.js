// ABOUTME: Simple test script to verify Google Sheets API access
require('dotenv').config();
const { google } = require('googleapis');

async function testAccess() {
  console.log('Testing Google Sheets API access...\n');

  console.log('1. Checking environment variables...');
  console.log(`   Email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
  console.log(`   Sheet ID: ${process.env.GOOGLE_SHEET_ID}`);
  console.log(`   Private key loaded: ${!!process.env.GOOGLE_PRIVATE_KEY}\n`);

  try {
    console.log('2. Creating auth client...');
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    console.log('3. Getting access token...');
    await auth.authorize();
    console.log('   ✓ Auth successful\n');

    console.log('4. Creating Sheets client...');
    const sheets = google.sheets({ version: 'v4', auth });

    console.log('5. Reading spreadsheet metadata...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID
    });

    console.log('   ✓ Successfully accessed spreadsheet!');
    console.log(`   Title: ${spreadsheet.data.properties.title}`);
    console.log(`   Sheets: ${spreadsheet.data.sheets.map(s => s.properties.title).join(', ')}\n`);

    console.log('✅ All tests passed! Google Sheets API is working correctly.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 403) {
      console.error('\n⚠️  Permission denied. Make sure:');
      console.error('1. The service account email has been shared with Editor access');
      console.error('2. Google Sheets API is enabled for your project');
    }
    process.exit(1);
  }
}

testAccess();
