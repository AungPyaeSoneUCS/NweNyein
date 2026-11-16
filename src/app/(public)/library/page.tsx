import Link from "next/link";
import { getDriveFiles, formatFileSize, getFileBadge } from "@/lib/googleDrive";
import { getDownloadUrl } from "@/lib/driveUrls";
import { BookOpen, FileText, Download, BookOpenCheck } from "lucide-react";
import FadeIn from "@/components/motion/FadeIn";
import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";

export const metadata = { title: "E-Book & Document Library" };
export const revalidate = 3600;

export default async function LibraryPage() {
  let files: any[] = [];
  let error: string | null = null;
  try {
    files = await getDriveFiles("books");
  } catch (e) {
    console.error(e);
    error = "Unable to load library at the moment. Please check Google Drive configuration.";
  }

  return (
    <div className="container-page py-10 md:py-14">
      <FadeIn className="mb-8 max-w-3xl">
        <span className="inline-flex rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">Digital Library</span>
        <h1 className="mt-3 text-3xl md:text-4xl leading-tight">E-Book & Document Library</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Read and download Dhamma books and documents in PDF and Word formats on any device.
        </p>
      </FadeIn>

      {error ? (
        <div className="card border-red-200/60 bg-red-50/70 p-6 text-red-700">{error}</div>
      ) : files.length > 0 ? (
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {files.map((file) => {
            const badge = getFileBadge(file.mimeType, file.name);
            const title = file.name.replace(/\.[^/.]+$/, "");
            return (
              <StaggerItem key={file.id}>
                <div className="card flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-saffron/10 text-saffron-dark">
                      {badge === "PDF" ? <BookOpen size={22} /> : <FileText size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-snug text-maroon break-words">{title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-maroon/10 px-2.5 py-1 font-semibold text-maroon">{badge}</span>
                        {file.size && <span className="text-slate-500">{formatFileSize(file.size)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-5 grid grid-cols-2 gap-2">
                    <Link href={`/library/${file.id}`} className="btn-primary text-sm">
                      <BookOpenCheck size={16} /> Read
                    </Link>
                    <a href={getDownloadUrl(file.id)} className="btn-outline text-sm" target="_blank" rel="noopener noreferrer">
                      <Download size={16} /> Download
                    </a>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
      ) : (
        <div className="card p-8 text-slate-600">No documents available in the library yet.</div>
      )}
    </div>
  );
}
