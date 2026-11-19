import { google } from "googleapis";
import { unstable_cache } from "next/cache";
import { Readable } from "stream";

import type { DriveFile } from "./driveUrls";
import { buildDriveTree, DRIVE_FOLDER_MIME, type DriveTree } from "./driveTree";

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

// When OAuth credentials are present but broken (e.g. invalid_client), we
// temporarily fall back to the service account instead of failing the page.
const OAUTH_RETRY_MS = 60_000;
let oauthFailedAt = 0;

export function hasServiceAccountCredentials() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

/** True while OAuth is broken and the service-account fallback is in use. */
export function isDriveOAuthFallbackActive() {
  return !!oauthFailedAt && Date.now() - oauthFailedAt < OAUTH_RETRY_MS;
}

function getOAuthClient() {
  if (!cachedOAuthClient) {
    const { clientId, clientSecret, refreshToken } = getOAuthEnv();
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    cachedOAuthClient = oauth2;
  }
  return cachedOAuthClient;
}

function getServiceAccountAuth(scopes: string[]) {
  if (!hasServiceAccountCredentials()) {
    throw new Error(
      "Google Drive credentials are not configured. Provide either OAuth (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN) or Service Account (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)."
    );
  }
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

async function getAuth(scopes: string[]) {
  const mode = getAuthMode();

  // Option 1: OAuth 2.0 user credentials (recommended for personal Google accounts / My Drive quota)
  if (mode === "oauth") {
    // Skip OAuth for a short while if it recently failed and we have a fallback.
    if (isDriveOAuthFallbackActive() && hasServiceAccountCredentials()) {
      return getServiceAccountAuth(scopes);
    }

    const oauth2 = getOAuthClient();
    try {
      // Forces a refresh only when the cached access token is missing/expired.
      await oauth2.getAccessToken();
      oauthFailedAt = 0;
      return oauth2;
    } catch (e: any) {
      const message = e?.response?.data?.error_description || e?.message || "OAuth token refresh failed";
      if (hasServiceAccountCredentials()) {
        oauthFailedAt = Date.now();
        console.warn(
          `[googleDrive] OAuth unavailable (${message}); falling back to service account for the next ${Math.round(OAUTH_RETRY_MS / 1000)}s.`
        );
        return getServiceAccountAuth(scopes);
      }
      console.error(`[googleDrive] OAuth unavailable (${message}) and no service account fallback configured.`);
      throw e;
    }
  }

  // Option 2: Service Account (works for Shared Drives; My Drive uploads may fail due to no quota)
  return getServiceAccountAuth(scopes);
}

async function getDriveClient() {
  const auth = await getAuth(["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/drive"]);
  return google.drive({ version: "v3", auth });
}

async function getDriveWriteClient() {
  // Full drive scope required for uploads/deletes (My Drive with OAuth user or Shared Drives)
  const auth = await getAuth(["https://www.googleapis.com/auth/drive"]);
  return google.drive({ version: "v3", auth });
}

/**
 * Live check of the configured Drive credentials. Never throws; returns a
 * diagnostic object so the admin UI / CLI can show exactly what is wrong.
 */
export async function verifyDriveAccess(): Promise<{
  ok: boolean;
  authMode: AuthMode;
  fallbackActive: boolean;
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
    fallbackActive: boolean;
    user: string | null;
    canUpload: boolean;
    folders: Record<DriveFileType, FolderCheck>;
    error?: string;
  } = {
    ok: false,
    authMode,
    fallbackActive: false,
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
    const drive = await getDriveWriteClient();
    result.fallbackActive = isDriveOAuthFallbackActive();

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
  const drive = await getDriveClient();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, parents)",
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
        parents: f.parents || undefined,
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

/**
 * Lists a folder and every descendant folder, keeping the direct parent IDs so
 * the caller can rebuild the parent-to-child collection tree.
 */
async function listDriveTree(rootFolderId: string): Promise<DriveFile[]> {
  const drive = await getDriveClient();
  const queue = [rootFolderId];
  const visitedFolders = new Set<string>();
  const entries: DriveFile[] = [];

  while (queue.length) {
    const folderId = queue.shift()!;
    if (!folderId || visitedFolders.has(folderId)) continue;
    visitedFolders.add(folderId);

    let pageToken: string | undefined;
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields:
          "nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, parents)",
        orderBy: "folder,name_natural",
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      for (const file of res.data.files || []) {
        if (!file.id || !file.name) continue;
        const entry: DriveFile = {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType || "application/octet-stream",
          size: file.size || undefined,
          modifiedTime: file.modifiedTime || undefined,
          thumbnailLink: file.thumbnailLink || undefined,
          parents: file.parents || undefined,
        };
        entries.push(entry);
        if (entry.mimeType === DRIVE_FOLDER_MIME) queue.push(entry.id);
      }
      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);
  }

  return entries;
}

