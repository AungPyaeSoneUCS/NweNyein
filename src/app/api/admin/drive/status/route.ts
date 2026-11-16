import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdminSession } from "@/lib/auth";
import { getDriveConfigStatus, verifyDriveAccess } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin diagnostics endpoint for Google Drive.
 * GET /api/admin/drive/status
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(await isAdminSession(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getDriveConfigStatus();
  const live = await verifyDriveAccess();

  return NextResponse.json({
    config,
    live,
    hint:
      live.authMode === "service_account" && !live.ok
        ? "Service accounts have no My Drive storage quota. Configure OAuth (GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN) or move folders into a Shared Drive."
        : undefined,
  });
}
