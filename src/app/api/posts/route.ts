import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 100) : 100;

    const query: Record<string, unknown> = { published: true };
    if (category && ["knowledge", "history", "activity"].includes(category)) {
      query.category = category;
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("GET /api/posts error", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
