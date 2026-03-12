# RQ Quiz Integration Setup Guide
## Complete Setup for Supabase, Email, and Google Sheets

**Last Updated**: 2026-03-12
**Status**: Implementation Complete - Configuration Needed

---

## Overview

When a user completes the RQ quiz, their submission is now captured in **three places**:

1. ✅ **Supabase** - PostgreSQL database (WORKING)
2. ⏳ **Email** - Notification to `hello@ghostsignal.cloud` (NEEDS SETUP)
3. ⏳ **Google Sheets** - Spreadsheet in Google Drive (NEEDS SETUP)

---

## Current Status

### ✅ 1. Supabase - Already Working

**Status**: Fully configured and operational

**Configuration**:
```env
SUPABASE_URL=https://mavtvivcwrxiqrruwdib.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
RQ_SUBMISSIONS_TABLE=rq_submissions
```

**Test**: Visit `http://localhost:3000/api/rq-submissions`

Expected response:
```json
{
  "ok": true,
  "configured": true,
  "table": "rq_submissions",
  "emailConfigured": false,
  "googleSheetsConfigured": false,
  "message": "Supabase connection is working for RQ submissions."
}
```

**What Gets Stored**:
- Participant info (name, email, organization, type)
- All quiz answers (raw values)
- Computed RQ code and name
- Signal clarity score
- Profile descriptions
- Undertone
- Source metadata (URL, referrer, user agent)

**View Data**: Login to Supabase dashboard → Table Editor → `rq_submissions`

---

## Setup Instructions

### ⏳ 2. Email Notifications (Resend)

Email notifications will be sent to `hello@ghostsignal.cloud` when someone submits the RQ quiz.

#### Step 1: Sign Up for Resend

1. Go to https://resend.com
2. Click "Sign Up" (free tier is sufficient)
3. Verify your email address

#### Step 2: Verify Your Domain (Recommended)

**Option A: Use Your Domain** (Recommended for production)
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter `ghostsignal.cloud`
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually 5-15 minutes)
6. Use `no-reply@ghostsignal.cloud` as your sender

**Option B: Use Test Domain** (Quick start for testing)
1. Skip domain verification
2. Use Resend's test domain (like `onboarding@resend.dev`)
3. NOTE: Test domain has limitations and emails may go to spam

#### Step 3: Get API Key

1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Name it "GhostSignal RQ Notifications"
4. Select "Sending access"
5. Click "Create"
6. Copy the API key (starts with `re_...`)

#### Step 4: Add to Environment Variables

Open `apps/web/.env.local` and add:

```env
# Email Notifications (Resend)
RESEND_API_KEY=re_YOUR_API_KEY_HERE
RESEND_FROM="Ghost Signal <no-reply@ghostsignal.cloud>"
```

**Important**: Replace `re_YOUR_API_KEY_HERE` with your actual API key.

If using test domain, use:
```env
RESEND_FROM="Ghost Signal <onboarding@resend.dev>"
```

#### Step 5: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

#### Step 6: Test Email

1. Visit `http://localhost:3000/rq-preview.html`
2. Fill out the quiz
3. Submit
4. Check `hello@ghostsignal.cloud` inbox for notification

**Email Contents**:
- Subject: `New GhostSignal RQ: [RQ Code] - [Name or Organization]`
- Body: Participant details, RQ code, undertone, source info
- Reply-to: Participant's email address

---

### ⏳ 3. Google Sheets Integration

RQ submissions will be appended to a Google Sheet for easy viewing and analysis.

#### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click "Select a project" → "New Project"
3. Name it "GhostSignal RQ Submissions"
4. Click "Create"
5. Wait for project creation (30-60 seconds)

#### Step 2: Enable Google Sheets API

1. In the Google Cloud Console, ensure your new project is selected
2. Go to "APIs & Services" → "Library"
3. Search for "Google Sheets API"
4. Click on it
5. Click "Enable"

#### Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Enter details:
   - **Name**: `ghostsignal-rq-submissions`
   - **Description**: `Service account for appending RQ submissions to Google Sheets`
4. Click "Create and Continue"
5. Skip "Grant this service account access to project" (optional)
6. Click "Done"

#### Step 4: Create Service Account Key

1. In "Credentials", find your service account
2. Click on it to open details
3. Go to "Keys" tab
4. Click "Add Key" → "Create new key"
5. Select "JSON"
6. Click "Create"
7. A JSON file will download - **SAVE THIS SECURELY**

#### Step 5: Create Google Sheet

1. Go to https://docs.google.com/spreadsheets
2. Create a new spreadsheet
3. Name it "GhostSignal RQ Submissions"
4. Add headers to the first row (optional but recommended):
   ```
   Timestamp | Type | First Name | Last Name | Email | Organization | Role | Industry | Website | RQ Code | RQ Name | Signal Clarity | Undertone | Source | Page URL | Answers
   ```

#### Step 6: Share Sheet with Service Account

1. In your Google Sheet, click "Share"
2. In the email field, paste the **service account email** from the JSON file
   - It looks like: `ghostsignal-rq-submissions@your-project.iam.gserviceaccount.com`
3. Set permission to "Editor"
4. Uncheck "Notify people"
5. Click "Share"

#### Step 7: Get Sheet ID

From the sheet URL:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
```

Copy the `SPREADSHEET_ID_HERE` part (long alphanumeric string).

#### Step 8: Add to Environment Variables

Open the downloaded JSON key file. Copy the `client_email` and `private_key` values.

Open `apps/web/.env.local` and add:

```env
# Google Sheets Integration
GOOGLE_SHEETS_SPREADSHEET_ID=YOUR_SPREADSHEET_ID_HERE
GOOGLE_SHEETS_SHEET_NAME=Sheet1
GOOGLE_SHEETS_CLIENT_EMAIL=ghostsignal-rq-submissions@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Important Notes**:
- Replace `YOUR_SPREADSHEET_ID_HERE` with your actual spreadsheet ID
- Replace the email and private key with values from your JSON file
- Keep the private key in quotes
- The `\n` characters in the private key are correct (do not remove them)
- If your sheet has a different name than "Sheet1", update `GOOGLE_SHEETS_SHEET_NAME`

#### Step 9: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

#### Step 10: Test Google Sheets

1. Visit `http://localhost:3000/api/rq-submissions` to check status:
   ```json
   {
     "ok": true,
     "googleSheetsConfigured": true
   }
   ```

2. Visit `http://localhost:3000/rq-preview.html`
3. Fill out the quiz
4. Submit
5. Check your Google Sheet - a new row should appear!

---

## Testing the Complete Flow

Once all three integrations are configured:

1. Start dev server: `npm run dev`
2. Open `http://localhost:3000/api/rq-submissions`
3. Verify all integrations show as configured:
   ```json
   {
     "ok": true,
     "configured": true,
     "emailConfigured": true,
     "googleSheetsConfigured": true
   }
   ```

4. Open `http://localhost:3000/rq-preview.html`
5. Fill out the RQ quiz with test data
6. Click "Generate My RQ"
7. Verify success message

**Expected Results**:
- ✅ New row appears in Supabase `rq_submissions` table
- ✅ Email arrives at `hello@ghostsignal.cloud`
- ✅ New row appears in Google Sheet

**API Response**:
```json
{
  "ok": true,
  "id": "abc-123-def",
  "emailNotified": true,
  "emailTo": "hello@ghostsignal.cloud",
  "googleSheetsAppended": true,
  "googleSheetsRange": "Sheet1!A2"
}
```

---

## Troubleshooting

### Email Not Sending

**Check 1**: Verify `RESEND_API_KEY` is in `.env.local`
```bash
# In apps/web/.env.local, check for:
RESEND_API_KEY=re_...
RESEND_FROM="Ghost Signal <no-reply@ghostsignal.cloud>"
```

