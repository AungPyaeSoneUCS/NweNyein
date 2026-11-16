import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import PostCard from "@/components/PostCard";
import FadeIn from "@/components/motion/FadeIn";
import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";

export const metadata = { title: "Activities & Photo Gallery" };
export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  await connectToDatabase();
  const posts = await Post.find({ category: "activity", published: true }).sort({ createdAt: -1 }).lean();
  const items = JSON.parse(JSON.stringify(posts));

  return (
    <div className="container-page py-10 md:py-14">
      <FadeIn className="mb-8 max-w-3xl">
        <span className="inline-flex rounded-full bg-orange-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-900">Community</span>
        <h1 className="mt-3 text-3xl md:text-4xl leading-tight">Activities & Photo Gallery</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Reports and photo galleries from monastery events, ceremonies, and compassionate community service.
        </p>
      </FadeIn>
      {items.length > 0 ? (
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {items.map((p: any) => (
            <StaggerItem key={p._id}><PostCard {...p} /></StaggerItem>
          ))}
        </StaggerGrid>
      ) : (
        <div className="card p-8 text-slate-600">No activities published yet.</div>
      )}
    </div>
  );
}
