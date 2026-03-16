/**
 * Google Sheets Integration
 * Appends RQ submission data to a Google Sheet
 */

import type { SubmissionPayload } from "@/app/api/rq-submissions/types";

type GoogleSheetsConfig = {
  spreadsheetId: string;
  sheetName: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
};

type GoogleSheetsResult = {
  attempted: boolean;
  success: boolean;
  reason?: string;
  updatedRange?: string;
};

/**
 * Get Google Sheets configuration from environment variables
 */
function getGoogleSheetsConfig(): GoogleSheetsConfig | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME ?? "RQ Submissions";
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    spreadsheetId,
    sheetName,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"), // Fix escaped newlines
    },
  };
}

/**
 * Generate JWT token for Google Sheets API authentication
 */
async function generateJWT(
  clientEmail: string,
  privateKey: string,
  scopes: string[],
): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600, // 1 hour
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Import private key for signing
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signatureInput),
  );

  const encodedSignature = base64UrlEncode(signature);
  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Get access token from Google OAuth
 */
async function getAccessToken(
  clientEmail: string,
  privateKey: string,
): Promise<string> {
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  const jwt = await generateJWT(clientEmail, privateKey, scopes);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Append a row to Google Sheets
 */
async function appendToSheet(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string,
  values: string[][],
): Promise<string> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to append to sheet: ${error}`);
  }

  const data = (await response.json()) as { updates?: { updatedRange?: string } };
  return data.updates?.updatedRange ?? "Unknown range";
}

/**
 * Convert submission payload to spreadsheet row
 */
function payloadToRow(payload: SubmissionPayload): string[] {
  const basics = payload.basics ?? {};
  const result = payload.result ?? {};
  const clarity = result.clarity ?? {};
  const answers = payload.answers ?? {};

  return [
    new Date().toISOString(), // Timestamp
    basics.type ?? "", // Creator or Brand
    basics.first ?? "", // First name
    basics.last ?? "", // Last name
    basics.email ?? "", // Email
    basics.org ?? "", // Organization
    basics.role ?? "", // Role
    basics.industry ?? "", // Industry
    basics.website ?? "", // Website
    result.rq ?? "", // RQ Code
    result.rqName ?? "", // RQ Name
    clarity.label ?? "", // Signal Clarity
    result.undertone ?? "", // Undertone
    payload.source ?? "", // Source
    payload.meta?.pageUrl ?? "", // Page URL
    JSON.stringify(answers), // Raw answers (JSON)
  ];
}

/**
 * Main function to append RQ submission to Google Sheets
 */
export async function appendRQSubmissionToSheet(
  payload: SubmissionPayload,
): Promise<GoogleSheetsResult> {
  const config = getGoogleSheetsConfig();

  if (!config) {
    return {
      attempted: false,
      success: false,
      reason: "Google Sheets is not configured.",
    };
  }

  try {
    // Get access token
    const accessToken = await getAccessToken(
      config.credentials.client_email,
      config.credentials.private_key,
    );

    // Convert payload to row
    const row = payloadToRow(payload);

    // Append to sheet
    const updatedRange = await appendToSheet(
      config.spreadsheetId,
      config.sheetName,
      accessToken,
      [row],
    );

    return {
      attempted: true,
      success: true,
      updatedRange,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Google Sheets append failed:", errorMessage);

    return {
      attempted: true,
      success: false,
      reason: errorMessage,
    };
  }
}

// Utility functions

function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string;

  if (typeof data === "string") {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    base64 = btoa(String.fromCharCode(...bytes));
  }

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}
