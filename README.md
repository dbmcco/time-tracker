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

## Security Notes

**⚠️ IMPORTANT: Never commit your `.env` file!**

Your `.env` file contains sensitive credentials:
- Google Service Account private key
- API authentication key
- Sheet IDs

**Recommended: Store secrets in a password manager**
- 1Password, LastPass, Bitwarden, etc.
- Store as "Siri Time Tracker Credentials"
- Include: Service account email, private key, API key, sheet ID

The `.gitignore` file is already configured to exclude `.env` from version control.

## License

MIT - Free to use and modify