/** Recursive folder tree for books, songs, or any other Drive-backed collection. */
export async function getDriveTree(type: DriveFileType): Promise<DriveTree> {
  const folderId = getFolderId(type);
  const cachedFetch = unstable_cache(
    async () => buildDriveTree(folderId, await listDriveTree(folderId)),
    ["drive-tree", type, folderId],
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
  const drive = await getDriveWriteClient();
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
  const drive = await getDriveWriteClient();
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
  const drive = await getDriveWriteClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

export interface DriveAudioStream {
  name: string;
  mimeType: string;
  size?: number;
  /** 200 or 206 (partial content). */
  status: number;
  /** null when Drive returned an error status. */
  stream: Readable | null;
  contentRange?: string;
  contentLength?: string;
}

/**
 * Opens an authenticated audio stream for a file in the Songs folder.
 *
 * Google Drive's public `uc?export=...` URLs are blocked by Chrome's Opaque
 * Response Blocking (net::ERR_BLOCKED_BY_ORB) when used as an <audio> source,
 * so playback goes through /api/audio/[fileId] instead. Forwarding the Range
 * header keeps seeking and partial buffering working.
 */
/** True when a file is in the folder or any nested singer/album subfolder. */
async function isInsideDriveFolder(
  drive: Awaited<ReturnType<typeof getDriveClient>>,
  directParents: string[],
  rootFolderId: string
): Promise<boolean> {
  const queue = [...directParents];
  const seen = new Set<string>();

  while (queue.length) {
    const folderId = queue.shift()!;
    if (!folderId || seen.has(folderId)) continue;
    if (folderId === rootFolderId) return true;
    seen.add(folderId);

    try {
      const folder = await drive.files.get({
        fileId: folderId,
        fields: "id, parents",
        supportsAllDrives: true,
      });
      queue.push(...(folder.data.parents || []));
    } catch {
      // Keep walking the other ancestors if one folder cannot be read.
    }
  }

  return false;
}

export async function openDriveAudioStream(
  fileId: string,
  rangeHeader?: string | null
): Promise<DriveAudioStream> {
  const drive = await getDriveClient();

  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, parents",
    supportsAllDrives: true,
  });

  const songsFolderId = getFolderIdSafe("songs");
  const parents = meta.data.parents || [];
  if (!songsFolderId || !(await isInsideDriveFolder(drive, parents, songsFolderId))) {
    const error = new Error("This file is not in the Songs folder.") as Error & { status?: number };
    error.status = 403;
    throw error;
  }

  const media: any = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true, acknowledgeAbuse: true },
    {
      responseType: "stream",
      headers: rangeHeader ? { Range: rangeHeader } : undefined,
      validateStatus: () => true,
    }
  );

  const headers = media.headers || {};
  const headerValue = (name: string): string | undefined => {
    const value = typeof headers.get === "function" ? headers.get(name) : headers[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  return {
    name: meta.data.name || "audio",
    mimeType: meta.data.mimeType || "audio/mpeg",
    size: meta.data.size ? Number(meta.data.size) : undefined,
    status: typeof media.status === "number" ? media.status : 200,
    stream: media.status >= 400 ? null : (media.data as Readable),
    contentRange: headerValue("content-range"),
    contentLength: headerValue("content-length"),
  };
}

export type DriveImageScope = "photos" | "all";

export interface DriveImageFile extends DriveFile {
  /** Name of the Drive folder the image lives in (nice for the picker UI). */
  folderName?: string;
}

/**
 * Lists image files for the admin "choose from Drive" picker.
 *
 * - scope "photos": walks the configured Photos folder (including album
 *   subfolders) so event albums are selectable too.
 * - scope "all": every image the connected account can read.
 */
export async function listDriveImages(options?: {
  scope?: DriveImageScope;
  folderId?: string;
  max?: number;
}): Promise<DriveImageFile[]> {
  const drive = await getDriveClient();
  const scope = options?.scope ?? "photos";
  const max = Math.min(options?.max ?? 300, 500);

  const toImage = (file: any, folderName?: string): DriveImageFile => ({
    id: file.id as string,
    name: file.name as string,
    mimeType: file.mimeType || "image/jpeg",
    size: file.size || undefined,
    modifiedTime: file.modifiedTime || undefined,
    thumbnailLink: file.thumbnailLink || undefined,
    folderName,
  });

  if (scope === "all") {
    const res = await drive.files.list({
      q: "mimeType contains 'image/' and trashed = false",
      fields: "files(id, name, mimeType, size, modifiedTime, thumbnailLink)",
      orderBy: "modifiedTime desc",
      pageSize: max,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    return (res.data.files || [])
      .filter((f) => f.id && f.name)
      .map((f) => toImage(f))
      .slice(0, max);
  }

  const rootId = options?.folderId || getFolderId("photos");
  const queue: { id: string; name: string; depth: number }[] = [{ id: rootId, name: "", depth: 0 }];
  const seen = new Set<string>();
  const results: DriveImageFile[] = [];

  while (queue.length && results.length < max) {
    const folder = queue.shift()!;
    if (!folder.id || seen.has(folder.id)) continue;
    seen.add(folder.id);

    const images = await drive.files.list({
      q: `'${folder.id}' in parents and trashed = false and mimeType contains 'image/'`,
      fields: "files(id, name, mimeType, size, modifiedTime, thumbnailLink)",
      orderBy: "modifiedTime desc",
      pageSize: Math.min(200, max - results.length),
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const file of images.data.files || []) {
      if (!file.id || !file.name || seen.has(file.id)) continue;
      seen.add(file.id);
      results.push(toImage(file, folder.name || undefined));
      if (results.length >= max) break;
    }

    // Album subfolders (max depth 3) are browsable as well.
    if (folder.depth < 3) {
      const subfolders = await drive.files.list({
        q: `'${folder.id}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
        fields: "files(id, name)",
        orderBy: "name_natural",
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      for (const sub of subfolders.data.files || []) {
        if (sub.id && sub.name) queue.push({ id: sub.id, name: sub.name, depth: folder.depth + 1 });
      }
    }
  }

  return results
    .sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""))
    .slice(0, max);
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
    // True while OAuth failed and reads are being served by the service account.
    fallbackActive: isDriveOAuthFallbackActive(),
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
