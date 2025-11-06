# Siri Time Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a serverless API that enables voice-activated time tracking via Siri, storing entries in Google Sheets with automatic monthly rollups.

**Architecture:** Stateless Node.js/Express API hosted on Vercel with two endpoints (start/stop timer). Google Sheets acts as both database (Entries tab) and reporting layer (Monthly Summary tab with formulas). iOS Shortcuts call API endpoints, triggered by Siri voice commands.

**Tech Stack:** Node.js, Express, Google Sheets API v4 (googleapis), Vercel (serverless), iOS Shortcuts

---

## Task 1: Project Initialization and Dependencies

**Files:**
- Create: `package.json`
- Create: `README.md`
- Create: `.nvmrc`

**Step 1: Create package.json with dependencies**

```bash
cd /Users/braydon/projects/experiments/time-tracker
npm init -y
```

**Step 2: Install production dependencies**

```bash
npm install express googleapis dotenv
```

**Step 3: Install development dependencies**

```bash
npm install --save-dev jest supertest @types/jest @types/express nodemon
```

**Step 4: Update package.json scripts**

Edit `package.json`, replace the scripts section:

```json
{
  "scripts": {
    "dev": "nodemon api/index.js",
    "start": "node api/index.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

**Step 5: Create Node version file**

```bash
echo "20" > .nvmrc
```

**Step 6: Create README**

File: `README.md`

```markdown
# Siri Time Tracker

Voice-activated time tracking using Siri, iOS Shortcuts, and Google Sheets.

## Setup

1. Copy `.env.example` to `.env`
2. Add Google Service Account private key to `.env`
3. Share Google Sheet with service account email
4. Install dependencies: `npm install`
5. Run locally: `npm run dev`

## API Endpoints

- `POST /timer/start?project=ProjectName&apiKey=SECRET`
- `POST /timer/stop?task=TaskDescription&apiKey=SECRET`

## Deployment

Deploy to Vercel. Add environment variables in Vercel dashboard.
```

**Step 7: Commit**

```bash
git add package.json package-lock.json .nvmrc README.md
git commit -m "feat: initialize project with dependencies"
```

---

## Task 2: Google Sheets Service Setup (TDD)

**Files:**
- Create: `api/services/sheets.js`
- Create: `api/services/__tests__/sheets.test.js`

**Step 1: Write the failing test**

File: `api/services/__tests__/sheets.test.js`

```javascript
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
    expect(result.rowIndex).toBe(2);
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
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL with "Cannot find module '../sheets'"

**Step 3: Create minimal sheets service implementation**

File: `api/services/sheets.js`

```javascript
// ABOUTME: Google Sheets API service for time tracker
const { google } = require('googleapis');

function getSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

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
        rowIndex: i + 2, // +2 because: 0-indexed array + 1-indexed sheets + 1 for header
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
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS (all tests green)

**Step 5: Commit**

```bash
git add api/services/sheets.js api/services/__tests__/sheets.test.js
git commit -m "feat: add Google Sheets service with TDD"
```

---

## Task 3: Timer Start Endpoint (TDD)

**Files:**
- Create: `api/routes/timer.js`
- Create: `api/routes/__tests__/timer.test.js`

**Step 1: Write the failing test for /timer/start**

File: `api/routes/__tests__/timer.test.js`

```javascript
const request = require('supertest');
const express = require('express');
const timerRoutes = require('../timer');

// Mock the sheets service
jest.mock('../../services/sheets');
const sheets = require('../../services/sheets');

const app = express();
app.use(express.json());
app.use('/timer', timerRoutes);

