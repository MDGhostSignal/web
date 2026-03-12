/**
 * Google Sheets Webhook Integration (Apps Script)
 * Posts RQ submission data to Google Apps Script webhook
 */

import type { SubmissionPayload } from "@/app/api/rq-submissions/types";

type GoogleSheetsWebhookResult = {
  attempted: boolean;
  success: boolean;
  reason?: string;
  row?: number;
};

/**
 * Post RQ submission to Google Sheets via Apps Script webhook
 */
export async function postToGoogleSheetsWebhook(
  payload: SubmissionPayload,
): Promise<GoogleSheetsWebhookResult> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      attempted: false,
      success: false,
      reason: "Google Sheets webhook URL is not configured.",
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook request failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as { success?: boolean; row?: number; error?: string };

    if (result.success) {
      return {
        attempted: true,
        success: true,
        row: result.row,
      };
    } else {
      return {
        attempted: true,
        success: false,
        reason: result.error || "Unknown error from webhook",
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Google Sheets webhook failed:", errorMessage);

    return {
      attempted: true,
      success: false,
      reason: errorMessage,
    };
  }
}
