import connectToDatabase from "./mongodb";
import MediaMeta, { type MediaKind } from "@/models/MediaMeta";

/**
 * Drive file id -> cover image id, for per-track / per-document thumbnails
 * chosen in the admin "choose from Drive" picker.
 *
 * Never throws: if the database is unreachable we simply render without
 * custom thumbnails instead of breaking the Songs / Library pages.
 */
export async function getMediaCovers(kind: MediaKind): Promise<Record<string, string>> {
  try {
    await connectToDatabase();
    const items = await MediaMeta.find({
      kind,
      coverImageDriveId: { $exists: true, $nin: [null, ""] },
    })
      .select("fileId coverImageDriveId")
      .lean();

    const covers: Record<string, string> = {};
    for (const item of items) {
      if (item.fileId && item.coverImageDriveId) covers[item.fileId] = item.coverImageDriveId;
    }
    return covers;
  } catch (error) {
    console.error("[mediaMeta] Failed to load covers:", error);
    return {};
  }
}
