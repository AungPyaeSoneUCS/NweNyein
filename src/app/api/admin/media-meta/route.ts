import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions, isAdminSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import MediaMeta, { type MediaKind } from "@/models/MediaMeta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: MediaKind[] = ["songs", "books"];

function parseKind(value: unknown): MediaKind | null {
  return KINDS.includes(value as MediaKind) ? (value as MediaKind) : null;
}

/**
 * GET /api/admin/media-meta?kind=songs|books
 * Returns saved thumbnails for Drive files (fileId -> coverImageDriveId).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdminSession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kind = parseKind(new URL(req.url).searchParams.get("kind"));
  if (!kind) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });

  try {
    await connectToDatabase();
    const items = await MediaMeta.find({ kind }).select("fileId coverImageDriveId").lean();
    return NextResponse.json({
      items: items
        .filter((item) => item.fileId && item.coverImageDriveId)
        .map((item) => ({ fileId: item.fileId, coverImageDriveId: item.coverImageDriveId })),
    });
  } catch (error) {
    console.error("GET /api/admin/media-meta error", error);
    return NextResponse.json({ error: "Failed to load thumbnails" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/media-meta
 * Body: { kind, fileId, coverImageDriveId } — an empty cover removes it.
 */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdminSession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const kind = parseKind(body?.kind);
    const fileId = typeof body?.fileId === "string" ? body.fileId.trim() : "";
    const coverImageDriveId =
      typeof body?.coverImageDriveId === "string" ? body.coverImageDriveId.trim() : "";

    if (!kind || !fileId) {
      return NextResponse.json({ error: "kind and fileId are required" }, { status: 400 });
    }

    await connectToDatabase();

    if (!coverImageDriveId) {
      await MediaMeta.deleteOne({ kind, fileId });
    } else {
      await MediaMeta.updateOne(
        { kind, fileId },
        { $set: { coverImageDriveId }, $setOnInsert: { kind, fileId } },
        { upsert: true }
      );
    }

    revalidateTag(`drive-${kind}`);
    return NextResponse.json({ ok: true, kind, fileId, coverImageDriveId });
  } catch (error) {
    console.error("PUT /api/admin/media-meta error", error);
    return NextResponse.json({ error: "Failed to save thumbnail" }, { status: 500 });
  }
}
