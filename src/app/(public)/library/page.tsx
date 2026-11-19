import { getDriveTree } from "@/lib/googleDrive";
import { getMediaCovers } from "@/lib/mediaMeta";
import LibraryGrid from "@/components/LibraryGrid";
import type { DriveTree } from "@/lib/driveTree";

export const metadata = { title: "E-Book & Document Library" };
// Drive listings are cached inside getDriveFiles(); render dynamically so a
// transient Drive/auth error is never baked into a cached page.
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  let tree: DriveTree | null = null;
  let error: string | null = null;
  try {
    tree = await getDriveTree("books");
  } catch (e) {
    console.error(e);
    error = "The library is temporarily unavailable. Please try again in a moment.";
  }

  // Thumbnails are optional: getMediaCovers never throws.
  const covers = error ? {} : await getMediaCovers("books");

  return (
    <div className="container-page py-8 md:py-10">
      {error || !tree ? (
        <div className="card border-red-200/60 bg-red-50/70 p-6 text-red-700">
          {error || "The library is temporarily unavailable. Please try again in a moment."}
        </div>
      ) : (
        <LibraryGrid tree={tree} covers={covers} />
      )}
    </div>
  );
}
