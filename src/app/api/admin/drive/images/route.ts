import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminSession } from "@/lib/auth";
import { listDriveImages, type DriveImageScope } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin photo picker source.
 * GET /api/admin/drive/images?scope=photos|all&q=text
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdminSession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scope: DriveImageScope = searchParams.get("scope") === "all" ? "all" : "photos";
  const query = (searchParams.get("q") || "").trim().toLowerCase();

  try {
    let images = await listDriveImages({ scope });
    if (query) {
      images = images.filter(
        (image) =>
          image.name.toLowerCase().includes(query) ||
          (image.folderName || "").toLowerCase().includes(query)
      );
    }
    return NextResponse.json({ images, scope });
  } catch (error: any) {
    console.error("GET /api/admin/drive/images error", error);
    const detail = error?.response?.data?.error_description || error?.message || "Unknown error";
    return NextResponse.json(
      {
        error: `Could not read photos from Google Drive (${detail}). Check the Drive connection in Admin → Dashboard.`,
      },
      { status: 502 }
    );
  }
}
