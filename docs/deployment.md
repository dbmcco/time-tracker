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
