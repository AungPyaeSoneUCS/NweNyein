import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { isPostCategory, POST_CATEGORIES } from "@/lib/postCategories";
import Post from "@/models/Post";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminSession(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDatabase();
    const posts = await Post.find({ category: { $in: [...POST_CATEGORIES] } })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("GET /api/admin/posts error", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    let finalSlug = slugify(slug || title);
    if (!finalSlug) finalSlug = `post-${Date.now()}`;

    // Ensure unique slug
    const existing = await Post.findOne({ slug: finalSlug });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString(36)}`;
    }

    const post = await Post.create({
      title,
      slug: finalSlug,
      category,
      content,
      author,
      coverImageDriveId,
      driveAlbumFolderId,
      published: published !== false,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/posts error", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
