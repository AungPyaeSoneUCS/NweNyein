import { Suspense } from "react";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import KnowledgeList from "@/components/KnowledgeList";
import FadeIn from "@/components/motion/FadeIn";

export const metadata = { title: "Knowledge & Dhamma Teachings" };
export const dynamic = "force-dynamic";

async function getKnowledgePosts() {
  await connectToDatabase();
  const posts = await Post.find({ category: "knowledge", published: true })
    .sort({ createdAt: -1 })
    .lean();
  return JSON.parse(JSON.stringify(posts));
}

export default async function KnowledgePage() {
  const posts = await getKnowledgePosts();
  return (
    <div className="container-page py-10 md:py-14">
      <FadeIn className="mb-8 max-w-3xl">
        <span className="inline-flex rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">Teachings</span>
        <h1 className="mt-3 text-3xl md:text-4xl leading-tight">Knowledge & Dhamma Teachings</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Search and explore Dhamma talks, reflections, and teachings shared by the Sayadaws and community.
        </p>
      </FadeIn>
      <Suspense fallback={<div className="card p-8 text-slate-600">Loading teachings...</div>}>
        <KnowledgeList posts={posts} />
      </Suspense>
    </div>
  );
}
