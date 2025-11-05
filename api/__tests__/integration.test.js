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
