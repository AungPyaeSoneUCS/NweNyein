import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions, isAdminSession } from "@/lib/auth";
import { uploadDriveFile, type DriveFileType } from "@/lib/googleDrive";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminSession(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const folderType = form.get("folderType") as DriveFileType | null;
    const subfolderName = (form.get("subfolderName") as string | null)?.trim() || undefined;
    const customFileName = (form.get("fileName") as string | null)?.trim() || undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!folderType || !["photos", "songs", "books"].includes(folderType)) {
      return NextResponse.json({ error: "Invalid folderType" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = customFileName || file.name;

    const uploaded = await uploadDriveFile({
      folderType,
      fileName,
      mimeType: file.type || "application/octet-stream",
      buffer,
      subfolderName,
    });

    revalidateTag("drive-media");

    return NextResponse.json({ file: uploaded, subfolderId: (uploaded as any).parentFolderId }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/drive/upload error", error);
    const raw: string = error?.message || "Upload failed";
    if (/storage quota/i.test(raw)) {
      return NextResponse.json(
        {
          error:
            "Google rejected the upload because service accounts have no Drive storage quota. " +
            "Fix: configure OAuth 2.0 (npm run google:auth) or move the folders into a Shared Drive. " +
            "Open Admin → Dashboard → Test Drive Connection for diagnostics.",
          code: "SERVICE_ACCOUNT_NO_QUOTA",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: raw }, { status: 500 });
  }
}
