import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions, isAdminSession } from "@/lib/auth";
import { deleteDriveFile } from "@/lib/googleDrive";

export async function DELETE(_req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminSession(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = params;
    if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

    await deleteDriveFile(fileId);
    revalidateTag("drive-media");
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/drive/[fileId] error", error);
    return NextResponse.json({ error: error?.message || "Delete failed" }, { status: 500 });
  }
}
