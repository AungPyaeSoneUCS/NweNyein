/**
 * One-time helper to obtain a Google OAuth refresh token for Drive uploads.
 *
 * Usage:
 *   1. In Google Cloud Console -> APIs & Services -> Credentials:
 *      - Enable "Google Drive API"
 *      - Create an "OAuth client ID" (type: Web application)
 *      - Add Authorized redirect URI: http://localhost:3333/oauth2callback
 *   2. Put GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env.local
 *   3. Run: npm run google:auth
 *   4. Open the printed URL, sign in with the Google account that OWNS the Drive folders,
 *      approve access, and copy the printed refresh token into .env.local
 *      as GOOGLE_OAUTH_REFRESH_TOKEN.
 */
import { config as loadEnv } from "dotenv";
import http from "http";
import { URL } from "url";
import { google } from "googleapis";

// Load .env.local first (Next.js convention), then .env as a fallback.
loadEnv({ path: ".env.local" });
loadEnv();

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const port = Number(process.env.GOOGLE_OAUTH_PORT || 3333);
const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `http://localhost:${port}/oauth2callback`;

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive"],
});

console.log("\n1) Add this redirect URI to your OAuth client if not already added:\n   " + redirectUri);
console.log("\n2) Open this URL and authorize with the folder owner account:\n\n" + authUrl + "\n");
console.log(`Waiting for the OAuth callback on ${redirectUri} ...\n`);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "", redirectUri);
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404).end("Not found");
      return;
    }
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (error) {
      res.writeHead(400, { "Content-Type": "text/plain" }).end(`OAuth error: ${error}`);
      server.close();
      process.exit(1);
    }
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain" }).end("Missing code parameter");
      return;
    }

    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html" }).end(
      "<h2>Success</h2><p>You can close this window and return to the terminal.</p>"
    );

    console.log("\n=== COPY THIS INTO .env.local ===");
    console.log("GOOGLE_OAUTH_REFRESH_TOKEN=" + (tokens.refresh_token || "(no refresh token returned — revoke app access and retry with prompt=consent)"));
    console.log("================================\n");

    // Immediately verify the new grant can see the configured folders.
    try {
      oauth2.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: oauth2 });
      const about = await drive.about.get({ fields: "user(emailAddress)" });
      console.log("Acting as: " + (about.data.user?.emailAddress || "(unknown)"));
      const folders: Record<string, string | undefined> = {
        photos: process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID,
        songs: process.env.GOOGLE_DRIVE_SONGS_FOLDER_ID,
        books: process.env.GOOGLE_DRIVE_BOOKS_FOLDER_ID,
      };
      let issues = 0;
      for (const [name, id] of Object.entries(folders)) {
        if (!id) { console.log(`- ${name}: NOT SET`); issues++; continue; }
        try {
          const f = await drive.files.get({ fileId: id, fields: "id, name", supportsAllDrives: true });
          console.log(`- ${name}: OK (${f.data.name})`);
        } catch (e: any) {
          console.log(`- ${name}: FAILED — ${e?.message || e}`);
          issues++;
        }
      }
      if (issues > 0) {
        console.log(
          "\nSome folders are not visible to this Google account. Make sure you signed in with the account\n" +
            "that OWNS the folders (or share them with it), then re-run npm run google:auth.\n"
        );
      }
    } catch (e: any) {
      console.log("Verification skipped: " + (e?.message || e));
    }

    server.close();
    process.exit(0);
  } catch (err: any) {
    console.error("OAuth callback failed:", err?.message || err);
    res.writeHead(500).end("OAuth failed");
    server.close();
    process.exit(1);
  }
});

server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
