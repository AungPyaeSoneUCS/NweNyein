import { getDriveTree } from "@/lib/googleDrive";
import { getMediaCovers } from "@/lib/mediaMeta";
import SongsBrowser from "@/components/SongsBrowser";
import type { DriveTree } from "@/lib/driveTree";

export const metadata = { title: "Dhamma Songs & Chants" };
// Drive listings are cached inside getDriveFiles(); render dynamically so a
// transient Drive/auth error is never baked into a cached page.
export const dynamic = "force-dynamic";

export default async function SongsPage() {
  let tree: DriveTree | null = null;
  let error: string | null = null;
  try {
    tree = await getDriveTree("songs");
  } catch (e) {
    console.error(e);
    error = "Songs are temporarily unavailable. Please try again in a moment.";
  }

  // Thumbnails are optional: getMediaCovers never throws.
  const covers = error ? {} : await getMediaCovers("songs");

  return (
    <div className="container-page py-8 md:py-10">
      {error || !tree ? (
        <div className="card border-red-200/60 bg-red-50/70 p-6 text-red-700">
          {error || "Songs are temporarily unavailable. Please try again in a moment."}
        </div>
      ) : (
        <SongsBrowser tree={tree} covers={covers} />
      )}
    </div>
  );
}
