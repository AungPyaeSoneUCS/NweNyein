import { NextRequest } from "next/server";
import { Readable } from "stream";
import { openDriveAudioStream } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Streaming a full track can take a while on slow connections.
export const maxDuration = 60;

// Google Drive file ids are long URL-safe base64-ish strings.
const FILE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,}$/;

function buildHeaders(media: Awaited<ReturnType<typeof openDriveAudioStream>>) {
  const headers = new Headers();
  headers.set("Content-Type", media.mimeType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(media.name)}`
  );
  if (media.contentRange) headers.set("Content-Range", media.contentRange);
  if (media.contentLength) headers.set("Content-Length", media.contentLength);
  return headers;
}

/**
 * Streams an audio file from the Google Drive Songs folder through our own
 * origin. Direct Google URLs never play in Chrome (ERR_BLOCKED_BY_ORB).
 *
 * GET /api/audio/[fileId]   (supports Range requests)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const fileId = params.fileId;
  if (!FILE_ID_PATTERN.test(fileId)) {
    return new Response("Invalid file id", { status: 400 });
  }

  try {
    const media = await openDriveAudioStream(fileId, req.headers.get("range"));

    if (!media.stream) {
      return new Response("Audio unavailable", { status: media.status || 502 });
    }

    const body = Readable.toWeb(media.stream) as unknown as ReadableStream;

    // Stop pulling from Drive if the browser seeks away / closes the player.
    req.signal.addEventListener("abort", () => {
      try {
        media.stream?.destroy();
      } catch {
        // already closed
      }
    });

    return new Response(body, {
      status: media.status === 206 ? 206 : 200,
      headers: buildHeaders(media),
    });
  } catch (error: any) {
    const status = error?.status === 403 ? 403 : error?.code === 404 ? 404 : 502;
    console.error("GET /api/audio error", error?.message || error);
    return new Response("Audio unavailable", { status });
  }
}

/** Some players probe with HEAD before streaming. */
export async function HEAD(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const fileId = params.fileId;
  if (!FILE_ID_PATTERN.test(fileId)) {
    return new Response(null, { status: 400 });
  }

  try {
    const media = await openDriveAudioStream(fileId, req.headers.get("range"));
    const headers = buildHeaders(media);
    if (media.stream) {
      // Discard the body – this request only needs metadata.
      media.stream.destroy();
    }
    return new Response(null, { status: media.status >= 400 ? media.status : 200, headers });
  } catch (error: any) {
    const status = error?.status === 403 ? 403 : error?.code === 404 ? 404 : 502;
    return new Response(null, { status });
  }
}
