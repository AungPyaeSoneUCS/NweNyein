import { google } from "googleapis";
import { unstable_cache } from "next/cache";
import { Readable } from "stream";

import type { DriveFile } from "./driveUrls";

export type DriveFileType = "photos" | "songs" | "books";
export type { DriveFile };

type AuthMode = "oauth" | "service_account" | "none";

function getOAuthEnv() {
  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "",
  };
}

export function getAuthMode(): AuthMode {
  const oauth = getOAuthEnv();
  if (oauth.clientId && oauth.clientSecret && oauth.refreshToken) return "oauth";
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return "service_account";
  }
  return "none";
}

// Cache clients per process so OAuth access tokens are reused instead of
// requesting a new token on every Drive call.
let cachedOAuthClient: InstanceType<typeof google.auth.OAuth2> | null = null;
let cachedJwtClient: InstanceType<typeof google.auth.JWT> | null = null;

function getAuth(scopes: string[]) {
  const mode = getAuthMode();

  // Option 1: OAuth 2.0 user credentials (recommended for personal Google accounts / My Drive quota)
  if (mode === "oauth") {
    if (!cachedOAuthClient) {
      const { clientId, clientSecret, refreshToken } = getOAuthEnv();
      const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
      oauth2.setCredentials({ refresh_token: refreshToken });
      cachedOAuthClient = oauth2;
    }
    return cachedOAuthClient;
  }

  // Option 2: Service Account (works for Shared Drives; My Drive uploads may fail due to no quota)
  if (mode === "service_account") {
    if (!cachedJwtClient) {
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL as string;
      const privateKey = (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, "\n");
      cachedJwtClient = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes,
      });
    }
    return cachedJwtClient;
  }

  throw new Error(
    "Google Drive credentials are not configured. Provide either OAuth (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN) or Service Account (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)."
  );
}

function getDriveClient() {
  const auth = getAuth(["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/drive"]);
  return google.drive({ version: "v3", auth });
}

function getDriveWriteClient() {
  // Full drive scope required for uploads/deletes (My Drive with OAuth user or Shared Drives)
  const auth = getAuth(["https://www.googleapis.com/auth/drive"]);
  return google.drive({ version: "v3", auth });
}

/**
 * Live check of the configured Drive credentials. Never throws; returns a
 * diagnostic object so the admin UI / CLI can show exactly what is wrong.
 */
export async function verifyDriveAccess(): Promise<{
  ok: boolean;
  authMode: AuthMode;
  user: string | null;
  canUpload: boolean;
  folders: Record<DriveFileType, { id: string; ok: boolean; error?: string }>;
  error?: string;
}> {
  const authMode = getAuthMode();
  type FolderCheck = { id: string; ok: boolean; error?: string };
  const result: {
    ok: boolean;
    authMode: AuthMode;
    user: string | null;
    canUpload: boolean;
    folders: Record<DriveFileType, FolderCheck>;
    error?: string;
  } = {
    ok: false,
    authMode,
    user: null,
    canUpload: false,
    folders: {
      photos: { id: process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID || "", ok: false },
      songs: { id: process.env.GOOGLE_DRIVE_SONGS_FOLDER_ID || "", ok: false },
      books: { id: process.env.GOOGLE_DRIVE_BOOKS_FOLDER_ID || "", ok: false },
    },
    error: undefined,
  };

  if (authMode === "none") {
    result.error = "No Drive credentials configured (OAuth or Service Account).";
    return result;
  }

  try {
    const drive = getDriveWriteClient();

    // Identify the acting account (and confirm the token actually works).
    try {
      const about = await drive.about.get({ fields: "user(emailAddress)" });
      result.user = about.data.user?.emailAddress || null;
    } catch {
      // about.get needs a scope we may not have; token validity is proven below.
    }

    for (const type of ["photos", "songs", "books"] as DriveFileType[]) {
      const folderId = result.folders[type].id;
      if (!folderId) {
        result.folders[type].error = "Folder ID not set";
        continue;
      }
      try {
        await drive.files.get({
          fileId: folderId,
          fields: "id, name",
          supportsAllDrives: true,
        });
        result.folders[type].ok = true;
      } catch (e: any) {
        result.folders[type].error = e?.message || "Folder not accessible";
      }
    }

    result.canUpload = Object.values(result.folders).some((f) => f.ok);
    result.ok = result.canUpload;
    if (!result.ok) {
      result.error = "Credentials work but no configured folder is accessible.";
    }
  } catch (e: any) {
    result.error = e?.message || "Drive authentication failed";
  }

  return result;
}

