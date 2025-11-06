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
