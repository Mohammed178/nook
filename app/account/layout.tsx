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

  return (
    <>
      <Navbar />
      <div className="container account-shell">
        <AccountSidebar
          displayName={user?.displayName ?? "Account"}
          email={user?.email ?? ""}
        />
        <main className="account-content">{children}</main>
      </div>
    </>
  );
}
