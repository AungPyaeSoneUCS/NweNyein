import { NextRequest, NextResponse } from "next/server";
import { getDriveFiles, type DriveFileType } from "@/lib/googleDrive";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as DriveFileType | null;

    if (!type || !["photos", "songs", "books"].includes(type)) {
      return NextResponse.json({ error: "Invalid or missing type parameter" }, { status: 400 });
    }

    const files = await getDriveFiles(type);
    return NextResponse.json({ files });
  } catch (error) {
    console.error("GET /api/drive/files error", error);
    return NextResponse.json({ error: "Failed to fetch drive files" }, { status: 500 });
  }
}
