import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { isPostCategory } from "@/lib/postCategories";
import Post from "@/models/Post";
import { slugify } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminSession(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDatabase();
    const post = await Post.findById(params.id).lean();
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    console.error("GET /api/admin/posts/[id] error", error);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminSession(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, slug, category, content, author, coverImageDriveId, driveAlbumFolderId, published } = body;

    if (!title || !category || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isPostCategory(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    await connectToDatabase();
    const post = await Post.findById(params.id);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let finalSlug = slugify(slug || title);
    if (!finalSlug) finalSlug = post.slug;
    if (finalSlug !== post.slug) {
      const existing = await Post.findOne({ slug: finalSlug, _id: { $ne: post._id } });
      if (existing) {
        finalSlug = `${finalSlug}-${Date.now().toString(36)}`;
      }
    }

    post.title = title;
    post.slug = finalSlug;
    post.category = category;
    post.content = content;
    post.author = author;
    post.coverImageDriveId = coverImageDriveId;
    post.driveAlbumFolderId = driveAlbumFolderId;
    if (typeof published === "boolean") post.published = published;

    await post.save();
    return NextResponse.json({ post });
  } catch (error) {
    console.error("PUT /api/admin/posts/[id] error", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminSession(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDatabase();
    const deleted = await Post.findByIdAndDelete(params.id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/posts/[id] error", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
