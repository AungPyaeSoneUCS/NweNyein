import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions, isAdminSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminSession(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    revalidateTag("drive-media");
    return NextResponse.json({ ok: true, revalidated: "drive-media" });
  } catch (error) {
    console.error("POST /api/admin/revalidate-drive error", error);
    return NextResponse.json({ error: "Failed to revalidate" }, { status: 500 });
  }
}
