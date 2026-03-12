# RQ Integration - Quick Setup Checklist

**Goal**: Capture RQ submissions in Supabase, Email, and Google Sheets

---

## ✅ 1. Supabase (DONE)

Already working - no action needed!

---

## ⏳ 2. Email Notifications

### Quick Steps:

1. Sign up at https://resend.com
2. Get API key from dashboard
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_YOUR_KEY
   RESEND_FROM="Ghost Signal <no-reply@ghostsignal.cloud>"
   ```
4. Restart server: `npm run dev`

📖 **Full guide**: `docs/RQ_INTEGRATION_SETUP.md` (Section 2)

---

## ⏳ 3. Google Sheets

### Quick Steps:

1. Create Google Cloud project at https://console.cloud.google.com
2. Enable "Google Sheets API"
3. Create service account, download JSON key
4. Create Google Sheet, share with service account email
5. Add to `.env.local`:
   ```env
   GOOGLE_SHEETS_SPREADSHEET_ID=your_sheet_id
   GOOGLE_SHEETS_SHEET_NAME=Sheet1
   GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
6. Restart server: `npm run dev`

📖 **Full guide**: `docs/RQ_INTEGRATION_SETUP.md` (Section 3)

---

## 🧪 Test Everything

1. Visit: `http://localhost:3000/api/rq-submissions`
2. Verify all show `true`:
   ```json
   {
     "emailConfigured": true,
     "googleSheetsConfigured": true
   }
   ```
3. Open: `http://localhost:3000/rq-preview.html`
4. Fill quiz and submit
5. Check:
   - ✅ Supabase table
   - ✅ Email inbox
   - ✅ Google Sheet

---

## Need Help?

See full troubleshooting guide in `docs/RQ_INTEGRATION_SETUP.md`
