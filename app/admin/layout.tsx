import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/nook/navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.admin };
}

// Admin gate (L-4a2.2), layer 2 of defence-in-depth. notFound() not redirect(),
// non-admins do not learn that /admin exists. Middleware (layer 1) already keeps
// non-admins out; this is the airbag if middleware is ever bypassed.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();

  return (
    <>
      <Navbar active="admin" />
      <div className="container account-shell">
        <AdminSidebar displayName={user.displayName} email={user.email} />
        <main className="account-content">{children}</main>
      </div>
    </>
  );
}
