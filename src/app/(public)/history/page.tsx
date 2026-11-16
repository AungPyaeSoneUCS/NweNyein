import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import HistoryTimeline from "@/components/HistoryTimeline";

export const metadata = { title: "Monastery History" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  await connectToDatabase();
  const posts = await Post.find({ category: "history", published: true }).sort({ createdAt: 1 }).lean();
  const items = JSON.parse(JSON.stringify(posts));

  return (
    <div className="container-page py-8 md:py-10">
      <HistoryTimeline items={items} />
    </div>
  );
}
