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
