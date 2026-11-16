import Link from "next/link";
import { ArrowLeft, Download, BookOpen } from "lucide-react";
import { getPreviewUrl, getDownloadUrl } from "@/lib/driveUrls";

interface Props { params: { fileId: string } }

export const metadata = { title: "Document Reader" };

export default function LibraryReaderPage({ params }: Props) {
  const { fileId } = params;
  const previewUrl = getPreviewUrl(fileId);
  const downloadUrl = getDownloadUrl(fileId);

  return (
    <div className="container-page py-4 md:py-6">
      {/* Compact floating toolbar */}
      <div className="sticky top-[3.75rem] md:top-[5.25rem] z-30 mb-3">
        <div className="glass flex items-center justify-between gap-2 rounded-2xl p-2 sm:p-2.5">
          <Link href="/library" className="btn-outline min-h-[44px] px-3 text-sm">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Library</span><span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium text-maroon">
            <BookOpen size={16} className="text-saffron-dark" />
            <span className="hidden sm:inline">Reader</span>
          </div>
          <a href={downloadUrl} className="btn-primary min-h-[44px] px-3 text-sm" target="_blank" rel="noopener noreferrer">
            <Download size={16} /> Download
          </a>
        </div>
      </div>

      {/* Full-bleed mobile-friendly reader */}
      <div className="card overflow-hidden border-amber-200/40 bg-white/90 p-1 sm:p-2">
        <div className="h-[calc(100dvh-220px)] min-h-[60vh] md:h-[calc(100dvh-230px)] w-full overflow-hidden rounded-xl bg-slate-100">
          <iframe
            src={previewUrl}
            title="Document preview"
            className="h-full w-full border-0"
            allow="autoplay"
          />
        </div>
      </div>
      <p className="mt-3 px-1 text-xs leading-relaxed text-slate-500">
        Preview provided by Google Drive. If the document does not display correctly, use the Download button.
      </p>
    </div>
  );
}
