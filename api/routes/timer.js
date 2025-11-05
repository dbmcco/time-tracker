// ABOUTME: Timer API routes for starting and stopping time tracking
const express = require('express');
const router = express.Router();
const { getSheetsClient, appendRow } = require('../services/sheets');

// SECURITY NOTE: API key is in query parameter for iOS Shortcuts compatibility.
// This is a trade-off between security and usability for this personal tool.
// For production apps with sensitive data, use Authorization headers instead.
function requireApiKey(req, res, next) {
  const apiKey = req.query.apiKey;
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.post('/start', requireApiKey, async (req, res) => {
  try {
    const { project } = req.query;

    if (!project) {
      return res.status(400).json({ error: 'Project name required' });
    }

    const timestamp = new Date().toISOString();
    const sheets = getSheetsClient();

    const params = appendRow('Entries', [project, timestamp, '', '', '']);
    await sheets.spreadsheets.values.append(params);

    res.json({
      success: true,
      project,
      timestamp
    });
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

module.exports = router;
