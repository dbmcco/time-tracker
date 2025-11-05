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
