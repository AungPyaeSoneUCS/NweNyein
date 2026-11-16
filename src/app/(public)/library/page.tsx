import { getDriveFiles } from "@/lib/googleDrive";
import LibraryGrid from "@/components/LibraryGrid";

export const metadata = { title: "E-Book & Document Library" };
// Drive listings are cached inside getDriveFiles(); render dynamically so a
// transient Drive/auth error is never baked into a cached page.
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  let files: any[] = [];
  let error: string | null = null;
  try {
    files = await getDriveFiles("books");
  } catch (e) {
    console.error(e);
    error = "The library is temporarily unavailable. Please try again in a moment.";
  }

  return (
    <div className="container-page py-8 md:py-10">
      {error ? (
        <div className="card border-red-200/60 bg-red-50/70 p-6 text-red-700">{error}</div>
      ) : (
        <LibraryGrid files={files} />
      )}
    </div>
  );
}
