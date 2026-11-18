import { Suspense } from "react";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import KnowledgeList from "@/components/KnowledgeList";

export const metadata = { title: "Read & Dhamma Teachings" };
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
    <div className="container-page py-8 md:py-10">
      <Suspense fallback={<div className="card p-8 text-slate-600">Loading teachings...</div>}>
        <KnowledgeList posts={posts} />
      </Suspense>
    </div>
  );
}
