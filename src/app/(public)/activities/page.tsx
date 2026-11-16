import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import ActivitiesGrid from "@/components/ActivitiesGrid";

export const metadata = { title: "Activities & Photo Gallery" };
export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  await connectToDatabase();
  const posts = await Post.find({ category: "activity", published: true }).sort({ createdAt: -1 }).lean();
  const items = JSON.parse(JSON.stringify(posts));

  return (
    <div className="container-page py-8 md:py-10">
      <ActivitiesGrid items={items} />
    </div>
  );
}
