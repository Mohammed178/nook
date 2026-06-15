import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/nook/navbar";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.account };
}

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  // Layer-2 airbag (defense-in-depth): middleware already gates /account, but
  // gate here too so a layout never renders for a logged-out user. Parity with
  // the agents/dashboard and admin layouts.
  if (!user) redirect("/login");

  return (
    <>
      <Navbar />
      <div className="container account-shell">
        <AccountSidebar
          displayName={user?.displayName ?? "Account"}
          email={user?.email ?? ""}
          agentStatus={user?.agentStatus}
          agencyName={user?.agencyName}
          dict={dict}
        />
        <main className="account-content">{children}</main>
      </div>
    </>
  );
}
