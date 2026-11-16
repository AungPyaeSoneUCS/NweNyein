/**
 * Verify the configured Google Drive credentials without starting Next.js.
 *
 * Usage:
 *   npm run google:check
 *
 * Prints the active auth mode (oauth / service_account), the acting account,
 * and whether each configured folder is reachable + writable.
 */
import { config as loadEnv } from "dotenv";
import { google } from "googleapis";

// Load .env.local first (Next.js convention), then .env as a fallback.
loadEnv({ path: ".env.local" });
loadEnv();

const hasOAuth = !!(
  process.env.GOOGLE_OAUTH_CLIENT_ID &&
  process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN
);
const hasServiceAccount = !!(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
);

const mode = hasOAuth ? "oauth" : hasServiceAccount ? "service_account" : "none";

const folders: Record<string, string | undefined> = {
  photos: process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID,
  songs: process.env.GOOGLE_DRIVE_SONGS_FOLDER_ID,
  books: process.env.GOOGLE_DRIVE_BOOKS_FOLDER_ID,
};

function buildAuth() {
  if (mode === "oauth") {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    return oauth2;
  }
  if (mode === "service_account") {
    return new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
  }
  return null;
}

async function main() {
  console.log("\nGoogle Drive diagnostics");
  console.log("========================");
  console.log(`Auth mode: ${mode}`);

  if (mode === "none") {
    console.error(
      "\nNo credentials found. Set OAuth (GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN) or Service Account (GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_PRIVATE_KEY) in .env.local.\n"
    );
    process.exit(1);
  }

  const auth = buildAuth()!;
  const drive = google.drive({ version: "v3", auth });

  try {
    const about = await drive.about.get({ fields: "user(emailAddress, displayName)" });
    console.log(`Acting as: ${about.data.user?.emailAddress || "(unknown)"} ${about.data.user?.displayName ? `(${about.data.user.displayName})` : ""}`);
  } catch (e: any) {
    console.warn(`Could not read account identity: ${e?.message || e}`);
  }

  let failures = 0;

  for (const [name, id] of Object.entries(folders)) {
    if (!id) {
      console.log(`- ${name}: NOT SET (missing folder id)`);
      failures++;
      continue;
    }
    try {
      const res = await drive.files.get({
        fileId: id,
        fields: "id, name, capabilities(canAddChildren, canEdit)",
        supportsAllDrives: true,
      });
      const caps = res.data.capabilities;
      const canWrite = !!(caps?.canAddChildren || caps?.canEdit);
      console.log(`- ${name}: OK (${res.data.name || id}) — write: ${canWrite ? "yes" : "no"}`);
      if (!canWrite) failures++;
    } catch (e: any) {
      console.log(`- ${name}: FAILED — ${e?.message || e}`);
      failures++;
    }
  }

  if (mode === "service_account" && failures > 0) {
    console.log(
      "\nNote: service accounts have no My Drive storage quota. Uploads to a personal My Drive folder will fail with\n" +
        '"Service Accounts do not have storage quota". Configure OAuth (npm run google:auth) or use a Shared Drive.\n'
    );
  }

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} issue(s) found.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Diagnostics crashed:", e?.message || e);
  process.exit(1);
});
