import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import PostForm from "@/components/admin/PostForm";

interface Props { params: { id: string } }

export default async function EditPostPage({ params }: Props) {
  await connectToDatabase();
  const post = await Post.findById(params.id).lean();
  if (!post) notFound();

  const initial = {
    _id: post._id.toString(),
    title: post.title,
    slug: post.slug,
    category: post.category,
    content: post.content,
    author: post.author || "",
    coverImageDriveId: post.coverImageDriveId || "",
    driveAlbumFolderId: post.driveAlbumFolderId || "",
    published: post.published,
  };

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <h1 className="text-3xl">Edit Post</h1>
        <p className="mt-1 text-slate-600">Update content, metadata, and publishing status.</p>
      </div>
      <div className="card p-6">
        <PostForm initial={initial as any} />
      </div>
    </div>
  );
}
