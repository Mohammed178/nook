import { redirect } from "next/navigation";
import { Navbar } from "@/components/nook/navbar";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Account · Nook",
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
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
        />
        <main className="account-content">{children}</main>
      </div>
    </>
  );
}
