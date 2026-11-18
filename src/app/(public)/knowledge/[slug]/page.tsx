import { notFound } from "next/navigation";
import Image from "next/image";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import { formatDate } from "@/lib/utils";
import { getPhotoUrl } from "@/lib/driveUrls";
import FadeIn from "@/components/motion/FadeIn";
import { CalendarDays, UserRound } from "lucide-react";

interface Props { params: { slug: string } }

// Detail pages must always read the live DB so new/edited posts resolve immediately.
export const dynamic = "force-dynamic";

function getSlugCandidates(slug: string) {
  const candidates = new Set<string>();
  const add = (value: string) => {
    const v = (value || "").trim();
    if (!v) return;
    candidates.add(v);
    try { candidates.add(v.normalize("NFC")); } catch {}
    try { candidates.add(v.normalize("NFD")); } catch {}
    try { candidates.add(encodeURIComponent(v)); } catch {}
    try { candidates.add(decodeURIComponent(v)); } catch {}
  };

  add(slug);
  try { add(decodeURIComponent(slug)); } catch {}
  try { add(decodeURIComponent(decodeURIComponent(slug))); } catch {}

  return Array.from(candidates).filter(Boolean);
}

async function findKnowledgePost(slug: string) {
  await connectToDatabase();
  const candidates = getSlugCandidates(slug);
  return Post.findOne({
    category: "knowledge",
    published: true,
    slug: { $in: candidates },
  }).lean();
}

export async function generateMetadata({ params }: Props) {
  const post = await findKnowledgePost(params.slug);
  if (!post) return { title: "Not found" };
  return { title: post.title, description: post.author ? `By ${post.author}` : undefined };
}

export default async function KnowledgeDetailPage({ params }: Props) {
  const post = await findKnowledgePost(params.slug);
  if (!post) notFound();

  return (
    <article className="container-page py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <FadeIn>
          <span className="inline-flex rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">Read & Dhamma Teachings</span>
          <h1 className="mt-4 text-3xl md:text-4xl leading-tight font-myanmar">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            {post.author && <span className="inline-flex items-center gap-1.5"><UserRound size={15} /> {post.author}</span>}
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} /> <time dateTime={new Date(post.createdAt).toISOString()}>{formatDate(post.createdAt)}</time></span>
          </div>
        </FadeIn>

        {post.coverImageDriveId && (
          <FadeIn delay={0.05} className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-amber-900/10 bg-maroon/5 shadow-sm">
            <Image src={getPhotoUrl(post.coverImageDriveId)} alt={post.title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 768px" />
          </FadeIn>
        )}

        <FadeIn delay={0.1} className="card mt-8 p-6 sm:p-8 md:p-10">
          <div className="prose-content font-myanmar" dangerouslySetInnerHTML={{ __html: post.content }} />
        </FadeIn>
      </div>
    </article>
  );
}
