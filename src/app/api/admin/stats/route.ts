import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import { getDriveFiles, getDriveConfigStatus } from "@/lib/googleDrive";

function sumBytes(files: { size?: string }[]) {
  return files.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminSession(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [postAgg, latestByCategory, posts] = await Promise.all([
      Post.aggregate([
        {
          $group: {
            _id: { category: "$category", published: "$published" },
            count: { $sum: 1 },
            lastDate: { $max: "$updatedAt" },
          },
        },
      ]),
      Post.aggregate([
        { $sort: { updatedAt: -1 } },
        { $group: { _id: "$category", latest: { $first: "$updatedAt" }, count: { $sum: 1 } } },
      ]),
      Post.find({}).sort({ updatedAt: -1 }).limit(10).lean(),
    ]);

    const byCat = {
      knowledge: { total: 0, published: 0, draft: 0, latest: null as string | null },
      history: { total: 0, published: 0, draft: 0, latest: null as string | null },
      activity: { total: 0, published: 0, draft: 0, latest: null as string | null },
    };

    for (const row of postAgg as any[]) {
      const cat = row._id.category as keyof typeof byCat;
      if (!byCat[cat]) continue;
      byCat[cat].total += row.count;
      if (row._id.published) byCat[cat].published += row.count;
      else byCat[cat].draft += row.count;
    }
    for (const row of latestByCategory as any[]) {
      const cat = row._id as keyof typeof byCat;
      if (byCat[cat] && row.latest) byCat[cat].latest = new Date(row.latest).toISOString();
    }

    let photos: any[] = [], songs: any[] = [], books: any[] = [];
    let driveError: string | null = null;
    try {
      [photos, songs, books] = await Promise.all([
        getDriveFiles("photos"),
        getDriveFiles("songs"),
        getDriveFiles("books"),
      ]);
    } catch (e: any) {
      driveError = e?.message || "Failed to fetch Drive files";
    }

    const booksPdf = books.filter((f) => /\.pdf$/i.test(f.name) || f.mimeType === "application/pdf").length;
    const booksDocx = books.filter((f) => /\.(doc|docx)$/i.test(f.name) || /word/.test(f.mimeType || "")).length;

    const drive = {
      configured: getDriveConfigStatus(),
      error: driveError,
      photos: { count: photos.length, bytes: sumBytes(photos) },
      songs: { count: songs.length, bytes: sumBytes(songs) },
      books: { count: books.length, bytes: sumBytes(books), pdf: booksPdf, docx: booksDocx },
    };

    const recentPosts = (posts as any[]).map((p) => ({
      id: p._id.toString(),
      kind: "post",
      title: p.title,
      type: p.category,
      status: p.published ? "Published" : "Draft",
      date: (p.updatedAt || p.createdAt).toISOString(),
    }));

    return NextResponse.json({ mongo: byCat, drive, recentPosts });
  } catch (error) {
    console.error("GET /api/admin/stats error", error);
    return NextResponse.json({ error: "Failed to compute stats" }, { status: 500 });
  }
}
