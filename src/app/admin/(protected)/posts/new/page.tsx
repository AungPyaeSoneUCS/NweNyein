import PostForm from "@/components/admin/PostForm";

export default function NewPostPage() {
  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <h1 className="text-3xl">Create New Post</h1>
        <p className="mt-1 text-slate-600">Publish a Knowledge, History, or Activity post.</p>
      </div>
      <div className="card p-6">
        <PostForm />
      </div>
    </div>
  );
}
