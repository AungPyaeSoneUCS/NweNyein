export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  /** Direct parent folder IDs from Drive. */
  parents?: string[];
}

export function extractDriveId(input: string): string {
  const value = (input || "").trim();
  if (!value) return "";
  // If it's already likely an ID (no slashes/scheme, reasonable chars), return as-is
  if (!/^https?:\/\//i.test(value) && !value.includes("/") && !value.includes("?")) {
    return value;
  }
  try {
    const url = new URL(value);
    // /file/d/{id}/..., /folders/{id}, /drive/folders/{id}
    const pathMatch = url.pathname.match(/\/(?:file\/d|folders|drive\/folders|uc)\/([a-zA-Z0-9_-]+)/);
    if (pathMatch?.[1]) return pathMatch[1];
    // ?id={id} or &id={id}
    const idParam = url.searchParams.get("id");
    if (idParam) return idParam;
  } catch {
    // fallback regex on raw string
  }
  const regexes = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const re of regexes) {
    const m = value.match(re);
    if (m?.[1]) return m[1];
  }
  return value;
}

export function getPhotoUrl(fileId: string) {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export function getAudioUrl(fileId: string) {
  // Streamed through our own origin: Google's public Drive URLs are blocked by
  // Chrome (net::ERR_BLOCKED_BY_ORB) and cannot be used as an <audio> source.
  return `/api/audio/${fileId}`;
}

export function getPreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function getDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function formatFileSize(bytes?: string): string {
  if (!bytes) return "";
  const n = Number(bytes);
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function getFileBadge(mimeType: string, name: string): string {
  const lower = name.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "PDF";
  if (lower.endsWith(".docx") || mimeType.includes("wordprocessingml")) return "DOCX";
  if (lower.endsWith(".doc") || mimeType === "application/msword") return "DOC";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType.startsWith("image/")) return "IMAGE";
  return "FILE";
}