describe('POST /timer/start', () => {
  beforeEach(() => {
    process.env.API_KEY = 'test-key';
    jest.clearAllMocks();

    // Mock sheets client
    const mockAppend = jest.fn().mockResolvedValue({});
    sheets.getSheetsClient.mockReturnValue({
      spreadsheets: {
        values: {
          append: mockAppend
        }
      }
    });
    sheets.appendRow.mockReturnValue({
      spreadsheetId: 'test',
      range: 'Entries!A:Z',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['test']] }
    });
  });

  test('returns 401 without API key', async () => {
    const response = await request(app)
      .post('/timer/start')
      .query({ project: 'TestProject' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  test('returns 400 without project parameter', async () => {
    const response = await request(app)
      .post('/timer/start')
      .query({ apiKey: 'test-key' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Project name required');
  });

  test('starts timer successfully', async () => {
    const response = await request(app)
      .post('/timer/start')
      .query({ project: 'TestProject', apiKey: 'test-key' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.project).toBe('TestProject');
    expect(response.body.timestamp).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- timer.test.js
```

Expected: FAIL with "Cannot find module '../timer'"

**Step 3: Implement /timer/start endpoint**

File: `api/routes/timer.js`

```javascript
// ABOUTME: Timer API routes for starting and stopping time tracking
const express = require('express');
const router = express.Router();
const { getSheetsClient, appendRow } = require('../services/sheets');

// Middleware to check API key
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
```

**Step 4: Run test to verify it passes**

```bash
npm test -- timer.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add api/routes/timer.js api/routes/__tests__/timer.test.js
git commit -m "feat: add timer start endpoint with TDD"
```

---

## Task 4: Timer Stop Endpoint (TDD)

**Files:**
- Modify: `api/routes/timer.js`
- Modify: `api/routes/__tests__/timer.test.js`

**Step 1: Write the failing test for /timer/stop**

Append to `api/routes/__tests__/timer.test.js`:

```javascript
describe('POST /timer/stop', () => {
  beforeEach(() => {
    process.env.API_KEY = 'test-key';
    jest.clearAllMocks();

    const mockGet = jest.fn().mockResolvedValue({
      data: {
        values: [
          ['Project', 'Start Time', 'End Time', 'Duration', 'Task Notes'],
          ['TestProject', '2025-11-05T09:00:00Z', '', '', '']
        ]
      }
    });
    const mockUpdate = jest.fn().mockResolvedValue({});

    sheets.getSheetsClient.mockReturnValue({
      spreadsheets: {
        values: {
          get: mockGet,
          update: mockUpdate,
          append: jest.fn()
        }
      }
    });

    sheets.findLastActiveTimer.mockReturnValue({
      rowIndex: 2,
      project: 'TestProject',
      startTime: '2025-11-05T09:00:00Z'
    });

    sheets.updateRow.mockReturnValue({
      spreadsheetId: 'test',
      range: 'Entries!A2:Z2',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['test']] }
    });
  });

  test('returns 401 without API key', async () => {
    const response = await request(app)
      .post('/timer/stop');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  test('returns 404 when no active timer', async () => {
    sheets.findLastActiveTimer.mockReturnValue(null);

    const response = await request(app)
      .post('/timer/stop')
      .query({ apiKey: 'test-key' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('No active timer found');
  });

  test('stops timer successfully with task description', async () => {
    const response = await request(app)
      .post('/timer/stop')
      .query({ apiKey: 'test-key', task: 'Testing feature' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.project).toBe('TestProject');
    expect(response.body.duration).toBeGreaterThan(0);
    expect(response.body.task).toBe('Testing feature');
  });

  test('stops timer successfully without task description', async () => {
    const response = await request(app)
      .post('/timer/stop')
      .query({ apiKey: 'test-key' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.task).toBe('');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- timer.test.js
```

Expected: FAIL (stop endpoint not implemented)

**Step 3: Implement /timer/stop endpoint**

Add to `api/routes/timer.js` before `module.exports`:

```javascript
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
```

Also add import at top:

```javascript
const { getSheetsClient, appendRow, findLastActiveTimer, updateRow } = require('../services/sheets');
```

**Step 4: Run test to verify it passes**

```bash
npm test -- timer.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add api/routes/timer.js api/routes/__tests__/timer.test.js
git commit -m "feat: add timer stop endpoint with TDD"
```

---

## Task 5: Main Express Server

**Files:**
- Create: `api/index.js`
- Create: `api/__tests__/index.test.js`

**Step 1: Write the failing test**

File: `api/__tests__/index.test.js`

```javascript
const request = require('supertest');

// Mock environment before requiring app
process.env.API_KEY = 'test-key';
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----\\n';
process.env.GOOGLE_SHEET_ID = 'test-sheet-id';

const app = require('../index');

describe('Express Server', () => {
  test('GET / returns welcome message', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Siri Time Tracker API');
  });

  test('GET /health returns healthy status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });

  test('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown');
    expect(response.status).toBe(404);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- index.test.js
```

Expected: FAIL with "Cannot find module '../index'"

**Step 3: Create main Express server**

File: `api/index.js`

```javascript
// ABOUTME: Main Express server for Siri Time Tracker API
require('dotenv').config();
const express = require('express');
const timerRoutes = require('./routes/timer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for iOS Shortcuts
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Siri Time Tracker API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.use('/timer', timerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
```

**Step 4: Run test to verify it passes**

```bash
npm test -- index.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add api/index.js api/__tests__/index.test.js
git commit -m "feat: add Express server with health check"
```

---

## Task 6: Jest Configuration

**Files:**
- Create: `jest.config.js`

**Step 1: Create Jest configuration**

File: `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'api/**/*.js',
    '!api/**/*.test.js',
    '!api/__tests__/**'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

**Step 2: Add test environment variable**

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "nodemon api/index.js",
    "start": "node api/index.js",
    "test": "NODE_ENV=test jest --coverage",
    "test:watch": "NODE_ENV=test jest --watch"
  }
}
```

**Step 3: Run all tests**

```bash
npm test
```

Expected: All tests PASS with coverage report

**Step 4: Commit**

```bash
git add jest.config.js package.json
git commit -m "feat: add Jest configuration with coverage"
```

---

## Task 7: Vercel Configuration

**Files:**
- Create: `vercel.json`

**Step 1: Create Vercel config**

File: `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Step 2: Update .gitignore for Vercel**

Verify `.gitignore` includes:

```
.vercel
```

**Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel deployment configuration"
```

---

## Task 8: Google Sheets Setup Documentation

**Files:**
- Create: `docs/google-sheets-setup.md`

**Step 1: Create setup documentation**

File: `docs/google-sheets-setup.md`

```markdown
# Google Sheets Setup Guide

## Sheet Structure

Your Google Sheet needs two tabs:

### 1. Entries Tab

**Column headers (Row 1):**
| A | B | C | D | E |
|---|---|---|---|---|
| Project | Start Time | End Time | Duration | Task Notes |

**Duration formula in D2** (copy down):
```
=IF(C2="", "", (C2-B2)*24)
```

This calculates hours between start and end time.

### 2. Monthly Summary Tab

**Total hours per project (current month):**

In cell A1:
```
=QUERY(Entries!A:E, "SELECT A, SUM(D) WHERE B >= date '"&TEXT(TODAY(),"yyyy-mm")&"-01' AND C <> '' GROUP BY A LABEL SUM(D) 'Hours'", 1)
```

**Running monthly total:**

In a cell below the query (e.g., A10):
```
Total Hours This Month:
```

In B10:
```
=SUM(FILTER(Entries!D:D, MONTH(Entries!B:B) = MONTH(TODAY()), YEAR(Entries!B:B) = YEAR(TODAY()), Entries!C:C <> ""))
```

## Service Account Access

1. Open your Google Sheet
2. Click "Share" in top right
3. Add the service account email: `your-service-account@your-project.iam.gserviceaccount.com`
4. Grant "Editor" permissions
5. Click "Send" (uncheck "Notify people")

## Testing

After setup, you should have:
- Header row in Entries tab
- Duration formula in column D
- Monthly Summary tab with formulas
- Service account has editor access

Test by manually adding a row to Entries:
- Project: "Test"
- Start Time: `=NOW()-1/24` (1 hour ago)
- End Time: `=NOW()`
- Duration: Should auto-calculate
- Task Notes: "Manual test"

Verify Monthly Summary updates with the test data.
```

**Step 2: Commit**

```bash
git add docs/google-sheets-setup.md
git commit -m "docs: add Google Sheets setup guide"
```

---

## Task 9: iOS Shortcuts Documentation

**Files:**
- Create: `docs/ios-shortcuts-setup.md`

**Step 1: Create shortcuts documentation**

File: `docs/ios-shortcuts-setup.md`

```markdown
# iOS Shortcuts Setup Guide

## Prerequisites

1. API deployed to Vercel (get your production URL)
2. API key from `.env` file
3. iOS device with Shortcuts app

## Setup Steps

### 1. Get Your Credentials

From your `.env` file:
- Production URL: `https://time-tracker-YOUR-DEPLOYMENT.vercel.app`
- API Key: `YOUR_API_KEY_HERE`

### 2. Create "Start [Project]" Shortcuts

For each project you track (e.g., ClientA, ClientB, Personal):

1. Open Shortcuts app
2. Tap "+" to create new shortcut
3. Name it: "Start ClientA" (or your project name)
4. Add action: "Get Contents of URL"
   - URL: `https://YOUR-DEPLOYMENT.vercel.app/timer/start?project=ClientA&apiKey=YOUR_API_KEY_HERE`
   - Method: POST
   - Headers: none needed
   - Body: empty
5. Add action: "Show Notification"
   - Text: "Timer started for ClientA"
6. Save shortcut

**Siri Activation:** Automatically works! Say "Hey Siri, Start ClientA"

Repeat for each project you want to track.

### 3. Create "Stop Timer" Shortcut

1. Open Shortcuts app
2. Tap "+" to create new shortcut
3. Name it: "Stop Timer"
4. Add action: "Ask for Input"
   - Prompt: "What was the task?"
   - Input Type: Text
   - Default Answer: (leave blank)
5. Add action: "Set Variable"
   - Variable Name: TaskDescription
   - Value: [Provided Input from previous action]
6. Add action: "Get Contents of URL"
   - URL: `https://YOUR-DEPLOYMENT.vercel.app/timer/stop?task=[TaskDescription]&apiKey=YOUR_API_KEY_HERE`
   - Method: POST
   - Headers: none needed
   - Body: empty
7. Add action: "Get Dictionary from Input"
   - Input: [Contents of URL]
8. Add action: "Get Dictionary Value"
   - Key: duration
   - Dictionary: [Dictionary]
9. Add action: "Show Notification"
   - Text: "Timer stopped. Duration: [Dictionary Value] hours"
10. Save shortcut

**Siri Activation:** Say "Hey Siri, Stop Timer"

## Testing

### Test Start Shortcut
1. Open Shortcuts app
2. Tap "Start ClientA" to run manually
3. Should see notification: "Timer started for ClientA"
4. Check Google Sheet - new row should appear with project name and start time

### Test Stop Shortcut
1. Ensure you have an active timer (run Start shortcut first)
2. Tap "Stop Timer" in Shortcuts app
3. Enter task description when prompted
4. Should see notification with duration
5. Check Google Sheet - row should have end time, duration, and task notes

### Test with Siri
1. Say "Hey Siri, Start ClientA"
2. Wait a few minutes
3. Say "Hey Siri, Stop Timer"
4. Speak task description when prompted
5. Verify entry in Google Sheet

## Troubleshooting

**Shortcut fails silently:**
- Check API URL is correct (copy from Vercel dashboard)
- Verify API key matches your `.env` file
- Ensure service account has access to Google Sheet

**"No active timer found" error:**
- Make sure you ran a Start shortcut first
- Check Entries tab for row with empty End Time column

**Siri doesn't recognize shortcut:**
- Shortcut name becomes Siri phrase
- Try renaming shortcut to simpler phrase
- Wait a few minutes after creating for Siri to index it

## Quick Reference

**Your Shortcuts:**
- "Hey Siri, Start ClientA" → Starts timer for ClientA
- "Hey Siri, Start ClientB" → Starts timer for ClientB
- "Hey Siri, Start Personal" → Starts timer for Personal
- "Hey Siri, Stop Timer" → Stops active timer with task prompt

**Add more projects:** Duplicate any "Start" shortcut, change project name in URL and shortcut name.
```

**Step 2: Commit**

```bash
git add docs/ios-shortcuts-setup.md
git commit -m "docs: add iOS Shortcuts setup guide"
```

---

## Task 10: Deployment Documentation

**Files:**
- Create: `docs/deployment.md`

**Step 1: Create deployment guide**

File: `docs/deployment.md`

```markdown
# Deployment Guide

## Prerequisites

- GitHub account with repo: https://github.com/dbmcco/time-tracker
- Vercel account (free tier)
- Google Service Account JSON credentials
- Vercel API token (already in `.env`)

## Step 1: Prepare Environment Variables

You need these values for Vercel:

1. **GOOGLE_SERVICE_ACCOUNT_EMAIL**
   - Value: `your-service-account@your-project.iam.gserviceaccount.com`

2. **GOOGLE_PRIVATE_KEY**
   - From your service account JSON file
   - Copy the `private_key` field value
   - Keep the `\n` characters (or actual newlines)

3. **GOOGLE_SHEET_ID**
   - Value: `YOUR_SPREADSHEET_ID_HERE`

4. **API_KEY**
   - Value: `YOUR_API_KEY_HERE`

## Step 2: Push to GitHub

```bash
git push -u origin main
```

## Step 3: Deploy to Vercel (CLI Method)

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login with your Vercel token
vercel login

# Deploy
vercel --prod
```

Follow prompts:
- Set up and deploy? Yes
- Which scope? Choose your account
- Link to existing project? No
- Project name? time-tracker
- Directory? ./
- Override settings? No

## Step 4: Add Environment Variables in Vercel

### Option A: Via Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project: time-tracker
3. Go to Settings → Environment Variables
4. Add each variable:
   - Name: `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - Value: `your-service-account@your-project.iam.gserviceaccount.com`
   - Environment: Production
   - Click "Save"
5. Repeat for all 4 environment variables

### Option B: Via CLI
```bash
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
# Paste value when prompted: your-service-account@your-project.iam.gserviceaccount.com

vercel env add GOOGLE_PRIVATE_KEY production
# Paste private key (entire value including -----BEGIN/END-----)

vercel env add GOOGLE_SHEET_ID production
# Paste: YOUR_SPREADSHEET_ID_HERE

vercel env add API_KEY production
# Paste: YOUR_API_KEY_HERE
```

## Step 5: Redeploy After Adding Environment Variables

```bash
vercel --prod
```

## Step 6: Get Your Production URL

After deployment, Vercel gives you a URL like:
```
https://time-tracker-abc123.vercel.app
```

Save this URL - you'll need it for iOS Shortcuts.

## Step 7: Test Production API

```bash
# Test health endpoint
curl https://YOUR-DEPLOYMENT.vercel.app/health

# Test timer start (replace YOUR-DEPLOYMENT and API-KEY)
curl -X POST "https://YOUR-DEPLOYMENT.vercel.app/timer/start?project=TestProject&apiKey=YOUR_API_KEY_HERE"

# Check Google Sheet - should see new row

# Test timer stop
curl -X POST "https://YOUR-DEPLOYMENT.vercel.app/timer/stop?task=Testing&apiKey=YOUR_API_KEY_HERE"

# Check Google Sheet - row should be updated
```

## Continuous Deployment

Vercel auto-deploys on every push to main:
1. Make changes locally
2. Commit: `git commit -m "your message"`
3. Push: `git push`
4. Vercel automatically builds and deploys

View deployment status: https://vercel.com/dashboard

## Troubleshooting

**Deployment fails:**
- Check build logs in Vercel dashboard
- Ensure all dependencies in `package.json`
- Verify `vercel.json` is committed

**API returns 500 errors:**
- Check environment variables are set correctly
- View function logs in Vercel dashboard
- Verify Google Service Account has access to sheet

**Google Sheets authentication fails:**
- Ensure `GOOGLE_PRIVATE_KEY` includes newlines (`\n`)
- Check service account email is correct
- Verify sheet ID matches your sheet

## Monitoring

**View Logs:**
```bash
vercel logs YOUR-DEPLOYMENT.vercel.app
```

Or in dashboard: Project → Deployments → Click deployment → Functions → View logs

**Usage:**
- Vercel free tier: 100GB bandwidth, 100 hours serverless function execution
- Should be plenty for personal time tracking
```

**Step 2: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: add deployment guide"
```

---

## Task 11: Update Main README

**Files:**
- Modify: `README.md`

**Step 1: Enhance README with complete information**

Replace `README.md` content:

```markdown
# Siri Time Tracker

Voice-activated time tracking using Siri, iOS Shortcuts, serverless API, and Google Sheets.

## Features

- ✅ Start/stop timers with Siri voice commands
- ✅ Automatic time tracking in Google Sheets
- ✅ Per-project time tracking
- ✅ Task descriptions added when stopping timer
- ✅ Automatic monthly summaries
- ✅ Zero-maintenance serverless deployment

## Quick Start

### 1. Prerequisites
- Google Service Account with Sheets API access
- Vercel account (free tier)
- iOS device with Shortcuts app

### 2. Setup
```bash
# Clone repo
git clone https://github.com/dbmcco/time-tracker.git
cd time-tracker

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### 3. Google Sheets Setup
See [docs/google-sheets-setup.md](docs/google-sheets-setup.md) for:
- Sheet structure
- Column formulas
- Service account access

### 4. Deploy to Vercel
See [docs/deployment.md](docs/deployment.md) for:
- Vercel deployment steps
- Environment variable configuration
- Testing production API

### 5. iOS Shortcuts
See [docs/ios-shortcuts-setup.md](docs/ios-shortcuts-setup.md) for:
- Creating Start/Stop shortcuts
- Configuring Siri phrases
- Testing workflow

## Usage

**Start tracking:**
```
"Hey Siri, Start ClientA"
```

**Stop tracking:**
```
"Hey Siri, Stop Timer"
Siri: "What was the task?"
You: "Client meeting about new features"
```

**View time:**
- Open Google Sheet → Monthly Summary tab
- See hours per project and total monthly hours

## API Endpoints

### POST /timer/start
**Query Parameters:**
- `project` (required): Project name
- `apiKey` (required): Authentication key

**Response:**
```json
{
  "success": true,
  "project": "ClientA",
  "timestamp": "2025-11-05T09:15:00Z"
}
```

### POST /timer/stop
**Query Parameters:**
- `task` (optional): Task description
- `apiKey` (required): Authentication key

**Response:**
```json
{
  "success": true,
  "project": "ClientA",
  "duration": 2.25,
  "task": "Client meeting"
}
```

## Development

```bash
# Run locally
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Architecture

- **API**: Node.js + Express (serverless on Vercel)
- **Database**: Google Sheets (Entries tab)
- **Reporting**: Google Sheets formulas (Monthly Summary tab)
- **Interface**: iOS Shortcuts + Siri
- **Auth**: Service Account + API key

## Documentation

- [Google Sheets Setup](docs/google-sheets-setup.md)
- [iOS Shortcuts Setup](docs/ios-shortcuts-setup.md)
- [Deployment Guide](docs/deployment.md)
- [Implementation Plan](docs/plans/2025-11-05-siri-time-tracker.md)
- [Design Document](docs/plans/2025-11-05-siri-time-tracker-design.md)

## Testing

Test coverage: >80% (branches, functions, lines, statements)

```bash
npm test
```

## License

Private - Internal use only
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: enhance README with complete project information"
```

---

## Task 12: Final Integration Test

**Files:**
- Create: `api/__tests__/integration.test.js`

**Step 1: Create integration test**

File: `api/__tests__/integration.test.js`

```javascript
// ABOUTME: Integration tests for complete timer workflow
const request = require('supertest');

// Mock environment
process.env.API_KEY = 'test-key';
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----\\n';
process.env.GOOGLE_SHEET_ID = 'test-sheet-id';

// Mock the entire Google Sheets API
const mockAppend = jest.fn().mockResolvedValue({ data: {} });
const mockGet = jest.fn();
const mockUpdate = jest.fn().mockResolvedValue({ data: {} });

jest.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: jest.fn()
    },
    sheets: jest.fn(() => ({
      spreadsheets: {
        values: {
          append: mockAppend,
          get: mockGet,
          update: mockUpdate
        }
      }
    }))
  }
}));

const app = require('../index');

describe('Timer Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('complete timer workflow: start → stop with task', async () => {
    // Start timer
    const startResponse = await request(app)
      .post('/timer/start')
      .query({ project: 'IntegrationTest', apiKey: 'test-key' });

    expect(startResponse.status).toBe(200);
    expect(startResponse.body.success).toBe(true);
    expect(startResponse.body.project).toBe('IntegrationTest');
    expect(mockAppend).toHaveBeenCalledTimes(1);

    // Mock the sheet read for stop
    const startTime = startResponse.body.timestamp;
    mockGet.mockResolvedValue({
      data: {
        values: [
          ['Project', 'Start Time', 'End Time', 'Duration', 'Task Notes'],
          ['IntegrationTest', startTime, '', '', '']
        ]
      }
    });

    // Wait a bit to simulate time passing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Stop timer
    const stopResponse = await request(app)
      .post('/timer/stop')
      .query({ task: 'Integration testing', apiKey: 'test-key' });

    expect(stopResponse.status).toBe(200);
    expect(stopResponse.body.success).toBe(true);
    expect(stopResponse.body.project).toBe('IntegrationTest');
    expect(stopResponse.body.duration).toBeGreaterThan(0);
    expect(stopResponse.body.task).toBe('Integration testing');
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  test('handles multiple sequential timers', async () => {
    // Start first timer
    await request(app)
      .post('/timer/start')
      .query({ project: 'Project1', apiKey: 'test-key' });

    // Mock sheet with first timer
    mockGet.mockResolvedValue({
      data: {
        values: [
          ['Project', 'Start Time', 'End Time', 'Duration', 'Task Notes'],
          ['Project1', new Date().toISOString(), '', '', '']
        ]
      }
    });

    // Stop first timer
    const stop1 = await request(app)
      .post('/timer/stop')
      .query({ task: 'Task 1', apiKey: 'test-key' });

    expect(stop1.status).toBe(200);

    // Start second timer
    await request(app)
      .post('/timer/start')
      .query({ project: 'Project2', apiKey: 'test-key' });

    // Mock sheet with both timers (first completed, second active)
    const now = new Date().toISOString();
    mockGet.mockResolvedValue({
      data: {
        values: [
          ['Project', 'Start Time', 'End Time', 'Duration', 'Task Notes'],
          ['Project1', now, now, '0', 'Task 1'],
          ['Project2', now, '', '', '']
        ]
      }
    });

    // Stop second timer
    const stop2 = await request(app)
      .post('/timer/stop')
      .query({ task: 'Task 2', apiKey: 'test-key' });

    expect(stop2.status).toBe(200);
    expect(stop2.body.project).toBe('Project2');
  });

  test('handles stop without active timer', async () => {
    // Mock empty sheet (no active timers)
    mockGet.mockResolvedValue({
      data: {
        values: [
          ['Project', 'Start Time', 'End Time', 'Duration', 'Task Notes']
        ]
      }
    });

    const response = await request(app)
      .post('/timer/stop')
      .query({ apiKey: 'test-key' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('No active timer found');
  });
});
```

**Step 2: Run integration tests**

```bash
npm test -- integration.test.js
```

Expected: PASS

**Step 3: Run full test suite with coverage**

```bash
npm test
```

Expected: All tests PASS, coverage >80%

**Step 4: Commit**

```bash
git add api/__tests__/integration.test.js
git commit -m "test: add integration tests for complete workflow"
```

---

## Task 13: Add nodemon configuration

**Files:**
- Create: `nodemon.json`

**Step 1: Create nodemon config**

File: `nodemon.json`

```json
{
  "watch": ["api"],
  "ext": "js,json",
  "ignore": ["api/__tests__/*"],
  "exec": "node api/index.js"
}
```

**Step 2: Commit**

```bash
git add nodemon.json
git commit -m "feat: add nodemon configuration for development"
```

---

## Task 14: Add package.json metadata

**Files:**
- Modify: `package.json`

**Step 1: Update package.json with complete metadata**

Add/update these fields in `package.json`:

```json
{
  "name": "siri-time-tracker",
  "version": "1.0.0",
  "description": "Voice-activated time tracking using Siri, iOS Shortcuts, and Google Sheets",
  "main": "api/index.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/dbmcco/time-tracker.git"
  },
  "keywords": [
    "time-tracking",
    "siri",
    "ios-shortcuts",
    "google-sheets",
    "serverless"
  ],
  "author": "Braydon",
  "license": "UNLICENSED",
  "private": true,
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: update package.json metadata"
```

---

## Task 15: Final Push and Deployment

**Files:**
- N/A (deployment only)

**Step 1: Verify all tests pass**

```bash
npm test
```

Expected: All tests PASS, coverage >80%

**Step 2: Push to GitHub**

```bash
git push -u origin main
```

**Step 3: Deploy to Vercel**

Follow instructions in [docs/deployment.md](docs/deployment.md):

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Deploy to production
vercel --prod
```

**Step 4: Add environment variables in Vercel**

Via Vercel CLI or dashboard, add:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (from service account JSON file)
- `GOOGLE_SHEET_ID`
- `API_KEY`

**Step 5: Redeploy to pick up environment variables**

```bash
vercel --prod
```

**Step 6: Test production API**

```bash
# Get your production URL from Vercel output
PROD_URL="https://YOUR-DEPLOYMENT.vercel.app"
API_KEY="YOUR_API_KEY_HERE"

# Test health
curl "$PROD_URL/health"

# Test start timer
curl -X POST "$PROD_URL/timer/start?project=ProductionTest&apiKey=$API_KEY"

# Check Google Sheet for new entry

# Test stop timer
curl -X POST "$PROD_URL/timer/stop?task=Production%20testing&apiKey=$API_KEY"

# Check Google Sheet for updated entry
```

**Step 7: Set up iOS Shortcuts**

Follow instructions in [docs/ios-shortcuts-setup.md](docs/ios-shortcuts-setup.md):
1. Create "Start [Project]" shortcuts for each project
2. Create "Stop Timer" shortcut
3. Test with Siri

**Complete!** Your Siri time tracker is now live and ready to use.

---

## Next Steps (Post-Implementation)

1. **Google Service Account Private Key**: Add the `private_key` from your service account JSON file to `.env` and Vercel environment variables

2. **Google Sheet Formulas**: Set up the Monthly Summary tab formulas as described in [docs/google-sheets-setup.md](docs/google-sheets-setup.md)

3. **Create iOS Shortcuts**: Follow [docs/ios-shortcuts-setup.md](docs/ios-shortcuts-setup.md) to create your Siri-activated shortcuts

4. **Start Tracking**: Say "Hey Siri, Start [Project]" and begin tracking time!

## Maintenance

- **Add new projects**: Duplicate an existing "Start" shortcut, update project name
- **View reports**: Open Google Sheet → Monthly Summary tab
- **Archive old data**: Optional - copy previous month's data to new tab

## Reference Documents

- Implementation Plan: [docs/plans/2025-11-05-siri-time-tracker.md](docs/plans/2025-11-05-siri-time-tracker.md) (this file)
- Design Document: [docs/plans/2025-11-05-siri-time-tracker-design.md](docs/plans/2025-11-05-siri-time-tracker-design.md)
