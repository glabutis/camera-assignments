require('dotenv').config();
const { google } = require('googleapis');

async function fetchAssignments() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: process.env.SHEET_RANGE || 'Sheet1!A2:C',
  });

  const rows = response.data.values || [];
  return rows
    .filter(row => row[0] && row[1])
    .map(row => ({
      role: row[0].trim(),
      name: row[1].trim(),
      isLead: (row[2] || '').toUpperCase() === 'TRUE',
    }));
}

module.exports = { fetchAssignments };