export function getFolderId(type: DriveFileType): string {
  const map: Record<DriveFileType, string | undefined> = {
    photos: process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID,
    songs: process.env.GOOGLE_DRIVE_SONGS_FOLDER_ID,
    books: process.env.GOOGLE_DRIVE_BOOKS_FOLDER_ID,
  };
  const folderId = map[type];
  if (!folderId) {
    throw new Error(`Missing Google Drive folder ID for type: ${type}`);
  }
  return folderId;
}

export function getFolderIdSafe(type: DriveFileType): string | null {
  try {
    return getFolderId(type);
  } catch {
    return null;
  }
}

async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink)",
      orderBy: "name_natural",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const batch = (res.data.files || [])
      .filter((f) => f.id && f.name)
      .map((f) => ({
        id: f.id as string,
        name: f.name as string,
        mimeType: f.mimeType || "application/octet-stream",
        size: f.size || undefined,
        modifiedTime: f.modifiedTime || undefined,
        thumbnailLink: f.thumbnailLink || undefined,
      }));

    files.push(...batch);
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return files;
}

export async function getDriveFiles(type: DriveFileType): Promise<DriveFile[]> {
  const folderId = getFolderId(type);
  const cachedFetch = unstable_cache(
    async () => listFilesInFolder(folderId),
    ["drive-files", type, folderId],
    {
      revalidate: 3600,
      tags: ["drive-media", `drive-${type}`],
    }
  );
  return cachedFetch();
}

export async function getDriveFilesByFolderId(folderId: string): Promise<DriveFile[]> {
  const cachedFetch = unstable_cache(
    async () => listFilesInFolder(folderId),
    ["drive-folder", folderId],
    {
      revalidate: 3600,
      tags: ["drive-media", `drive-folder-${folderId}`],
    }
  );
  return cachedFetch();
}

export async function ensureDriveSubfolder(parentFolderId: string, name: string): Promise<string> {
  const drive = getDriveWriteClient();
  const safeName = name.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const found = existing.data.files?.[0]?.id;
  if (found) return found;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error("Failed to create subfolder");
  return created.data.id;
}

export async function uploadDriveFile(params: {
  folderType: DriveFileType;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  subfolderName?: string;
}): Promise<DriveFile & { parentFolderId?: string }> {
  const drive = getDriveWriteClient();
  const rootFolderId = getFolderId(params.folderType);
  const parentId = params.subfolderName
    ? await ensureDriveSubfolder(rootFolderId, params.subfolderName)
    : rootFolderId;

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [parentId],
    },
    media: {
      mimeType: params.mimeType || "application/octet-stream",
      body: Readable.from(params.buffer),
    },
    fields: "id, name, mimeType, size, modifiedTime, thumbnailLink",
    supportsAllDrives: true,
  });

  const file = res.data;
  if (!file.id || !file.name) throw new Error("Upload failed");

  // Make file readable via direct/preview URLs where folder permissions allow
  try {
    await drive.permissions.create({
      fileId: file.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
  } catch {
    // Ignore if permission already set or not allowed by org policy; folder sharing may suffice
  }

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType || params.mimeType || "application/octet-stream",
    size: file.size || undefined,
    modifiedTime: file.modifiedTime || undefined,
    thumbnailLink: file.thumbnailLink || undefined,
    parentFolderId: parentId,
  };
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getDriveWriteClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

export function getDriveConfigStatus() {
  const oauth = getOAuthEnv();
  const oauthConfigured = !!(oauth.clientId && oauth.clientSecret && oauth.refreshToken);
  const serviceAccountConfigured = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
  );
  return {
    authMode: getAuthMode(),
    oauthConfigured,
    serviceAccountConfigured,
    // True when OAuth is only partially filled in (a common cause of silent fallback)
    oauthPartial:
      (!!oauth.clientId || !!oauth.clientSecret || !!oauth.refreshToken) && !oauthConfigured,
    folders: {
      photos: process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID || "",
      songs: process.env.GOOGLE_DRIVE_SONGS_FOLDER_ID || "",
      books: process.env.GOOGLE_DRIVE_BOOKS_FOLDER_ID || "",
    },
  };
}

export { getPhotoUrl, getAudioUrl, getPreviewUrl, getDownloadUrl, formatFileSize, getFileBadge } from "./driveUrls";
