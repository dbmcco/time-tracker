// ABOUTME: Timer API routes for starting and stopping time tracking
const express = require('express');
const router = express.Router();
const { getSheetsClient, appendRow, findLastActiveTimer, updateRow } = require('../services/sheets');

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

router.post('/stop', requireApiKey, async (req, res) => {
  try {
    const { task = '' } = req.query;
    const sheets = getSheetsClient();

    // Get all entries
    const getParams = {
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Entries!A:E'
    };
    const response = await sheets.spreadsheets.values.get(getParams);
    const rows = response.data.values || [];

    // Find last active timer (skip header row)
    const activeTimer = findLastActiveTimer(rows.slice(1));

    if (!activeTimer) {
      return res.status(404).json({ error: 'No active timer found' });
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(activeTimer.startTime);
    const duration = (new Date(endTime) - startTime) / (1000 * 60 * 60); // hours

    // Update the row with end time and task
    const updateParams = updateRow(
      'Entries',
      activeTimer.rowIndex,
      [activeTimer.project, activeTimer.startTime, endTime, duration.toFixed(2), task]
    );
    await sheets.spreadsheets.values.update(updateParams);

    res.json({
      success: true,
      project: activeTimer.project,
      duration: parseFloat(duration.toFixed(2)),
      task
    });
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({ error: 'Failed to stop timer' });
  }
});

module.exports = router;