**Check 2**: Verify API key is valid
- Login to Resend dashboard
- Go to "API Keys"
- Check if your key still exists and is active

**Check 3**: Check server logs
```bash
npm run dev
# Look for "RQ notification email failed:" in the terminal
```

**Check 4**: Verify domain is verified (if using custom domain)
- In Resend dashboard → Domains
- Status should be "Verified"

### Google Sheets Not Updating

**Check 1**: Verify all environment variables are set
```bash
# In apps/web/.env.local, check for:
GOOGLE_SHEETS_SPREADSHEET_ID=...
GOOGLE_SHEETS_CLIENT_EMAIL=...
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

**Check 2**: Verify service account has access to sheet
- Open your Google Sheet
- Click "Share"
- Check if the service account email is listed with "Editor" access

**Check 3**: Verify private key format
- Must be in quotes
- Must include `\n` characters
- Must start with `-----BEGIN PRIVATE KEY-----\n`
- Must end with `\n-----END PRIVATE KEY-----\n`

**Check 4**: Check server logs
```bash
npm run dev
# Look for "Google Sheets append failed:" in the terminal
```

**Check 5**: Verify Google Sheets API is enabled
- Go to Google Cloud Console
- Select your project
- Go to "APIs & Services" → "Enabled APIs & services"
- Check if "Google Sheets API" is listed

### Supabase Connection Issues

**Check 1**: Verify credentials
```bash
# In apps/web/.env.local:
SUPABASE_URL=https://mavtvivcwrxiqrruwdib.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Check 2**: Test connection
```bash
curl http://localhost:3000/api/rq-submissions
```

**Check 3**: Verify table exists
- Login to Supabase dashboard
- Go to Table Editor
- Check if `rq_submissions` table exists

---

## Complete .env.local Reference

Here's what your final `.env.local` should look like:

```env
# Public
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (RQ Submissions Storage)
SUPABASE_URL=https://mavtvivcwrxiqrruwdib.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
RQ_SUBMISSIONS_TABLE=rq_submissions

# CORS for RQ Quiz
RQ_ALLOWED_ORIGINS=*

# Email Notifications (Resend)
RESEND_API_KEY=re_YOUR_API_KEY_HERE
RESEND_FROM="Ghost Signal <no-reply@ghostsignal.cloud>"

# Google Sheets Integration
GOOGLE_SHEETS_SPREADSHEET_ID=YOUR_SPREADSHEET_ID_HERE
GOOGLE_SHEETS_SHEET_NAME=Sheet1
GOOGLE_SHEETS_CLIENT_EMAIL=ghostsignal-rq-submissions@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

---

## Production Deployment Notes

When deploying to production (Vercel, etc.):

1. **Add all environment variables** to your hosting platform's environment settings
2. **Update `RQ_ALLOWED_ORIGINS`** to restrict CORS:
   ```env
   RQ_ALLOWED_ORIGINS=https://your-squarespace-site.com,https://ghostsignal.cloud
   ```
3. **Update RQ snippet** in Squarespace to point to production:
   ```html
   <script>
     window.GHOSTSIGNAL_RQ_ENDPOINT = "https://your-production-domain.com/api/rq-submissions";
   </script>
   ```
4. **Test end-to-end** with a production submission

---

## Security Best Practices

1. **Never commit `.env.local`** to git
2. **Rotate API keys periodically** (every 90 days)
3. **Use production domains** for email sending (avoid test domains)
4. **Restrict CORS** in production (don't use `*`)
5. **Monitor service account permissions** in Google Cloud
6. **Keep service account JSON secure** (don't share or commit)

---

## Support

If you run into issues:

1. Check the troubleshooting section above
2. Review server logs in terminal
3. Test each integration independently
4. Verify all environment variables are set correctly
5. Restart dev server after any `.env.local` changes

---

**You're all set!** Once configured, every RQ submission will be captured in all three places automatically.
