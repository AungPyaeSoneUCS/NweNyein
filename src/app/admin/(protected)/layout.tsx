import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, isAdminSession } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: middleware also guards /admin/*, but never render the
  // admin shell without a verified admin session.
  const session = await getServerSession(authOptions);
  if (!(await isAdminSession(session))) {
    redirect("/admin/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
